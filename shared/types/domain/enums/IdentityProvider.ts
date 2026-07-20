/**
 * IdentityProvider — 登录提供方
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 #8 + Sprint 2.1 Day 4 拍板 1
 *
 * 历史：
 * - v4.1：PHONE / WECHAT / ACCOUNT（3 策略）
 * - Day 4 修正：砍回 3 个。DINGTALK / FEISHU / WEWORK 删除。
 *
 * 为什么只有 3 个？
 * 整个产品 100% 是高中校园，不是企业 OA。
 * 未来如果有学校要求企业微信，v2.6 再加 WEWORK，联合类型加一行即可，
 * 不影响任何数据库结构。
 *
 * "不要为了未来，提前增加没有业务价值的 Provider" — 刘老师 2026-07-20
 */

export type IdentityProvider =
  /** 手机号 + 验证码 */
  | 'PHONE'
  /** 微信 OpenID / UnionID */
  | 'WECHAT'
  /** 账号 + 密码（管理后台） */
  | 'ACCOUNT';

/** 提供方显示文本 */
export const IdentityProviderText: Record<IdentityProvider, string> = {
  PHONE: '手机号',
  WECHAT: '微信',
  ACCOUNT: '账号',
};

/** 是否需要 credential_hash（仅 ACCOUNT 需要） */
export const IdentityProviderRequiresCredential: Record<IdentityProvider, boolean> = {
  PHONE: false,
  WECHAT: false,
  ACCOUNT: true,
};
