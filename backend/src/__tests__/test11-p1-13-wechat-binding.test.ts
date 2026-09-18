/**
 * 测试 11: P1-13 Gate D — 教师微信绑定业务（init / confirm / unbind + DataScope + 并发）
 *
 * 覆盖清单（Gate D 要求）：
 *  1. init 成功（明文仅返回一次，库里只存 SHA-256）
 *  2. init 权限元数据 = teacher:bind-wechat
 *  3. init 跨 DataScope（跨校）→ 拒绝
 *  4. init DataScope GRADE 跨年级 → 拒绝
 *  5. init ROLE_ADMIN 全局放行
 *  6. init 目标教师已绑定 / 不存在 → 拒绝
 *  7. confirm 成功（写 wechat_openid、token 消费）
 *  8. confirm unionid 缺失时不伪造
 *  9. confirm token 不存在 / 过期 / 已消费 → 统一文案（防状态枚举）
 * 10. confirm 目标教师已绑定 → 拒绝
 * 11. confirm openid 已绑定其他教师 → 拒绝
 * 12. 重复 / 并发 confirm：只有一个成功
 * 13. 唯一约束 P2002 → 400 业务冲突，不能变 500
 * 14. unbind 非 ROLE_ADMIN → 拒绝；ROLE_ADMIN → 成功清空
 * 15. unbind 权限元数据 = teacher:unbind-wechat
 * 16. 绑定后 /auth/login 能按 openid 查到教师（登录回归）
 */

import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { setupPrismaMock } from './helpers/mock-prisma';

setupPrismaMock();

/* eslint-disable @typescript-eslint/no-var-requires */
const { WechatBindingService, BINDING_TOKEN_TTL_MS } = require('../modules/wechat-binding/wechat-binding.service');
const { TeacherController } = require('../modules/teacher/teacher.controller');
const { PERMISSIONS_KEY } = require('../common/decorators');
const { AuthService } = require('../modules/auth/auth.service');
const crypto = require('crypto');
/* eslint-enable @typescript-eslint/no-var-requires */

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** 内存版 Prisma：能真实表达唯一约束与条件更新，用于并发/冲突语义验证 */
function makePrisma(seedTeachers: any[] = []) {
  const teachers = new Map<string, any>();
  seedTeachers.forEach((t) => teachers.set(t.id, { ...t }));
  const bindings = new Map<string, any>();
  const hashIndex = new Map<string, any>();
  let seq = 0;

  const prisma: any = {
    teachers,
    bindings,
    hashIndex,

    teacher: {
      findUnique: async ({ where }: any) => {
        if (where.id) return teachers.get(where.id) ?? null;
        if (where.wechatOpenid !== undefined) {
          for (const t of teachers.values()) {
            if (t.wechatOpenid === where.wechatOpenid) return t;
          }
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const t = teachers.get(where.id);
        if (!t) throw new Error('record not found');
        if (data.wechatOpenid != null) {
          for (const o of teachers.values()) {
            if (o.id !== t.id && o.wechatOpenid === data.wechatOpenid) {
              const e: any = new Error(
                'Unique constraint failed on the fields: (`wechat_openid`)',
              );
              e.code = 'P2002';
              throw e;
            }
          }
        }
        Object.assign(t, data);
        return t;
      },
    },

    teacherWechatBinding: {
      create: async ({ data }: any) => {
        const rec = { id: `b_${++seq}`, ...data };
        bindings.set(rec.id, rec);
        hashIndex.set(rec.tokenHash, rec);
        return rec;
      },
      findUnique: async ({ where }: any) => hashIndex.get(where.tokenHash) ?? null,
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const b of bindings.values()) {
          if (where.id && b.id !== where.id) continue;
          if (where.status && b.status !== where.status) continue;
          Object.assign(b, data);
          count += 1;
        }
        return { count };
      },
    },

    $transaction: async (fn: any) => fn(prisma),
  };

  return prisma;
}

