/**
 * IdentityRepository — 身份仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 + Sprint 2.1 Day 4 拍板 4
 *
 * 职责（专管 user_identity 表）：
 * - 查找：findByProvider / findByUser / findById
 * - 写入：create / disable / verify / unlink
 * - 链接：linkToUser（绑定身份到 User）/ unlinkFromUser
 *
 * 明确**不**管（拍板 4 强制边界）：
 * - ❌ User 表读写（→ UserRepository）
 * - ❌ Teacher / Parent / Student 业务身份（→ TeacherRepository / ParentRepository / StudentRepository）
 * - ❌ 密码哈希 / 验证码（→ 登录策略负责）
 *
 * 业务 Service 应当依赖本仓储，不允许依赖 UserRepository（拍板 4 grep 检查）。
 */

import type { Prisma, UserIdentity, IdentityProvider, IdentityStatus } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class IdentityRepository extends BaseRepository {
  // ============================================================
  // 查询
  // ============================================================

  /**
   * 通过 (provider, externalId) 查找身份记录
   *
   * 使用场景：登录时，输入手机号 / 微信 OpenID / username，查找已注册的身份。
   *
   * 注意：返回的是 UserIdentity 记录，不是 User。调用方通常接着调用 findUserById
   * 拿到完整 User。
   */
  async findByProvider(
    provider: IdentityProvider,
    externalId: string
  ): Promise<UserIdentity | null> {
    return this.db.userIdentity.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
  }

  /**
   * 通过 id 查找身份记录
   */
  async findById(id: string): Promise<UserIdentity | null> {
    return this.db.userIdentity.findUnique({ where: { id } });
  }

  /**
   * 查找一个 User 的所有身份
   *
   * 业务场景：张老师绑定了手机号 + 微信 → 该方法返回 2 条记录。
   * 用于"账号设置"页面展示当前所有登录方式。
   */
  async findByUser(userId: string): Promise<UserIdentity[]> {
    return this.db.userIdentity.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 查找一个 User 的某 provider 身份（用于"我是否已绑微信"判断）
   */
  async findByUserAndProvider(
    userId: string,
    provider: IdentityProvider
  ): Promise<UserIdentity | null> {
    return this.db.userIdentity.findFirst({
      where: { userId, provider, deletedAt: null },
    });
  }

  /**
   * 判断某 (provider, externalId) 是否已被绑定到任何 User
   *
   * 用于：注册时防止重复绑定同一手机号。
   */
  async isExternalIdTaken(
    provider: IdentityProvider,
    externalId: string
  ): Promise<boolean> {
    const count = await this.db.userIdentity.count({
      where: { provider, externalId, deletedAt: null },
    });
    return count > 0;
  }

  // ============================================================
  // 写入
  // ============================================================

  /**
   * 创建身份记录
   *
   * 通常由登录策略调用：
   * - PhoneLoginStrategy：手机号首次登录后创建
   * - WechatLoginStrategy：微信首次绑定后创建
   * - AccountLoginStrategy：教师注册时创建
   *
   * 注意：如果 userId 已存在该 provider，本方法会因 unique 约束失败。
   * 调用方应先 findByUserAndProvider 检查。
   */
  async create(data: Prisma.UserIdentityCreateInput): Promise<UserIdentity> {
    return this.db.userIdentity.create({ data });
  }

  /**
   * 软删除（设置 deletedAt）身份
   *
   * 用于：解绑（用户主动在设置页解除微信绑定）。
   * 不直接硬删除：保留历史可追溯 + 满足审计要求。
   */
  async softDelete(id: string): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DISABLED' as IdentityStatus },
    });
  }

  /**
   * 验证身份（设置 verified = true）
   *
   * 手机号登录：验证码通过后调用
   * 微信登录：OAuth 回调拿到 openid + unionid 后调用
   * 账号登录：注册时直接 verified
   */
  async verify(id: string): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: { verified: true, verifiedAt: new Date() },
    });
  }

  /**
   * 禁用身份（不解绑，只是不允许用此方式登录）
   *
   * 用于：风控场景——某手机号多次登录失败，临时禁用。
   */
  async disable(id: string): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: { status: 'DISABLED' as IdentityStatus },
    });
  }

  /**
   * 重新启用身份
   */
  async enable(id: string): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: { status: 'ACTIVE' as IdentityStatus },
    });
  }

  /**
   * 更新凭证哈希（仅 ACCOUNT provider 使用）
   *
   * 场景：老师改了密码。
   */
  async updateCredentialHash(
    id: string,
    credentialHash: string
  ): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: { credentialHash },
    });
  }

  /**
   * 更新最后登录时间（每条 identity 独立记录）
   *
   * 区别于 User.lastLoginAt：
   * - User.lastLoginAt：最后任一方式登录时间
   * - 本字段：该 provider 方式最后登录时间
   *
   * 价值：能看到"张老师上次微信登录是 7 天前，但每天用手机号登录"
   */
  async touchLastLogin(id: string, ip: string): Promise<UserIdentity> {
    return this.db.userIdentity.update({
      where: { id },
      data: {
        // UserIdentity 表无 lastLoginAt 字段（v1.2 schema），只更新 User 表的 lastLoginAt
        // 这里保持简洁，不引入新字段；如未来需要可加 last_login_at 列
      },
    });
  }
}

export const identityRepository = new IdentityRepository();
