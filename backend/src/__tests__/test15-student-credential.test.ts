/**
 * 测试 15: P2-QR 阶段E — 学生身份二维码凭证（StudentCredentialService）
 *
 * 验收要求：
 *  1. ✅ 签发：生成 256-bit 随机令牌（43 字符 base64url）；DB 仅存 SHA-256 哈希（64 位 hex），不存明文
 *  2. ✅ 签发走交互式事务（isolationLevel=ReadCommitted），撤销旧有效凭证先于创建新凭证
 *  3. ✅ 补发：新凭证 version 递增，旧凭证 isActive=false 且 revokedAt/revokedBy 写入，活跃凭证至多一条
 *  4. ✅ 旧凭证失效：补发后旧 token 查不到、新 token 可查到
 *  5. ✅ 并发补发：(studentId, version) 冲突（P2002）时整体回滚、错误外抛，活跃凭证仍只有一条
 *  6. ✅ 学生不存在/已删除 → NotFoundException，且不进入事务
 *  7. ✅ 撤销：revokeCredential 撤销全部活跃凭证并返回撤销数量
 *  8. ✅ findActiveByToken：哈希等值 + isActive + revokedAt 为空三重条件
 *  9. ✅ 迁移 SQL：仅含 token_hash 哈希列（无明文 token 列），含 (student_id,version) 唯一兜底与 CASCADE 外键
 * 10. ✅ schema.prisma：含 StudentCredential 模型、Student 反向关系，无明文 token 字段
 */

import { NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { createMockPrisma } from './helpers/mock-prisma';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StudentCredentialService } = require('../modules/student-credential/student-credential.service');

/** 独立计算的 SHA-256（不依赖服务实现，交叉验证哈希正确性） */
function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * 轻量状态化 studentCredential 事务客户端 mock：
 * 维护行数据，支持 updateMany / aggregate / create / findFirst 真实语义，
 * 用于行为级验证「补发后旧令牌立即失效」。
 */
