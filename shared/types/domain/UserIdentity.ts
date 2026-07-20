/**
 * UserIdentity — 用户身份（多登录方式）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 #7（v4.1 引入）
 *
 * 一个 User 可以有 0..N 个 UserIdentity（手机号 / 微信 / 账号 / 钉钉 / 飞书）。
 * 任意一个身份登录成功 = 登录该 User。
 *
 * ⚠️ v4.1 重要变更：从 User 表移除 wechat_openid / phone，迁到 UserIdentity。
 * 这样：
 * - 未来加新登录方式（企业微信 / 钉钉 / 飞书）零迁移
 * - 教师 + 家长都用微信小程序时，一个微信号可绑定两个 User
 */

import type { IdentityProvider } from './enums/IdentityProvider';

export interface UserIdentity {
  /** 主键 UUID */
  id: string;

  /** 所属用户 ID（FK User） */
  user_id: string;

  /** 登录提供方 */
  provider: IdentityProvider;

  /** 提供方唯一标识（手机号 / OpenID / UnionID / username） */
  external_id: string;

  /** 凭证哈希（仅 ACCOUNT 登录用，OAuth 不需要） */
  credential_hash?: string;

  /** 是否已验证 */
  verified: boolean;

  /** 验证时间 */
  verified_at?: string;

  /** 状态 */
  status: IdentityStatus;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 身份状态 */
export enum IdentityStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

/** Mock 示例 */
export const USER_IDENTITY_MOCK: UserIdentity = {
  id: 'ident_001',
  user_id: 'usr_001',
  provider: 'PHONE' as IdentityProvider,
  external_id: '13800000001',
  verified: true,
  verified_at: '2026-07-15T08:00:00+08:00',
  status: IdentityStatus.ACTIVE,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
