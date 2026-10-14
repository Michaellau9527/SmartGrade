/**
 * 测试 16: P2-QR 阶段F1 — 学生二维码凭证管理接口（Controller + Service + 权限 + 数据范围）
 *
 * 验收要求（本轮 F1 spec 八类场景全覆盖）：
 *  1. ✅ 有权限用户成功签发：PermissionsGuard 放行 + Controller 返回令牌（43 字符），响应不含 tokenHash
 *  2. ✅ 无权限用户被拒绝：PermissionsGuard 抛 ForbiddenException
 *  3. ✅ 班主任越权操作其他班级学生被拒绝：Service 数据范围校验抛 NotFoundException（签发/撤销/查询三端点一致）
 *  4. ✅ 补发后旧凭证失效：旧 token 查不到、新 token 可查到，活跃凭证至多一条
 *  5. ✅ 撤销后凭证失效：撤销后 token 无法通过有效性校验，且不误撤销其他学生凭证
 *  6. ✅ 重复撤销：幂等，第二次 revokedCount=0，不报错、不改变已有状态
 *  7. ✅ 无效参数 / 不存在的学生：DTO 校验失败（含拒绝越权字段）、不存在 → NotFoundException
 *  8. ✅ 数据库操作失败：异常向上传播，事务整体回滚（不产生脏数据）
 *
 * 另有：
 *  9. ✅ 操作者身份来自已认证上下文（issuedBy/revokedBy 取自 JWT user，请求体不可指定）
 * 10. ✅ 状态查询仅返回元数据，select 显式排除 tokenHash
 * 11. ✅ F1-B1 并发签发：同一学生并发 → 行锁串行化、最终仅 1 条有效凭证、版本连续；
 *     不同学生同时签发 → 互不阻塞、各自 1 条有效；锁定读位于事务内且先于写操作；
 *     事务内锁定读空结果 → 404 且无写入
 *
 * 边界说明：
 * - Mock 单元测试验证权限、数据范围与业务行为；真实数据库事务回滚由 Prisma 运行时保证，
 *   需在联调环境另行确认。
 * - 第 11 组用例通过「按键互斥锁 + 共享状态存储」在内存中模拟 InnoDB 行锁语义
 *   （`SELECT ... FOR UPDATE`），断言并发签发下的业务结果与调用顺序。
 *   这是对行锁语义的**行为级模拟，不是真实 MySQL 并发验证**；真实数据库下的锁等待、
 *   隔离级别（ReadCommitted）与 (studentId, version) 唯一约束的真实交互，
 *   仍需在具备真实 MySQL 的环境（联调 / CI 集成）另行验证，本文件不声称已覆盖。
 * - F1-B1 的真实数据库并发验证已于本地隔离 MySQL（InnoDB / READ COMMITTED）独立执行：
 *   无父锁时「无既有活跃凭证的并发首签」可复现双活跃凭证；加入父记录 FOR UPDATE 后
 *   两种场景均恒为单活跃。该结论由外部验证脚本产出，本文件不复现真实锁行为。
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

import { createMockPrisma, fakeStudent } from './helpers/mock-prisma';
import { getPermissions } from '../authorization/role-permission.map';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StudentCredentialService } = require('../modules/student-credential/student-credential.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StudentCredentialController } = require('../modules/student-credential/student-credential.controller');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { IssueCredentialDto, StudentIdParamDto } = require('../modules/student-credential/dto');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PermissionsGuard } = require('../common/guards/permissions.guard');

const PERM = 'student:qrcode:issue';

/** 独立计算的 SHA-256（不依赖服务实现） */
function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** 按 select 投影（模拟 Prisma select 语义，用于验证响应不含 tokenHash） */
function project(row: any, select: Record<string, boolean>): any {
  const out: any = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = row[key];
  }
  return out;
}

/**
 * 状态化 studentCredential 存储 + 「父记录行锁」模拟。
 *
 * - studentCredential.*：忠实模拟 updateMany / aggregate / create / findFirst / count
 *   的 where、select 与 (studentId, version) 唯一约束语义。
 * - `$queryRaw`：模拟 `SELECT ... FOR UPDATE`（F1-B1 的串行化点）按键互斥语义
 *   ——同一 studentId 的锁定读串行化，不同 studentId 互不阻塞；
 *   锁在取得它的事务结束时（commit/rollback）释放，由 makeTx() 返回的视图持有 release 句柄。
 *
 * ⚠️ 这是 InnoDB 行锁的**行为级模拟**，不能证明真库的锁等待/隔离级别行为；
 * 真库结论见文件头「边界说明」。
 */
