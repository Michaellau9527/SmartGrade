/**
 * 测试 5: Sprint 2.1 Day 4 — Identity（身份）三入口 + 同 User 原则
 *
 * 上游规则：SPRINT2_DAY4-6_PLAN.md §2 + 4 拍板点 + 刘老师 2026-07-20 最终定稿
 *
 * 最终定稿说明（2026-07-20）：
 * - IdentityProvider 从 6 砍回 3（删除 DINGTALK / FEISHU / WEWORK）
 * - LoginStrategy → IdentityProvider（接口 + 实现）
 *   IIdentityAdapter → IIdentityProvider
 *   PhoneIdentityAdapter → PhoneIdentityProvider
 *   WechatIdentityAdapter → WechatIdentityProvider
 *   AccountIdentityAdapter → AccountIdentityProvider
 * - LoginError → IdentityError
 *
 * 验收要求：
 * 1. ✅ PhoneIdentityProvider：手机号 + 验证码 → 返回已存在 user（不创建新 User）
 * 2. ✅ WechatIdentityProvider：已绑定微信 → 返回 user；未绑定 → 抛 WECHAT_NOT_BOUND
 * 3. ✅ AccountIdentityProvider：username + password 正确 → 返回 user；家长账号登录 → 拒绝
 * 4. ✅ 同 User 原则：张老师手机号 + 微信绑定同一 user，两种登录都拿到同一 userId
 * 5. ✅ IdentityService.bindIdentity：手机号首次绑定到 user → 成功
 * 6. ✅ IdentityService.unbindIdentity：解绑后必须保留 1 个登录方式
 */

import { setupPrismaMock, createMockPrisma, setMockPrisma, getMockPrisma } from './helpers/mock-prisma';

setupPrismaMock();

/** 假 UserIdentity 工厂 */
function fakeIdentity(overrides: Partial<any> = {}): any {
  return {
    id: 'ident_test_001',
    userId: 'usr_test_001',
    provider: 'PHONE',
    externalId: '13800000001',
    credentialHash: null,
    verified: true,
    verifiedAt: new Date('2026-07-15'),
    status: 'ACTIVE',
    createdAt: new Date('2026-07-15'),
    updatedAt: new Date('2026-07-15'),
    deletedAt: null,
    ...overrides,
  };
}

/** 假 User 工厂 */
function fakeUser(overrides: Partial<any> = {}): any {
  return {
    id: 'usr_test_001',
    username: null,
    passwordHash: null,
    userType: 'TEACHER',
    teacherId: 'tch_test_001',
    studentId: null,
    parentId: null,
    status: 'ACTIVE',
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date('2026-07-15'),
    updatedAt: new Date('2026-07-15'),
    deletedAt: null,
    teacher: { id: 'tch_test_001', name: '张老师' },
    parent: null,
    ...overrides,
  };
}