/** DataScope 专用 mock：可分别指定调用者 / 目标教师的学校归属 */
function makeScopePrisma(opts: {
  actorClassSchools?: string[];
  actorGradeSchools?: string[];
  targetClassSchools?: string[];
  targetGradeSchools?: string[];
  relationCount?: number;
  headClassCount?: number;
  schoolCount?: number;
  teachers?: any[];
}) {
  const prisma = makePrisma(opts.teachers ?? [{ id: 'target', status: 'ACTIVE', wechatOpenid: null }]);
  prisma.teacherClassRelation = {
    findMany: jest.fn(async ({ where }: any) => {
      const schools =
        where.teacherId === 'actor'
          ? opts.actorClassSchools ?? []
          : opts.targetClassSchools ?? [];
      return schools.map((s) => ({ class: { schoolId: s } }));
    }),
    count: jest.fn(async () => opts.relationCount ?? 0),
  };
  prisma.grade = {
    findMany: jest.fn(async ({ where }: any) => {
      const schools =
        where.directorId === 'actor'
          ? opts.actorGradeSchools ?? []
          : opts.targetGradeSchools ?? [];
      return schools.map((s) => ({ schoolId: s }));
    }),
  };
  prisma.class = { count: jest.fn(async () => opts.headClassCount ?? 0) };
  prisma.school = {
    findMany: jest.fn(async () =>
      Array.from({ length: opts.schoolCount ?? 1 }, (_, i) => ({ id: `S${i + 1}` })),
    ),
  };
  return prisma;
}

const ACTOR_ID = 'actor';
const buildService = (prisma: any, exchangeImpl?: jest.Mock) =>
  new WechatBindingService(prisma, {
    exchange: exchangeImpl ?? jest.fn().mockResolvedValue({ openid: 'OPENID_1', unionid: 'UNIONID_1' }),
  } as any);

