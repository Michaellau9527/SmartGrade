/**
 * 测试 12: P1-13 Gate E0 — 绑定预览 previewBinding（只读）
 *
 * 覆盖清单（Gate E2 要求）：
 *  1. 有效 token → 返回 { teacherId, teacherName }
 *  2. token 不存在 → 统一文案「绑定码无效或已失效」
 *  3. token 已过期 → 统一文案
 *  4. token 已消费 → 统一文案
 *  5. preview 不消费 token（status 仍 ACTIVE），且 preview 之后 confirm 仍可成功
 *  6. 不暴露敏感字段：响应 key 严格 = [teacherId, teacherName]
 *  7. 不触发微信换码（不调 WechatCodeExchangeService / jscode2session）
 *  8. preview 不写库（binding / teacher 均未被修改）
 *  9. 路由元数据：@Public + path = 'preview'
 * 10. 目标教师不存在 → 统一文案（不泄露内部状态）
 * 11. preview 与 confirm 共用同一套校验（confirm 回归：过期仍拒）
 */

import { BadRequestException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { setupPrismaMock } from './helpers/mock-prisma';

setupPrismaMock();

/* eslint-disable @typescript-eslint/no-var-requires */
const { WechatBindingService } = require('../modules/wechat-binding/wechat-binding.service');
const { WechatBindingController } = require('../modules/wechat-binding/wechat-binding.controller');
const { IS_PUBLIC_KEY } = require('../common/decorators');
/* eslint-enable @typescript-eslint/no-var-requires */

/** 内存版 Prisma（与 test11 同构，保证唯一约束 / 条件更新语义真实） */
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
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return teachers.get(where.id) ?? null;
        if (where.wechatOpenid !== undefined) {
          for (const t of teachers.values()) {
            if (t.wechatOpenid === where.wechatOpenid) return t;
          }
        }
        return null;
      }),
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

  // DataScope：本用例不涉及跨校，给一组"同校"即可
  prisma.teacherClassRelation = {
    findMany: jest.fn(async () => [{ class: { schoolId: 'S1' } }]),
    count: jest.fn(async () => 1),
  };
  prisma.grade = { findMany: jest.fn(async () => []) };
  prisma.class = { count: jest.fn(async () => 0) };
  prisma.school = { findMany: jest.fn(async () => [{ id: 'S1' }]) };

  return prisma;
}

const ACTOR: any = { id: 'actor', roles: ['ROLE_ADMIN'], dataScope: { type: 'ALL' } };

const buildService = (prisma: any, exchangeImpl?: jest.Mock) =>
  new WechatBindingService(prisma, {
    exchange:
      exchangeImpl ??
      jest.fn().mockResolvedValue({ openid: 'OPENID_1', unionid: 'UNIONID_1' }),
  } as any);

/** 走真实 init 链路拿一个有效绑定码 */
async function issueToken(prisma: any, exchange?: jest.Mock, teacherId = 'target') {
  const svc = buildService(prisma, exchange);
  const init = await svc.initBinding(teacherId, ACTOR);
  return { svc, token: init.bindingToken as string };
}

const seed = () =>
  makePrisma([
    {
      id: 'target',
      name: '张老师',
      teacherNo: 'T001',
      phone: '13800001001',
      email: 'zhang@school.edu',
      status: 'ACTIVE',
      wechatOpenid: null,
    },
  ]);

const bindingOf = (prisma: any) => [...prisma.bindings.values()][0] as any;