describe('测试 5: Day 4 Identity — 三入口 + 同 User 原则', () => {
  beforeEach(() => {
    setMockPrisma(createMockPrisma());
  });

  // ============================================================
  // 测试 1: PhoneIdentityProvider
  // ============================================================
  describe('PhoneIdentityProvider', () => {
    it('✅ 1.1 手机号 + 正确验证码 → 返回 userId，不创建新 User', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.findUnique.mockResolvedValue(
        fakeIdentity({ provider: 'PHONE', externalId: '13800000001' })
      );
      mockPrisma.user.update.mockResolvedValue(fakeUser());

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      const result = await svc.login(
        { provider: 'PHONE', phone: '13800000001', code: '123456' },
        { ip: '10.0.0.1' }
      );

      expect(result.userId).toBe('usr_test_001');
      expect(result.provider).toBe('PHONE');
      expect(result.isNewIdentity).toBe(false);
      expect(result.nextStep).toBe('NONE');

      // ✅ 关键断言：没有调用 user.create（不创建新 User）
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      // ✅ 验证记录登录被调用
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr_test_001' },
          data: expect.objectContaining({ lastLoginIp: '10.0.0.1' }),
        })
      );
    });

    it('❌ 1.2 手机号格式错误 → 抛 INVALID_PHONE', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login(
          { provider: 'PHONE', phone: '12345', code: '123456' },
          { ip: '10.0.0.1' }
        )
      ).rejects.toMatchObject({ code: 'INVALID_PHONE' });
    });

    it('❌ 1.3 验证码错误 → 抛 INVALID_CODE', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login(
          { provider: 'PHONE', phone: '13800000001', code: 'wrong' },
          { ip: '10.0.0.1' }
        )
      ).rejects.toMatchObject({ code: 'INVALID_CODE' });
    });

    it('❌ 1.4 未注册手机号 → 抛 USER_NOT_FOUND（不自动创建）', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login(
          { provider: 'PHONE', phone: '13900000000', code: '123456' },
          { ip: '10.0.0.1' }
        )
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });

      // ✅ 关键：不能自动创建 User
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.userIdentity.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 测试 2: WechatIdentityProvider
  // ============================================================
  describe('WechatIdentityProvider', () => {
    it('✅ 2.1 已绑定微信 → 返回 userId', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.findUnique.mockResolvedValue(
        fakeIdentity({
          id: 'ident_wx_001',
          provider: 'WECHAT',
          externalId: 'mock_openid_wxcode_abc',
        })
      );
      mockPrisma.user.update.mockResolvedValue(fakeUser());

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      const result = await svc.login(
        { provider: 'WECHAT', code: 'wxcode_abc' },
        { ip: '10.0.0.1' }
      );

      expect(result.userId).toBe('usr_test_001');
      expect(result.provider).toBe('WECHAT');
      expect(result.isNewIdentity).toBe(false);
      expect(result.nextStep).toBe('NONE');
    });

    it('❌ 2.2 未绑定微信 → 抛 WECHAT_NOT_BOUND', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login({ provider: 'WECHAT', code: 'wxcode_new' }, { ip: '10.0.0.1' })
      ).rejects.toMatchObject({ code: 'WECHAT_NOT_BOUND' });
    });
  });

  // ============================================================
  // 测试 3: AccountIdentityProvider
  // ============================================================
  describe('AccountIdentityProvider', () => {
    it('✅ 3.1 正确 username + password → 返回 userId（teacher）', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      // 真实 bcrypt hash of "test1234"
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('test1234', 10);

      mockPrisma.userIdentity.findUnique.mockResolvedValue(
        fakeIdentity({
          provider: 'ACCOUNT',
          externalId: 'tch_001',
          credentialHash: hash,
        })
      );
      mockPrisma.user.findUnique.mockResolvedValue(
        fakeUser({ userType: 'TEACHER' })
      );
      mockPrisma.user.update.mockResolvedValue(fakeUser());

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      const result = await svc.login(
        { provider: 'ACCOUNT', username: 'tch_001', password: 'test1234' },
        { ip: '10.0.0.1' }
      );

      expect(result.userId).toBe('usr_test_001');
      expect(result.provider).toBe('ACCOUNT');
    });

    it('❌ 3.2 密码错误 → 抛 INVALID_CREDENTIALS', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('test1234', 10);

      mockPrisma.userIdentity.findUnique.mockResolvedValue(
        fakeIdentity({
          provider: 'ACCOUNT',
          externalId: 'tch_001',
          credentialHash: hash,
        })
      );

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login(
          { provider: 'ACCOUNT', username: 'tch_001', password: 'wrong' },
          { ip: '10.0.0.1' }
        )
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('❌ 3.3 家长不能用账号登录（拍板 1 强制）→ 拒绝', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('test1234', 10);

      mockPrisma.userIdentity.findUnique.mockResolvedValue(
        fakeIdentity({
          provider: 'ACCOUNT',
          externalId: 'parent_001',
          credentialHash: hash,
        })
      );
      mockPrisma.user.findUnique.mockResolvedValue(
        fakeUser({ userType: 'PARENT', teacherId: null, parentId: 'p_001' })
      );

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.login(
          { provider: 'ACCOUNT', username: 'parent_001', password: 'test1234' },
          { ip: '10.0.0.1' }
        )
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });

  // ============================================================
  // 测试 4: 同 User 原则（最关键）
  // ============================================================
  describe('同 User 原则：张老师手机号 + 微信绑同一 User', () => {
    it('✅ 4.1 手机登录 + 微信登录两次都拿到同一 userId', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      // === 第一次：手机号登录 ===
      mockPrisma.userIdentity.findUnique.mockResolvedValueOnce(
        fakeIdentity({
          provider: 'PHONE',
          externalId: '13800000001',
          userId: 'usr_zhang',
        })
      );
      mockPrisma.user.update.mockResolvedValueOnce(fakeUser({ id: 'usr_zhang' }));

      const phoneResult = await svc.login(
        { provider: 'PHONE', phone: '13800000001', code: '123456' },
        { ip: '10.0.0.1' }
      );

      // === 第二次：微信登录 ===
      mockPrisma.userIdentity.findUnique.mockResolvedValueOnce(
        fakeIdentity({
          provider: 'WECHAT',
          externalId: 'mock_openid_zhang_wx',
          userId: 'usr_zhang', // ← 同一 user
        })
      );
      mockPrisma.user.update.mockResolvedValueOnce(fakeUser({ id: 'usr_zhang' }));

      const wechatResult = await svc.login(
        { provider: 'WECHAT', code: 'zhang_wx' },
        { ip: '10.0.0.2' }
      );

      // ✅ 关键断言：两次 userId 完全一致
      expect(phoneResult.userId).toBe('usr_zhang');
      expect(wechatResult.userId).toBe('usr_zhang');
      expect(phoneResult.userId).toBe(wechatResult.userId);
    });
  });

  // ============================================================
  // 测试 5: bindIdentity / unbindIdentity
  // ============================================================
  describe('bindIdentity / unbindIdentity', () => {
    it('✅ 5.1 bindIdentity → 成功创建 UserIdentity', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.count.mockResolvedValue(0); // 未占用
      mockPrisma.userIdentity.findFirst.mockResolvedValue(null); // 未绑过
      mockPrisma.userIdentity.create.mockResolvedValue(
        fakeIdentity({ provider: 'WECHAT', externalId: 'new_openid' })
      );

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      const result = await svc.bindIdentity(
        'usr_test_001',
        'WECHAT',
        'new_openid'
      );

      expect(result.identityId).toBe('ident_test_001');
      expect(mockPrisma.userIdentity.create).toHaveBeenCalled();
    });

    it('❌ 5.2 bindIdentity → 已被他人占用 → 拒绝', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.count.mockResolvedValue(1); // 已被占用

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.bindIdentity('usr_test_001', 'WECHAT', 'taken_openid')
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('❌ 5.3 unbindIdentity → 解绑后无其他登录方式 → 拒绝', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      // 该 user 只有 1 个 ACTIVE 身份
      mockPrisma.userIdentity.findMany.mockResolvedValue([
        fakeIdentity({ id: 'ident_only' }),
      ]);

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      await expect(
        svc.unbindIdentity('usr_test_001', 'ident_only')
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('✅ 5.4 unbindIdentity → 有其他登录方式 → 成功', async () => {
      const { IdentityService } = await import('../identity/identity.service');
      const mockPrisma = getMockPrisma();

      mockPrisma.userIdentity.findMany.mockResolvedValue([
        fakeIdentity({ id: 'ident_wx', provider: 'WECHAT' }),
        fakeIdentity({
          id: 'ident_phone',
          provider: 'PHONE',
          externalId: '13800000001',
        }),
      ]);
      mockPrisma.userIdentity.update.mockResolvedValue(
        fakeIdentity({ id: 'ident_wx', status: 'DISABLED' })
      );

      const svc = new IdentityService(
        (await import('../repositories/identity.repository')).identityRepository,
        (await import('../repositories/user.repository')).userRepository
      );

      const result = await svc.unbindIdentity('usr_test_001', 'ident_wx');
      expect(result.success).toBe(true);
      expect(mockPrisma.userIdentity.update).toHaveBeenCalled();
    });
  });
});