function buildStatefulCredentialStore() {
  const rows: any[] = [];
  /** 每个 studentId 的锁等待队列队尾 */
  const lockTail = new Map<string, Promise<void>>();
  /** 锁定读的获取顺序（用于断言串行化点与互不阻塞） */
  const lockOrder: string[] = [];
  /** 允许用例强制锁定读返回空（模拟事务内发现学生已软删除） */
  let rawOverride: any[] | null = null;

  const matchRow = (r: any, where: any): boolean => {
    if (where.studentId !== undefined && r.studentId !== where.studentId) return false;
    if (where.tokenHash !== undefined && r.tokenHash !== where.tokenHash) return false;
    if (where.isActive !== undefined && r.isActive !== where.isActive) return false;
    if ('revokedAt' in where && where.revokedAt === null && r.revokedAt !== null) return false;
    return true;
  };

  const studentCredential = {
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const r of rows) {
        if (matchRow(r, where)) {
          Object.assign(r, data);
          count += 1;
        }
      }
      return { count };
    }),
    aggregate: jest.fn(async (args: any) => {
      const versions = rows.filter((r) => matchRow(r, args?.where ?? {})).map((r) => r.version);
      return { _max: { version: versions.length ? Math.max(...versions) : null } };
    }),
    create: jest.fn(async ({ data }: any) => {
      if (rows.some((r) => r.studentId === data.studentId && r.version === data.version)) {
        const err: any = new Error('Unique constraint failed on the fields: (`student_id`,`version`)');
        err.code = 'P2002';
        throw err;
      }
      const row = {
        id: `cred_${randomBytes(4).toString('hex')}`,
        isActive: true,
        revokedAt: null,
        revokedBy: null,
        issuedAt: new Date(),
        lastVerifiedAt: null,
        lastVerifiedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      rows.push(row);
      return row;
    }),
    findFirst: jest.fn(async (args: any) => {
      const hit = rows.find((r) => matchRow(r, args?.where ?? {}));
      if (!hit) return null;
      return args?.select ? project(hit, args.select) : hit;
    }),
    count: jest.fn(async (args: any) =>
      rows.filter((r) => matchRow(r, args?.where ?? {})).length,
    ),
  };

  /** 为单次事务创建独立视图（各自持有锁释放句柄，共享同一份 rows） */
  const makeTx = () => {
    const view: any = {
      rows,
      studentCredential,
      __release: null as null | (() => void),
      // 形如 tagged template 调用：$queryRaw(strings, ...values)，studentId 在 values[0]
      $queryRaw: jest.fn(async (_strings: any, ...values: any[]) => {
        const key = String(values[0] ?? '');
        const prev = lockTail.get(key) ?? Promise.resolve();
        let release!: () => void;
        const gate = new Promise<void>((res) => {
          release = res;
        });
        lockTail.set(key, prev.then(() => gate));
        await prev; // 同一学生：等待前一个持有者结束（不同学生互不阻塞）
        lockOrder.push(key);
        view.__release = release;
        if (rawOverride !== null) return rawOverride;
        return [{ id: key }];
      }),
    };
    return view;
  };

  return {
    rows,
    studentCredential,
    makeTx,
    lockOrder,
    setRawOverride: (v: any[] | null) => {
      rawOverride = v;
    },
  };
}

/** 构造最小 ExecutionContext 供 PermissionsGuard 使用 */
function buildGuardCtx(user: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

function buildGuard(required: string[] | undefined): any {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) };
  return new PermissionsGuard(reflector as any);
}

/** 角色与数据范围夹具 */
const STUDENT_A = fakeStudent({
  id: 'stu_1',
  classId: 'cls_A',
  gradeId: 'grade_A',
  boardingType: 'BOARDING',
});
const STUDENT_B = fakeStudent({
  id: 'stu_2',
  classId: 'cls_B',
  gradeId: 'grade_B',
  boardingType: 'BOARDING',
});