describe('P1-13 Gate E0: previewBinding', () => {
  it('1. 有效 token → 只返回 teacherId + teacherName', async () => {
    const prisma = seed();
    const { svc, token } = await issueToken(prisma);

    const res = await svc.previewBinding({ token });

    expect(res).toEqual({ teacherId: 'target', teacherName: '张老师' });
  });

  it('2. token 不存在 → 统一文案，不泄露状态', async () => {
    const prisma = seed();
    const { svc } = await issueToken(prisma);

    await expect(svc.previewBinding({ token: 'NOT_A_REAL_TOKEN' })).rejects.toThrow(
      '绑定码无效或已失效',
    );
    await expect(svc.previewBinding({ token: 'NOT_A_REAL_TOKEN' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('3. token 已过期 → 统一文案', async () => {
    const prisma = seed();
    const { svc, token } = await issueToken(prisma);

    bindingOf(prisma).expiresAt = new Date(Date.now() - 1000);

    await expect(svc.previewBinding({ token })).rejects.toThrow('绑定码无效或已失效');
  });

  it('4. token 已消费 → 统一文案', async () => {
    const prisma = seed();
    const exchange = jest.fn().mockResolvedValue({ openid: 'OPENID_1' });
    const { svc, token } = await issueToken(prisma, exchange);

    // 先真正完成绑定（token 被消费）
    await svc.confirmBinding({ code: 'WX_CODE', token });
    expect(bindingOf(prisma).status).toBe('CONSUMED');

    await expect(svc.previewBinding({ token })).rejects.toThrow('绑定码无效或已失效');
  });

  it('5. preview 不消费 token：状态仍 ACTIVE，且之后 confirm 依然成功', async () => {
    const prisma = seed();
    const exchange = jest.fn().mockResolvedValue({ openid: 'OPENID_1' });
    const { svc, token } = await issueToken(prisma, exchange);

    await svc.previewBinding({ token });
    await svc.previewBinding({ token }); // 可重复预览

    const b = bindingOf(prisma);
    expect(b.status).toBe('ACTIVE');
    expect(b.consumedAt).toBeUndefined();

    const res = await svc.confirmBinding({ code: 'WX_CODE', token });
    expect(res).toEqual({ ok: true });
    expect(bindingOf(prisma).status).toBe('CONSUMED');
  });

  it('6. 不暴露敏感字段：响应 key 严格 = [teacherId, teacherName]', async () => {
    const prisma = seed();
    const { svc, token } = await issueToken(prisma);

    const res: any = await svc.previewBinding({ token });

    expect(Object.keys(res).sort()).toEqual(['teacherId', 'teacherName']);

    const serialized = JSON.stringify(res);
    for (const leaked of [
      'OPENID',
      'openid',
      'unionid',
      'UNIONID',
      'adminId',
      'actor',
      'tokenHash',
      token, // 明文绑定码 / 其哈希
      '13800001001', // phone
      'zhang@school.edu', // email
      'T001', // teacherNo
      'S1', // schoolId
    ]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it('7. 不触发微信换码：preview 全程不调 WechatCodeExchangeService', async () => {
    const prisma = seed();
    const exchange = jest.fn().mockResolvedValue({ openid: 'OPENID_1' });
    const { svc, token } = await issueToken(prisma, exchange);

    exchange.mockClear();
    await svc.previewBinding({ token });

    expect(exchange).not.toHaveBeenCalled();
  });

  it('8. preview 不写库：binding 数量与字段、teacher 均未被修改', async () => {
    const prisma = seed();
    const { svc, token } = await issueToken(prisma);

    const beforeBinding = JSON.stringify(bindingOf(prisma));
    const beforeTeacher = JSON.stringify(prisma.teachers.get('target'));

    await svc.previewBinding({ token });

    expect(prisma.bindings.size).toBe(1);
    expect(JSON.stringify(bindingOf(prisma))).toBe(beforeBinding);
    expect(JSON.stringify(prisma.teachers.get('target'))).toBe(beforeTeacher);
  });

  it('9. 路由元数据：preview 为 @Public，path = preview', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, WechatBindingController.prototype.preview)).toBe(
      true,
    );
    expect(Reflect.getMetadata(PATH_METADATA, WechatBindingController.prototype.preview)).toBe(
      'preview',
    );
    // confirm 仍是公开的（Gate D 语义未被 E0 破坏）
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, WechatBindingController.prototype.confirm)).toBe(
      true,
    );
  });

  it('10. 目标教师不存在 → 统一文案，不泄露内部状态', async () => {
    const prisma = seed();
    const { svc, token } = await issueToken(prisma);

    prisma.teacher.findUnique = jest.fn(async () => null);

    await expect(svc.previewBinding({ token })).rejects.toThrow('绑定码无效或已失效');
  });

  it('11. 回归：confirm 仍共用同一套校验（过期依旧拒绝，不写 openid）', async () => {
    const prisma = seed();
    const exchange = jest.fn().mockResolvedValue({ openid: 'OPENID_1' });
    const { svc, token } = await issueToken(prisma, exchange);

    bindingOf(prisma).expiresAt = new Date(Date.now() - 1000);

    await expect(svc.confirmBinding({ code: 'WX_CODE', token })).rejects.toThrow(
      '绑定码无效或已失效',
    );
    expect(prisma.teachers.get('target').wechatOpenid).toBeNull();
    expect(exchange).not.toHaveBeenCalled();
  });
});