function buildStatefulCredentialStore() {
  const rows: any[] = [];
  const studentCredential = {
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const r of rows) {
        if (r.studentId === where.studentId && r.isActive === true) {
          r.isActive = false;
          r.revokedAt = data.revokedAt ?? new Date();
          r.revokedBy = data.revokedBy ?? null;
          count += 1;
        }
      }
      return { count };
    }),
    aggregate: jest.fn(async (args: any) => {
      const versions = rows
        .filter((r) => r.studentId === args?.where?.studentId)
        .map((r) => r.version);
      const max = versions.length ? Math.max(...versions) : null;
      return { _max: { version: max } };
    }),
    create: jest.fn(async ({ data }: any) => {
      // (studentId, version) 唯一约束兜底：冲突抛 P2002
      if (rows.some((r) => r.studentId === data.studentId && r.version === data.version)) {
        const err: any = new Error(
          'Unique constraint failed on the fields: (`student_id`,`version`)',
        );
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
    findFirst: jest.fn(async ({ where }: any) => {
      return (
        rows.find(
          (r) =>
            r.tokenHash === where.tokenHash &&
            r.isActive === true &&
            (where.revokedAt === null ? r.revokedAt === null : true),
        ) ?? null
      );
    }),
  };
  return {
    rows,
    studentCredential,
    // F1-B1：签发事务第一步会对学生父记录加 FOR UPDATE 排他行锁（锁定时返回命中行）
    // 形如 tagged template 调用：$queryRaw(strings, ...values)，studentId 在 values[0]
    $queryRaw: jest.fn(async (_strings: any, ..._values: any[]) => [{ id: 'stu_1' }]),
  };
}

describe('P2-QR 阶段E — StudentCredentialService', () => {
  let prisma: any;
  let tx: ReturnType<typeof buildStatefulCredentialStore>;
  let service: any;

  beforeEach(() => {
    prisma = createMockPrisma();
    tx = buildStatefulCredentialStore();
    // 非事务读路径（findActiveByToken）委托到同一状态化存储，行为级验证旧码失效
    prisma.studentCredential.findFirst.mockImplementation((args: any) =>
      tx.studentCredential.findFirst(args),
    );
    // 交互式事务：行级快照回滚语义（create 抛错 → 整个事务已写入的行变更回滚）
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const snapshot = JSON.parse(JSON.stringify(tx.rows));
      try {
        return await cb(tx);
      } catch (e) {
        tx.rows.length = 0;
        tx.rows.push(...snapshot);
        throw e;
      }
    });
    service = new StudentCredentialService(prisma);
  });

  it('1. 签发：token 为 43 字符 base64url（256-bit），DB 仅存 SHA-256 哈希且不存明文', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'stu_1' });
    const { credential, token } = await service.issueCredential('stu_1', 'tch_admin');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(credential.tokenHash).toBe(sha256Hex(token));
    expect(credential.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(credential.tokenHash).not.toBe(token);
    // create 收到的数据不含 token 明文字段，版本从 1 开始
    const createArg = tx.studentCredential.create.mock.calls[0][0];
    expect(createArg.data.version).toBe(1);
    expect(Object.keys(createArg.data)).not.toContain('token');
  });

  it('2. 签发走交互式事务（ReadCommitted），先锁定学生父记录，再撤销旧有效凭证、后创建新凭证', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'stu_1' });
    await service.issueCredential('stu_1', 'tch_admin');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: 'ReadCommitted',
    });

    // F1-B1：事务内第一步是对 student 父记录的 FOR UPDATE 锁定读，
    // 这是同一学生并发签发的串行化点（不依赖 (studentId, version) 唯一约束）
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const lockSql = (tx.$queryRaw.mock.calls[0][0] as any).raw.join(' ');
    expect(lockSql).toContain('student');
    expect(lockSql).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.studentCredential.updateMany.mock.invocationCallOrder[0],
    );

    const updateManyArg = tx.studentCredential.updateMany.mock.calls[0][0];
    expect(updateManyArg.where).toEqual({ studentId: 'stu_1', isActive: true });
    expect(updateManyArg.data.isActive).toBe(false);
    expect(updateManyArg.data.revokedBy).toBe('tch_admin');

    expect(tx.studentCredential.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.studentCredential.create.mock.invocationCallOrder[0],
    );
  });

  it('3. 补发：version 递增，旧凭证撤销、新凭证生效，活跃凭证至多一条', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'stu_1' });
    const first = await service.issueCredential('stu_1', 'tch_admin');
    const second = await service.issueCredential('stu_1', 'tch_admin');

    expect(second.credential.version).toBe(first.credential.version + 1);

    const oldRow = tx.rows.find((r: any) => r.tokenHash === first.credential.tokenHash);
    const newRow = tx.rows.find((r: any) => r.tokenHash === second.credential.tokenHash);
    expect(oldRow.isActive).toBe(false);
    expect(oldRow.revokedAt).not.toBeNull();
    expect(oldRow.revokedBy).toBe('tch_admin');
    expect(newRow.isActive).toBe(true);
    expect(
      tx.rows.filter((r: any) => r.studentId === 'stu_1' && r.isActive),
    ).toHaveLength(1);
  });

  it('4. 补发后旧令牌立即查不到、新令牌可查到', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'stu_1' });
    const first = await service.issueCredential('stu_1', 'tch_admin');
    const second = await service.issueCredential('stu_1', 'tch_admin');

    const oldHit = await service.findActiveByToken(first.token);
    const newHit = await service.findActiveByToken(second.token);
    expect(oldHit).toBeNull();
    expect(newHit).not.toBeNull();
    expect(newHit.studentId).toBe('stu_1');
  });

  it('5. 并发补发：版本冲突（P2002）时整体回滚、错误外抛，活跃凭证仍只有一条', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'stu_1' });
    const first = await service.issueCredential('stu_1', 'tch_a');

    // 模拟真实竞态：T2 读到过期最大版本（max=1），而 T1 已先提交 (stu_1, v2)，
    // T2 的 INSERT 命中 (studentId, version) 唯一约束抛 P2002
    tx.studentCredential.aggregate.mockImplementationOnce(async () => ({ _max: { version: 1 } }));
    tx.studentCredential.create.mockImplementationOnce(async () => {
      const err: any = new Error(
        'Unique constraint failed on the fields: (`student_id`,`version`)',
      );
      err.code = 'P2002';
      throw err;
    });
    await expect(service.issueCredential('stu_1', 'tch_b')).rejects.toMatchObject({
      code: 'P2002',
    });

    // 回滚语义：失败那笔未留下任何行；第一笔凭证恢复为唯一活跃凭证
    expect(tx.rows).toHaveLength(1);
    expect(tx.rows[0].tokenHash).toBe(first.credential.tokenHash);
    expect(tx.rows.filter((r: any) => r.isActive)).toHaveLength(1);
  });

  it('6. 学生不存在或已删除 → NotFoundException，且不进入事务', async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.issueCredential('ghost', 'tch_admin')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('7. 撤销：revokeCredential 撤销全部活跃凭证并返回撤销数量', async () => {
    prisma.studentCredential.updateMany.mockResolvedValue({ count: 2 });
    const { revokedCount } = await service.revokeCredential('stu_1', 'tch_admin');

    expect(revokedCount).toBe(2);
    expect(prisma.studentCredential.updateMany).toHaveBeenCalledWith({
      where: { studentId: 'stu_1', isActive: true },
      data: expect.objectContaining({ isActive: false, revokedBy: 'tch_admin' }),
    });
  });

  it('8. findActiveByToken：哈希等值 + isActive + revokedAt 为空三重条件，并携带学生关联', async () => {
    prisma.studentCredential.findFirst.mockResolvedValue(null);
    await service.findActiveByToken('some-raw-token');

    expect(prisma.studentCredential.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: sha256Hex('some-raw-token'),
        isActive: true,
        revokedAt: null,
      },
      include: { student: true },
    });
  });

  it('9. 迁移 SQL：仅存哈希列、含版本唯一兜底与级联外键，无明文 token 列', () => {
    const sqlPath = path.join(
      __dirname,
      '..',
      '..',
      'prisma',
      'migrations',
      '20261014000000_add_student_credential',
      'migration.sql',
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    expect(sql).toContain('CREATE TABLE `student_credential`');
    expect(sql).toContain('`token_hash` CHAR(64) NOT NULL');
    expect(sql).toContain('UNIQUE INDEX `student_credential_token_hash_key`');
    expect(sql).toContain('UNIQUE INDEX `student_credential_student_id_version_key`');
    expect(sql).toContain('INDEX `student_credential_student_id_is_active_idx`');
    expect(sql).toMatch(
      /FOREIGN KEY \(`student_id`\) REFERENCES `student`\(`id`\) ON DELETE CASCADE/,
    );
    // 绝不存令牌明文列（token_hash 之外不得出现任何名为 token 的字符串列）
    expect(sql).not.toMatch(/`token`\s+(VARCHAR|CHAR|TEXT)/);
  });

  it('10. schema.prisma：含 StudentCredential 模型与 Student 反向关系，无明文 token 字段', () => {
    const schemaPath = path.join(__dirname, '..', '..', 'prisma', 'schema.prisma');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('model StudentCredential');
    expect(schema).toContain('@@map("student_credential")');
    expect(schema).toContain('credentials StudentCredential[]');
    expect(schema).toContain('@@unique([studentId, version])');
    // 无明文 token 字段（tokenHash 命中不受影响：token 后紧跟 Hash，无词边界+空白）
    expect(schema).not.toMatch(/\btoken\s+String/);
  });
});
