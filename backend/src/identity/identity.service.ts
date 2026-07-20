/**
 * IdentityService — 身份服务（Day 4 核心）
 *
 * 上游规则：Sprint 2.1 Day 4 拍板 1/3/4 + §5 + 刘老师 2026-07-20 最终定稿
 *
 * 职责（认证链路唯一入口）：
 * 1. 路由：根据 provider 选 PhoneIdentityProvider / WechatIdentityProvider / AccountIdentityProvider
 * 2. 调用提供方完成凭证校验
 * 3. 拿到 userId 后，调用 UserRepository.recordLogin 记录登录
 * 4. 返回 IdentityResult
 *
 * **同 User 原则（核心）**：
 * 三个入口（PHONE / WECHAT / ACCOUNT）登录到同一个 User，IdentityService 是唯一收敛点。
 *
 * **拍板 4 边界**：
 * - ✅ IdentityService 允许依赖：UserRepository、IdentityRepository、3 个提供方
 * - ❌ IdentityService **不**做：业务身份解析（teacher/parent 转换 → 留给 Day 5 Authorization 层）
 * - ❌ IdentityService **不**做：Session 创建（→ Day 6 SessionService）
 * - ❌ IdentityService **不**做：JWT 签发（→ Day 6 SessionService）
 */

import type { IdentityProvider } from '@prisma/client';
import {
  IdentityContext,
  IdentityError,
  IdentityInput,
  IdentityResult,
  IIdentityProvider,
} from './identity-provider';
import { PhoneIdentityProvider } from './phone-identity.provider';
import { WechatIdentityProvider } from './wechat-identity.provider';
import { AccountIdentityProvider } from './account-identity.provider';
import { IdentityRepository } from '../repositories/identity.repository';
import { UserRepository } from '../repositories/user.repository';

/** 3 个已实现的 provider（拍板 1 修正：只有 3 个，不预留未来 Provider） */
const IMPLEMENTED_PROVIDERS: ReadonlySet<IdentityProvider> = new Set([
  'PHONE',
  'WECHAT',
  'ACCOUNT',
]);

export class IdentityService {
  private providers: Map<IdentityProvider, IIdentityProvider>;

  constructor(
    private identityRepository: IdentityRepository,
    private userRepository: UserRepository
  ) {
    this.providers = new Map<IdentityProvider, IIdentityProvider>([
      ['PHONE', new PhoneIdentityProvider(identityRepository)],
      ['WECHAT', new WechatIdentityProvider(identityRepository)],
      [
        'ACCOUNT',
        new AccountIdentityProvider(identityRepository, userRepository),
      ],
    ]);
  }

  /**
   * 登录入口（按 provider 路由）
   *
   * 业务流程：
   * 1. 校验 provider 已实现
   * 2. 调用对应提供方
   * 3. 成功后：记录登录（User.lastLoginAt + lastLoginIp）
   * 4. 返回 IdentityResult
   *
   * @throws IdentityError 凭证无效 / 用户未注册 / 用户已禁用 / 提供方未实现
   */
  async login(input: IdentityInput, context: IdentityContext): Promise<IdentityResult> {
    // 1. 校验 provider 已实现
    if (!IMPLEMENTED_PROVIDERS.has(input.provider)) {
      throw new IdentityError(
        'PROVIDER_NOT_IMPLEMENTED',
        `登录提供方 ${input.provider} 暂未实现（仅支持 PHONE / WECHAT / ACCOUNT）`
      );
    }

    // 2. 路由到对应提供方
    const provider = this.providers.get(input.provider);
    if (!provider) {
      throw new IdentityError('PROVIDER_NOT_IMPLEMENTED', `找不到 ${input.provider} 提供方`);
    }

    const result = await provider.login(input, context);

    // 3. 记录登录（仅成功路径）
    if (result.userId) {
      await this.userRepository.recordLogin(result.userId, context.ip);
    }

    return result;
  }

  /**
   * 绑定新身份到已存在 User
   *
   * ⚠️ 该方法需要鉴权（必须是 userId 对应的 user 本人或管理员调用）
   *    Day 4 暂不实现鉴权层，Day 5 Authorization 后再补。
   */
  async bindIdentity(
    userId: string,
    provider: IdentityProvider,
    externalId: string,
    credentialHash?: string
  ): Promise<{ identityId: string }> {
    // 1. 检查该 (provider, externalId) 是否已被他人占用
    const taken = await this.identityRepository.isExternalIdTaken(provider, externalId);
    if (taken) {
      throw new IdentityError(
        'INVALID_CREDENTIALS',
        `该 ${provider} 身份已被其他账号绑定`
      );
    }

    // 2. 检查 user 已有该 provider（防止重复绑）
    const existing = await this.identityRepository.findByUserAndProvider(
      userId,
      provider
    );
    if (existing) {
      throw new IdentityError(
        'INVALID_CREDENTIALS',
        `该用户已绑定 ${provider}`
      );
    }

    // 3. 创建身份
    const identity = await this.identityRepository.create({
      user: { connect: { id: userId } },
      provider,
      externalId,
      credentialHash: credentialHash ?? null,
      verified: true,
      verifiedAt: new Date(),
      status: 'ACTIVE',
    });

    return { identityId: identity.id };
  }

  /**
   * 解绑身份（软删除）
   *
   * 校验：解绑后该 user 必须至少还有 1 个 ACTIVE 身份，否则不让解绑。
   * 防止出现"孤儿 user"——既没手机号又没微信也没账号。
   */
  async unbindIdentity(
    userId: string,
    identityId: string
  ): Promise<{ success: true }> {
    const identities = await this.identityRepository.findByUser(userId);
    const target = identities.find((i) => i.id === identityId);

    if (!target) {
      throw new IdentityError('USER_NOT_FOUND', '身份不存在');
    }

    const activeOthers = identities.filter(
      (i) => i.id !== identityId && i.status === 'ACTIVE'
    );
    if (activeOthers.length === 0) {
      throw new IdentityError(
        'INVALID_CREDENTIALS',
        '该用户至少需要保留 1 个登录方式'
      );
    }

    await this.identityRepository.softDelete(identityId);
    return { success: true };
  }
}

export const identityService = new IdentityService(
  new IdentityRepository(),
  new UserRepository()
);