describe('P1-13 Gate D: initBinding', () => {
  it('1. init 成功：返回明文绑定码，库里只存 SHA-256（绝不存明文）', async () => {
    const prisma = makeScopePrisma({
      actorClassSchools: ['S1'],
      targetClassSchools: ['S1'],
    });
    const svc = buildService(prisma);

    const actor: any = { id: ACTOR_ID, roles: ['ROLE_GRADE_DIRECTOR'], dataScope: { type: 'ALL' } };
    const res = await svc.initBinding('target', actor);

    expect(res.bindingToken).toBeTruthy();
    expect(res.expiresIn).toBe(600);
    expect(res.teacherId).toBe('target');

    const stored = [...prisma.bindings.values()][0] as any;
    expect(stored.tokenHash).toBe(sha256(res.bindingToken));
    expect(stored.tokenHash).not.toBe(res.bindingToken);
    expect(stored.status).toBe('ACTIVE');
    expect(stored.adminId).toBe(ACTOR_ID);
    expect(stored.teacherId).toBe('target');
    // 明文不得出现在任何入库字段里
    expect(JSON.stringify(stored)).not.toContain(res.bindingToken);
  });

  it('2. init 路由权限元数据 = teacher:bind-wechat', () => {
    const meta = Reflect.getMetadata(PERMISSIONS_KEY, TeacherController.prototype.initBindWechat);
    expect(meta).toEqual(['teacher:bind-wechat']);
  });

  it('3. 跨 DataScope（跨校 teacherId）→ Forbidden', async () => {
    const prisma = makeScopePrisma({
      actorClassSchools: ['S1'],
      targetClassSchools: ['S2'],
      schoolCount: 2,
    });
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_GRADE_DIRECTOR'], dataScope: { type: 'ALL' } };

    await expect(svc.initBinding('target', actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.bindings.size).toBe(0);
  });

  it('4. 同校但跨年级（GRADE_DIRECTOR）→ Forbidden', async () => {
    const prisma = makeScopePrisma({
      actorGradeSchools: ['S1'],
      targetClassSchools: ['S1'],
      relationCount: 0,
      headClassCount: 0,
    });
    const svc = buildService(prisma);
    const actor: any = {
      id: ACTOR_ID,
      roles: ['ROLE_GRADE_DIRECTOR'],
      dataScope: { type: 'GRADE', gradeId: 'G1' },
    };

    await expect(svc.initBinding('target', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('5. 同校同年级（GRADE_DIRECTOR）→ 放行', async () => {
    const prisma = makeScopePrisma({
      actorGradeSchools: ['S1'],
      targetClassSchools: ['S1'],
      relationCount: 1,
    });
    const svc = buildService(prisma);
    const actor: any = {
      id: ACTOR_ID,
      roles: ['ROLE_GRADE_DIRECTOR'],
      dataScope: { type: 'GRADE', gradeId: 'G1' },
    };

    const res = await svc.initBinding('target', actor);
    expect(res.bindingToken).toBeTruthy();
  });

  it('6. ROLE_ADMIN 保持全局放行语义（跨校也放行）', async () => {
    const prisma = makeScopePrisma({
      actorClassSchools: ['S1'],
      targetClassSchools: ['S9'],
      schoolCount: 3,
    });
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

    const res = await svc.initBinding('target', actor);
    expect(res.bindingToken).toBeTruthy();
    // 全局放行：不应发起任何归属查询
    expect(prisma.teacherClassRelation.findMany).not.toHaveBeenCalled();
  });

  it('7. 目标教师不存在 → 404', async () => {
    const prisma = makeScopePrisma({ actorClassSchools: ['S1'], targetClassSchools: ['S1'] });
    prisma.teacher.findUnique = jest.fn(async () => null);
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

    await expect(svc.initBinding('ghost', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('8. 目标教师已绑定微信 → 拒绝覆盖', async () => {
    const prisma = makeScopePrisma({
      actorClassSchools: ['S1'],
      targetClassSchools: ['S1'],
      teachers: [{ id: 'target', status: 'ACTIVE', wechatOpenid: 'EXISTING_OPENID' }],
    });
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

    await expect(svc.initBinding('target', actor)).rejects.toThrow('该教师已绑定微信，请先解绑');
    expect(prisma.bindings.size).toBe(0);
  });
});

describe('P1-13 Gate D: confirmBinding', () => {
  const seed = () => ({
    prisma: makePrisma([{ id: 'target', status: 'ACTIVE', wechatOpenid: null }]),
    exchange: jest.fn().mockResolvedValue({ openid: 'OPENID_1', unionid: 'UNIONID_1' }),
  });

  /** 走 init 拿到真实绑定码（模拟真实链路） */
  async function prepare(exchange: jest.Mock, prisma: any, actorRoles = ['ROLE_ADMIN']) {
    prisma.teacherClassRelation = { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) };
    prisma.grade = { findMany: jest.fn(async () => []) };
    prisma.class = { count: jest.fn(async () => 0) };
    prisma.school = { findMany: jest.fn(async () => [{ id: 'S1' }]) };
    const svc = buildService(prisma, exchange);
    const actor: any = { id: ACTOR_ID, roles: actorRoles, dataScope: { type: 'ALL' } };
    const init = await svc.initBinding('target', actor);
    return { svc, token: init.bindingToken as string };
  }

  it('9. confirm 成功：写入 wechat_openid + unionid，token 变为 CONSUMED', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);

    const res = await svc.confirmBinding({ code: 'WX_CODE', token });
    expect(res).toEqual({ ok: true });

    const teacher = prisma.teachers.get('target');
    expect(teacher.wechatOpenid).toBe('OPENID_1');
    expect(teacher.wechatUnionid).toBe('UNIONID_1');

    const binding = [...prisma.bindings.values()][0] as any;
    expect(binding.status).toBe('CONSUMED');
    expect(binding.consumedAt).toBeInstanceOf(Date);
    // 确认换码走的是 Gate C 的 WechatCodeExchangeService
    expect(exchange).toHaveBeenCalledWith('WX_CODE');
  });

  it('10. unionid 缺失时不伪造：不写入该字段', async () => {
    const { prisma, exchange } = seed();
    exchange.mockResolvedValue({ openid: 'OPENID_NO_UNION' });
    const { svc, token } = await prepare(exchange, prisma);

    await svc.confirmBinding({ code: 'WX_CODE', token });

    const teacher = prisma.teachers.get('target');
    expect(teacher.wechatOpenid).toBe('OPENID_NO_UNION');
    expect(teacher.wechatUnionid).toBeUndefined();
  });

  it('11. token 不存在 / 过期 / 已消费 → 统一文案（不泄露状态）', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);

    // 11a 不存在的码
    await expect(svc.confirmBinding({ code: 'WX', token: 'NOT_A_REAL_TOKEN' })).rejects.toThrow(
      '绑定码无效或已失效',
    );

    // 11b 已消费
    await svc.confirmBinding({ code: 'WX', token });
    await expect(svc.confirmBinding({ code: 'WX', token })).rejects.toThrow('绑定码无效或已失效');

    // 11c 过期：手工把未消费的 binding 改成已过期
    const { prisma: p2, exchange: e2 } = seed();
    const { svc: s2, token: t2 } = await prepare(e2, p2);
    const b2 = [...p2.bindings.values()][0] as any;
    b2.expiresAt = new Date(Date.now() - 1000);
    await expect(s2.confirmBinding({ code: 'WX', token: t2 })).rejects.toThrow('绑定码无效或已失效');
    expect(p2.teachers.get('target').wechatOpenid).toBeNull();
  });

  it('12. TTL 为 10 分钟', () => {
    expect(BINDING_TOKEN_TTL_MS).toBe(10 * 60 * 1000);
  });

  it('13. 目标教师已绑定其他微信 → 拒绝，且 token 不被消费', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);
    prisma.teachers.get('target').wechatOpenid = 'OTHER_WECHAT';

    await expect(svc.confirmBinding({ code: 'WX', token })).rejects.toThrow(
      '该教师已绑定其他微信，请先解绑',
    );
    const binding = [...prisma.bindings.values()][0] as any;
    expect(binding.status).toBe('ACTIVE');
  });

  it('14. openid 已绑定其他教师 → 拒绝，不覆盖', async () => {
    const { prisma, exchange } = seed();
    prisma.teachers.set('other', { id: 'other', status: 'ACTIVE', wechatOpenid: 'OPENID_1' });
    const { svc, token } = await prepare(exchange, prisma);

    await expect(svc.confirmBinding({ code: 'WX', token })).rejects.toThrow(
      '该微信已绑定其他教师',
    );
    expect(prisma.teachers.get('target').wechatOpenid).toBeNull();
    expect(prisma.teachers.get('other').wechatOpenid).toBe('OPENID_1');
  });

  it('15. 并发 confirm 同一个绑定码：只有一个成功', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);

    const results = await Promise.allSettled([
      svc.confirmBinding({ code: 'WX_A', token }),
      svc.confirmBinding({ code: 'WX_B', token }),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    expect((bad[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    expect((bad[0] as PromiseRejectedResult).reason.message).toBe('绑定码无效或已失效');
    // 只被消费一次
    expect(([...prisma.bindings.values()][0] as any).status).toBe('CONSUMED');
  });

  it('16. 唯一约束 P2002 → 400 业务冲突，绝不变 500', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);

    // 绕过友好预检查：让 findUnique(wechatOpenid) 查不到，但 update 时撞唯一键
    const originalFindUnique = prisma.teacher.findUnique;
    prisma.teacher.findUnique = jest.fn(async ({ where }: any) => {
      if (where.wechatOpenid !== undefined) return null;
      return originalFindUnique({ where });
    });
    // 制造一个"不可见"的占用者，使 update 抛出 P2002
    const originalUpdate = prisma.teacher.update;
    prisma.teacher.update = jest.fn(async (args: any) => {
      const t = prisma.teachers.get('other_ghost') ?? null;
      if (!t) {
        prisma.teachers.set('other_ghost', {
          id: 'other_ghost',
          wechatOpenid: 'OPENID_1',
        });
      }
      return originalUpdate(args);
    });

    await expect(svc.confirmBinding({ code: 'WX', token })).rejects.toThrow(
      '该微信已绑定其他教师',
    );
  });

  it('17. 绑定后 /auth/login 能按 openid 查到教师（登录回归）', async () => {
    const { prisma, exchange } = seed();
    const { svc, token } = await prepare(exchange, prisma);
    await svc.confirmBinding({ code: 'WX', token });

    // 复刻 auth.service.loginByWechat 的查询方式
    const found = await prisma.teacher.findUnique({ where: { wechatOpenid: 'OPENID_1' } });
    expect(found).toBeTruthy();
    expect(found.id).toBe('target');

    // 再用真实 AuthService 走一遍（确认不会落到"未绑定"分支）
    const teacherFindUnique = jest.fn(async ({ where }: any) =>
      prisma.teacher.findUnique({ where }),
    );
    const auth: any = new AuthService(
      { sign: jest.fn().mockReturnValue('jwt') } as any,
      { get: jest.fn((_k: string, d: any) => d) } as any,
      { teacher: { findUnique: teacherFindUnique }, $queryRaw: jest.fn().mockResolvedValue([]) },
      { exchange: jest.fn().mockResolvedValue({ openid: 'OPENID_1' }) } as any,
    );
    await expect(auth.loginByWechat('WX')).resolves.toBeTruthy();
  });
});

describe('P1-13 Gate D: unbindWechat', () => {
  const seed = () =>
    makePrisma([
      { id: 'target', status: 'ACTIVE', wechatOpenid: 'OPENID_1', wechatUnionid: 'UNIONID_1' },
    ]);

  it('18. 非 ROLE_ADMIN → Forbidden（普通教师/年级主任/政教都不行）', async () => {
    for (const roles of [
      ['ROLE_HEADMASTER'],
      ['ROLE_SUBJECT_TEACHER'],
      ['ROLE_GRADE_DIRECTOR'],
      ['ROLE_POLITICAL'],
      [],
    ]) {
      const prisma = seed();
      const svc = buildService(prisma);
      const actor: any = { id: ACTOR_ID, roles, dataScope: { type: 'ALL' } };
      await expect(svc.unbindWechat('target', actor)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.teachers.get('target').wechatOpenid).toBe('OPENID_1');
    }
  });

  it('19. ROLE_ADMIN 解绑成功：清空 openid / unionid', async () => {
    const prisma = seed();
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

    const res = await svc.unbindWechat('target', actor);
    expect(res).toEqual({ ok: true });
    expect(prisma.teachers.get('target').wechatOpenid).toBeNull();
    expect(prisma.teachers.get('target').wechatUnionid).toBeNull();
  });

  it('20. 解绑不删除历史 binding 审计记录', async () => {
    const prisma = seed();
    const svc = buildService(prisma);
    prisma.bindings.set('b1', { id: 'b1', teacherId: 'target', status: 'CONSUMED' });
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

    await svc.unbindWechat('target', actor);
    expect(prisma.bindings.size).toBe(1);
  });

  it('21. 解绑目标不存在 → 404', async () => {
    const prisma = seed();
    const svc = buildService(prisma);
    const actor: any = { id: ACTOR_ID, roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };
    await expect(svc.unbindWechat('ghost', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('22. unbind 路由权限元数据 = teacher:unbind-wechat', () => {
    const meta = Reflect.getMetadata(PERMISSIONS_KEY, TeacherController.prototype.unbindWechat);
    expect(meta).toEqual(['teacher:unbind-wechat']);
  });
});