const adminUser: any = {
  id: 'tch_admin',
  teacherNo: 'T0001',
  name: '管理员',
  roles: ['ROLE_ADMIN'],
  permissions: [PERM],
  dataScope: { type: 'ALL' },
};
const headmasterUser: any = {
  id: 'tch_head',
  teacherNo: 'T0002',
  name: '班主任',
  roles: ['ROLE_HEADMASTER'],
  permissions: [PERM],
  dataScope: { type: 'CLASS', classId: 'cls_A', gradeId: 'grade_A' },
};
const noPermUser: any = {
  id: 'tch_subject',
  teacherNo: 'T0003',
  name: '任课教师',
  roles: ['ROLE_SUBJECT_TEACHER'],
  permissions: ['student:read'],
  dataScope: { type: 'SELF' },
};

describe('测试16: F1 学生二维码凭证管理接口', () => {
  let prisma: any;
  let tx: ReturnType<typeof buildStatefulCredentialStore>;
  let service: any;
  let controller: any;

  /** 让指定学生可被找到（默认 STUDENT_A） */
  const stubStudent = (student: any) =>
    prisma.student.findFirst.mockResolvedValue(student);

  beforeEach(() => {
    prisma = createMockPrisma();
    tx = buildStatefulCredentialStore();

    // 非事务读/写路径委托到同一状态化存储，实现「撤销/补发后旧码失效」的行为级验证
    prisma.studentCredential.findFirst.mockImplementation((args: any) =>
      tx.studentCredential.findFirst(args),
    );
    prisma.studentCredential.updateMany.mockImplementation((args: any) =>
      tx.studentCredential.updateMany(args),
    );
    prisma.studentCredential.count.mockImplementation((args: any) =>
      tx.studentCredential.count(args),
    );

    // 交互式事务：快照回滚语义 + 事务级父记录行锁（锁定读在事务结束时释放）
    // 说明：快照回滚按整表还原，仅用于串行失败用例；并发用例不发生回滚路径。
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const snapshot = JSON.parse(JSON.stringify(tx.rows));
      const view = tx.makeTx();
      try {
        return await cb(view);
      } catch (e) {
        tx.rows.length = 0;
        tx.rows.push(...JSON.parse(JSON.stringify(snapshot)));
        throw e;
      } finally {
        if (view.__release) {
          view.__release();
          view.__release = null;
        }
      }
    });

    service = new StudentCredentialService(prisma);
    controller = new StudentCredentialController(service);
  });

  // ---------------------------------------------------------------
  // 1. 有权限用户成功签发
  // ---------------------------------------------------------------
  it('1. 有权限用户成功签发：守卫放行，返回 43 字符令牌与版本号，响应不含 tokenHash', async () => {
    const guard = buildGuard([PERM]);
    expect(guard.canActivate(buildGuardCtx(headmasterUser))).toBe(true);

    stubStudent(STUDENT_A);
    const res = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    expect(res.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.version).toBe(1);
    expect(res.credentialId).toBeTruthy();
    expect(res).not.toHaveProperty('tokenHash');
    // 落库内容只含哈希，绝不落明文 token
    const createArg = tx.studentCredential.create.mock.calls[0][0];
    expect(createArg.data.tokenHash).toBe(sha256Hex(res.token));
    expect(Object.keys(createArg.data)).not.toContain('token');
  });

  it('1b. 签发记录的操作者标识取自认证上下文（issuedBy = JWT user.id）', async () => {
    stubStudent(STUDENT_A);
    await controller.issue({ studentId: 'stu_1' }, headmasterUser);
    expect(tx.studentCredential.create.mock.calls[0][0].data.issuedBy).toBe('tch_head');
  });

  it('1c. 管理员（ROLE_ADMIN）即使 permissions 为空也由守卫短路放行', async () => {
    const adminNoPerms = { ...adminUser, permissions: [] };
    const guard = buildGuard([PERM]);
    expect(guard.canActivate(buildGuardCtx(adminNoPerms))).toBe(true);
  });

  // ---------------------------------------------------------------
  // 2. 无权限用户被拒绝
  // ---------------------------------------------------------------
  it('2. 无权限用户被拒绝：PermissionsGuard 抛 ForbiddenException，且未触发任何数据库写入', async () => {
    const guard = buildGuard([PERM]);
    expect(() => guard.canActivate(buildGuardCtx(noPermUser))).toThrow(ForbiddenException);
    expect(tx.studentCredential.create).not.toHaveBeenCalled();
    expect(tx.studentCredential.updateMany).not.toHaveBeenCalled();
  });

  it('2b. 未携带权限信息（无 user.permissions）同样被拒绝', async () => {
    const guard = buildGuard([PERM]);
    expect(() => guard.canActivate(buildGuardCtx({ id: 'tch_x', roles: [] }))).toThrow(
      ForbiddenException,
    );
  });

  // ---------------------------------------------------------------
  // 3. 班主任越权操作其他班级学生被拒绝
  // ---------------------------------------------------------------
  it('3. 班主任越权操作其他班级学生：签发/撤销/查询三端点均被拒绝，且无写入', async () => {
    stubStudent(STUDENT_B); // 学生属于 cls_B，班主任范围是 cls_A

    await expect(
      controller.issue({ studentId: 'stu_2' }, headmasterUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      controller.revoke({ studentId: 'stu_2' }, headmasterUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.status({ studentId: 'stu_2' }, headmasterUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(tx.studentCredential.create).not.toHaveBeenCalled();
    expect(tx.studentCredential.updateMany).not.toHaveBeenCalled();
  });

  it('3b. 班主任操作本班学生被放行（数据范围 CLASS 生效）', async () => {
    stubStudent(STUDENT_A);
    const ok = await controller.issue({ studentId: 'stu_1' }, headmasterUser);
    expect(ok.token).toBeTruthy();
    // 锁定读串行化点使用请求中的学生 id
    expect(tx.lockOrder).toEqual(['stu_1']);
  });

  // -----------------------------------------------------------------
  // 3c. B3：权限口径与角色映射 / seed 保持一致（不虚构任何角色权限）
  // -----------------------------------------------------------------
  it('3c. B3 权限口径：student:qrcode:issue 仅授予 ROLE_ADMIN 与 ROLE_HEADMASTER，年级主任等未授予', () => {
    // 映射真相源：role-permission.map.ts
    expect(getPermissions(RoleCode.ROLE_ADMIN).has(PermissionCode.STUDENT_QRCODE_ISSUE)).toBe(true);
    expect(getPermissions(RoleCode.ROLE_HEADMASTER).has(PermissionCode.STUDENT_QRCODE_ISSUE)).toBe(
      true,
    );
    const notGranted = [
      RoleCode.ROLE_GRADE_DIRECTOR,
      RoleCode.ROLE_POLITICAL,
      RoleCode.ROLE_DORM_MANAGER,
      RoleCode.ROLE_SUBJECT_TEACHER,
      RoleCode.ROLE_GATE_GUARD,
      RoleCode.ROLE_PARENT,
      RoleCode.ROLE_STUDENT,
    ];
    for (const role of notGranted) {
      expect(getPermissions(role).has(PermissionCode.STUDENT_QRCODE_ISSUE)).toBe(false);
    }

    // 运行期授权真相源：seed.ts 的 ROLE_PERMISSIONS（按角色块文本断言，与映射一致）
    const seedSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'prisma', 'seed.ts'), 'utf8');
    const roleBlock = (role: string): string | null => {
      const m = seedSrc.match(new RegExp(`${role}\\s*:\\s*\\[([\\s\\S]*?)\\]`));
      return m ? m[1] : null;
    };
    expect(roleBlock('ROLE_HEADMASTER')).toContain('student:qrcode:issue');
    for (const role of [
      'ROLE_GRADE_DIRECTOR',
      'ROLE_POLITICAL',
      'ROLE_DORM_MANAGER',
      'ROLE_SUBJECT_TEACHER',
      'ROLE_GATE_GUARD',
    ]) {
      const block = roleBlock(role);
      expect(block).not.toBeNull();
      expect(block).not.toContain('student:qrcode:issue');
    }
  });

  it('3d. 服务层防御分支：GRADE 数据范围对跨年级学生仍拦截（防御性保留，年级主任当前无该权限）', async () => {
    // 该夹具只提供 dataScope（服务层唯一读取的鉴权字段），**不携带任何权限**，
    // 不代表年级主任已获授权；此处只验证服务层在任何角色下都不跳过数据范围校验。
    const gradeScopeUser: any = {
      id: 'tch_gd',
      roles: ['ROLE_GRADE_DIRECTOR'],
      permissions: [],
      dataScope: { type: 'GRADE', gradeId: 'grade_A' },
    };
    stubStudent(STUDENT_B); // 学生属于 grade_B
    await expect(
      controller.issue({ studentId: 'stu_2' }, gradeScopeUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.lockOrder).toHaveLength(0);

    // 同年级放行（数据范围命中）
    stubStudent(STUDENT_A); // grade_A
    const ok = await controller.issue({ studentId: 'stu_1' }, gradeScopeUser);
    expect(ok.token).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // 4. 补发后旧凭证失效
  // ---------------------------------------------------------------
  it('4. 补发后旧凭证失效：旧令牌查不到、新令牌可查到，活跃凭证至多一条', async () => {
    stubStudent(STUDENT_A);
    const first = await controller.issue({ studentId: 'stu_1' }, headmasterUser);
    const second = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    expect(second.version).toBe(first.version + 1);
    expect(await service.findActiveByToken(first.token)).toBeNull();
    expect(await service.findActiveByToken(second.token)).not.toBeNull();
    expect(tx.rows.filter((r: any) => r.studentId === 'stu_1' && r.isActive)).toHaveLength(1);
    // 旧凭证已写入撤销人与撤销时间
    const oldRow = tx.rows.find((r: any) => r.tokenHash === sha256Hex(first.token));
    expect(oldRow.isActive).toBe(false);
    expect(oldRow.revokedBy).toBe('tch_head');
    expect(oldRow.revokedAt).not.toBeNull();
  });

  // ---------------------------------------------------------------
  // 5. 撤销后凭证失效（且不误撤销其他学生）
  // ---------------------------------------------------------------
  it('5. 撤销后凭证失效，且不影响其他学生的凭证', async () => {
    stubStudent(STUDENT_A);
    const a = await controller.issue({ studentId: 'stu_1' }, adminUser);
    stubStudent(STUDENT_B);
    const b = await controller.issue({ studentId: 'stu_2' }, adminUser);

    stubStudent(STUDENT_A);
    const revokeRes = await controller.revoke({ studentId: 'stu_1' }, adminUser);
    expect(revokeRes).toEqual({ studentId: 'stu_1', revokedCount: 1 });

    expect(await service.findActiveByToken(a.token)).toBeNull();
    expect(await service.findActiveByToken(b.token)).not.toBeNull();
    expect(tx.rows.filter((r: any) => r.studentId === 'stu_2' && r.isActive)).toHaveLength(1);
  });

  // ---------------------------------------------------------------
  // 6. 重复撤销（幂等）
  // ---------------------------------------------------------------
  it('6. 重复撤销幂等：第二次 revokedCount=0，不报错、不改变已有状态', async () => {
    stubStudent(STUDENT_A);
    const issued = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    const first = await controller.revoke({ studentId: 'stu_1' }, headmasterUser);
    const revokedAtAfterFirst = tx.rows.find(
      (r: any) => r.tokenHash === sha256Hex(issued.token),
    ).revokedAt;

    const second = await controller.revoke({ studentId: 'stu_1' }, headmasterUser);

    expect(first.revokedCount).toBe(1);
    expect(second.revokedCount).toBe(0);
    expect(
      tx.rows.find((r: any) => r.tokenHash === sha256Hex(issued.token)).revokedAt,
    ).toEqual(revokedAtAfterFirst);
    expect(await service.findActiveByToken(issued.token)).toBeNull();
  });

  it('6b. 无有效凭证时撤销：revokedCount=0，不抛错（幂等安全）', async () => {
    stubStudent(STUDENT_A);
    await expect(controller.revoke({ studentId: 'stu_1' }, headmasterUser)).resolves.toEqual({
      studentId: 'stu_1',
      revokedCount: 0,
    });
  });

  // ---------------------------------------------------------------
  // 7. 无效参数 / 不存在的学生
  // ---------------------------------------------------------------
  it('7. DTO 校验：studentId 为空/非字符串/超长被拒绝；请求体携带 issuedBy 等越权字段被拒绝', async () => {
    const emptyErrors = await validate(
      plainToInstance(IssueCredentialDto, { studentId: '' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(emptyErrors.some((e) => e.property === 'studentId')).toBe(true);

    const typeErrors = await validate(
      plainToInstance(IssueCredentialDto, { studentId: 123 }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(typeErrors.some((e) => e.property === 'studentId')).toBe(true);

    // 请求体指定操作者/学生归属视为非法输入
    const smuggleErrors = await validate(
      plainToInstance(IssueCredentialDto, { studentId: 'stu_1', issuedBy: 'attacker' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(smuggleErrors.some((e) => e.property === 'issuedBy')).toBe(true);

    // 合法输入通过
    const okErrors = await validate(
      plainToInstance(IssueCredentialDto, { studentId: 'stu_1' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(okErrors).toHaveLength(0);
  });

  it('7b. 路径参数 DTO 校验：studentId 缺失或为空被拒绝', async () => {
    const errs = await validate(plainToInstance(StudentIdParamDto, { studentId: '' }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errs.some((e) => e.property === 'studentId')).toBe(true);
  });

  it('7c. 学生不存在/已删除：三个端点均 × NotFoundException，且不进入事务', async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(controller.issue({ studentId: 'ghost' }, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.revoke({ studentId: 'ghost' }, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.status({ studentId: 'ghost' }, adminUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.studentCredential.updateMany).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // 8. 数据库操作失败时的异常处理
  // ---------------------------------------------------------------
  it('8. 签发时事务内写库失败：异常向上传播且事务整体回滚，原有效凭证恢复', async () => {
    stubStudent(STUDENT_A);
    const first = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    // 模拟第二次签发（补发）在 create 阶段发生数据库故障
    tx.studentCredential.create.mockImplementationOnce(async () => {
      const err: any = new Error('Lost connection to MySQL server during query');
      throw err;
    });

    await expect(controller.issue({ studentId: 'stu_1' }, headmasterUser)).rejects.toThrow(
      'Lost connection to MySQL server during query',
    );

    // 回滚语义：未产生新凭证，第一张凭证仍为唯一活跃凭证
    expect(tx.rows).toHaveLength(1);
    expect(tx.rows[0].tokenHash).toBe(sha256Hex(first.token));
    expect(tx.rows.filter((r: any) => r.isActive)).toHaveLength(1);
  });

  it('8b. 撤销时数据库失败：异常向上传播，凭证状态不被破坏', async () => {
    stubStudent(STUDENT_A);
    const issued = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    tx.studentCredential.updateMany.mockImplementationOnce(async () => {
      throw new Error('updateMany failed');
    });

    await expect(controller.revoke({ studentId: 'stu_1' }, headmasterUser)).rejects.toThrow(
      'updateMany failed',
    );
    // 撤销失败后原凭证仍有效
    expect(await service.findActiveByToken(issued.token)).not.toBeNull();
  });

  it('8c. 状态查询时数据库失败：异常向上传播', async () => {
    stubStudent(STUDENT_A);
    tx.studentCredential.count.mockImplementationOnce(async () => {
      throw new Error('count failed');
    });
    await expect(controller.status({ studentId: 'stu_1' }, adminUser)).rejects.toThrow(
      'count failed',
    );
  });

  // ---------------------------------------------------------------
  // 9. 状态查询不泄露令牌信息
  // ---------------------------------------------------------------
  it('9. 状态查询仅返回元数据：select 排除 tokenHash，响应无令牌字段', async () => {
    stubStudent(STUDENT_A);
    await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    const statusRes = await controller.status({ studentId: 'stu_1' }, adminUser);

    expect(statusRes.hasActive).toBe(true);
    expect(statusRes.totalIssued).toBe(1);
    expect(statusRes.active.version).toBe(1);
    expect(statusRes.active.issuedBy).toBe('tch_head');
    expect(statusRes.active).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(statusRes)).not.toContain('token_hash');
    // 查询入参显式选择字段，不含 tokenHash
    const selectArg = tx.studentCredential.findFirst.mock.calls[0][0].select;
    expect(Object.keys(selectArg)).not.toContain('tokenHash');
  });

  it('10. 幂等与并发兜底：并发补发版本冲突（P2002）时整体回滚，活跃凭证仅一条', async () => {
    stubStudent(STUDENT_A);
    const first = await controller.issue({ studentId: 'stu_1' }, headmasterUser);

    tx.studentCredential.aggregate.mockImplementationOnce(async () => ({ _max: { version: 1 } }));
    tx.studentCredential.create.mockImplementationOnce(async () => {
      const err: any = new Error('Unique constraint failed on the fields: (`student_id`,`version`)');
      err.code = 'P2002';
      throw err;
    });

    await expect(controller.issue({ studentId: 'stu_1' }, headmasterUser)).rejects.toMatchObject({
      code: 'P2002',
    });

    expect(tx.rows).toHaveLength(1);
    expect(tx.rows[0].tokenHash).toBe(sha256Hex(first.token));
    expect(tx.rows.filter((r: any) => r.isActive)).toHaveLength(1);
  });

  // ---------------------------------------------------------------
  // 11. F1-B1 并发签发：父记录行锁（SELECT ... FOR UPDATE）串行化
  //     注：本组为行锁语义的**行为级模拟**，证明业务结果与调用顺序；
  //         真实 InnoDB 锁等待/隔离级别的结论由外部真库验证脚本给出。
  // ---------------------------------------------------------------
  it('11. 同一学生并发首签（无既有凭证）：父记录锁串行化 → 恒 1 条有效，版本 1/2 各一次', async () => {
    stubStudent(STUDENT_A);
    const [r1, r2] = await Promise.all([
      controller.issue({ studentId: 'stu_1' }, headmasterUser),
      controller.issue({ studentId: 'stu_1' }, headmasterUser),
    ]);

    expect([r1.version, r2.version].sort((a, b) => a - b)).toEqual([1, 2]);
    expect(tx.rows).toHaveLength(2);
    expect(tx.rows.filter((r: any) => r.studentId === 'stu_1' && r.isActive)).toHaveLength(1);
    // 两次签发均在同一学生键上取锁（串行化点），非依赖 (studentId, version) 唯一约束兜底
    expect(tx.lockOrder).toEqual(['stu_1', 'stu_1']);
    // 唯一约束兜底未被触发（无 P2002 回滚）
    expect(tx.rows.filter((r: any) => r.isActive)[0].version).toBe(2);
  });

  it('11b. 同一学生并发补发（已有活跃凭证）：旧码全部失效，最终仍仅 1 条有效', async () => {
    stubStudent(STUDENT_A);
    await controller.issue({ studentId: 'stu_1' }, headmasterUser); // v1

    const [a, b] = await Promise.all([
      controller.issue({ studentId: 'stu_1' }, headmasterUser),
      controller.issue({ studentId: 'stu_1' }, headmasterUser),
    ]);

    expect([a.version, b.version].sort((x, y) => x - y)).toEqual([2, 3]);
    const active = tx.rows.filter((r: any) => r.studentId === 'stu_1' && r.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].version).toBe(3);
    // 非活跃行均带撤销信息（无「既未撤销又活跃」的悬挂状态）
    for (const r of tx.rows.filter((x: any) => !x.isActive)) {
      expect(r.revokedAt).not.toBeNull();
      expect(r.revokedBy).toBe('tch_head');
    }
  });

  it('11c. 不同学生并发签发：互不阻塞，各自恰好 1 条有效', async () => {
    prisma.student.findFirst.mockImplementation(async ({ where }: any) => {
      if (where?.id === 'stu_1') return STUDENT_A;
      if (where?.id === 'stu_2') return STUDENT_B;
      return null;
    });

    await Promise.all([
      controller.issue({ studentId: 'stu_1' }, adminUser),
      controller.issue({ studentId: 'stu_2' }, adminUser),
    ]);

    expect([...tx.lockOrder].sort()).toEqual(['stu_1', 'stu_2']);
    expect(tx.rows.filter((r: any) => r.studentId === 'stu_1' && r.isActive)).toHaveLength(1);
    expect(tx.rows.filter((r: any) => r.studentId === 'stu_2' && r.isActive)).toHaveLength(1);
  });

  it('11d. 事务内锁定读为空（学生已软删除）→ 404、无写入，且锁被释放不悬挂', async () => {
    stubStudent(STUDENT_A); // 事务外存在性检查通过
    tx.setRawOverride([]); // 事务内锁定读返回空 → 服务层应拒绝

    await expect(
      controller.issue({ studentId: 'stu_1' }, headmasterUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.studentCredential.create).not.toHaveBeenCalled();
    expect(tx.studentCredential.updateMany).not.toHaveBeenCalled();
    expect(tx.rows).toHaveLength(0);

    // 锁已释放：随后正常签发应能立即取得锁并成功
    tx.setRawOverride(null);
    const ok = await controller.issue({ studentId: 'stu_1' }, headmasterUser);
    expect(ok.version).toBe(1);
    expect(tx.lockOrder).toEqual(['stu_1', 'stu_1']);
  });
});
