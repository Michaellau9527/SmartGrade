/**
 * IdentityProvider — 身份提供方接口
 *
 * 上游规则：Sprint 2.1 Day 4 拍板 1（3 入口）+ 刘老师 2026-07-20 最终定稿
 *
 * 为什么叫 Provider 不叫 Adapter？
 * Provider 更准确地表达"这一类身份的所有能力"：
 *   login / bind / unbind / rebind / refreshToken / silentLogin
 * Adapter 在架构里通常意味着"适配已有接口"，这里不是——它就是身份能力本身。
 *
 * Day 4 只实现 login。未来 Sprint 扩展 bind / unbind 等能力。
 *
 * 3 个实现：
 * - PhoneIdentityProvider（手机号 + 验证码）
 * - WechatIdentityProvider（微信 OAuth code）
 * - AccountIdentityProvider（username + password）
 */

import type { IdentityProvider } from '@prisma/client';

/** 身份操作入参（按 provider 走不同子类型） */
export type IdentityInput =
  | { provider: 'PHONE'; phone: string; code: string }
  | { provider: 'WECHAT'; code: string; openid?: string; unionid?: string }
  | { provider: 'ACCOUNT'; username: string; password: string };

/** 身份操作结果 */
export interface IdentityResult {
  /** 成功时返回的 user_id；失败时为 null */
  userId: string | null;

  /** 登录提供方 */
  provider: IdentityProvider;

  /** 提供方外部 ID（手机号 / openid / username） */
  externalId: string;

  /**
   * 是否是新建身份
   * - true：刚创建 UserIdentity（首次登录）
   * - false：已存在 UserIdentity
   */
  isNewIdentity: boolean;

  /**
   * 是否需要额外步骤
   * - 'BIND_PHONE'：微信登录但未绑定手机号（要求先绑定）
   * - 'NONE'：已就绪
   */
  nextStep: 'NONE' | 'BIND_PHONE';
}

/** 身份操作错误类型 */
export class IdentityError extends Error {
  constructor(
    public code:
      | 'INVALID_PHONE'
      | 'INVALID_CODE'
      | 'INVALID_CREDENTIALS'
      | 'WECHAT_NOT_BOUND'
      | 'USER_NOT_FOUND'
      | 'USER_DISABLED'
      | 'PROVIDER_NOT_IMPLEMENTED',
    message: string
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}

/** 身份提供方接口 */
export interface IIdentityProvider {
  /** 该提供方支持的 provider */
  readonly provider: IdentityProvider;

  /** 执行登录；返回 IdentityResult；失败抛 IdentityError */
  login(input: IdentityInput, context: IdentityContext): Promise<IdentityResult>;
}

/**
 * 身份操作上下文（提供方执行时需要的依赖，由 IdentityService 注入）
 *
 * 显式注入，不在提供方内部 import，避免循环依赖 + 便于测试 mock。
 */
export interface IdentityContext {
  /** 客户端 IP（用于登录日志） */
  ip: string;

  /** User-Agent / 设备标识（用于 Session 跟踪） */
  userAgent?: string;
}
