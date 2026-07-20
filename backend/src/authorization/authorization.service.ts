/**
 * AuthorizationService — 授权服务
 *
 * 上游规则：Sprint 2.1 Day 5.1 刘老师 2026-07-20 拍板
 *
 * 职责：只回答"有没有权限？"
 * - hasPermission(ctx, permission) → boolean
 * - hasRole(ctx, role) → boolean
 * - requirePermission(ctx, permission) → void（无权限抛错）
 *
 * **不**做：
 * - ❌ 不构建 AuthorizationContext（→ AuthorizationResolver）
 * - ❌ 不解析 DataScope（→ DataScopeResolver，Day 5.3）
 * - ❌ 不查数据库（依赖注入的 ctx 已包含全部信息）
 *
 * 设计原则：纯函数，无状态，可测试。
 */

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';
import type { AuthorizationContext } from './types';

/** 权限不足错误 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly permission: PermissionCode,
    public readonly actorId: string
  ) {
    super(`权限不足：需要 ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}

export class AuthorizationService {
  /**
   * 判断当前用户是否有指定权限
   *
   * 使用方式：
   *   if (authService.hasPermission(ctx, PermissionCode.LEAVE_APPROVE)) {
   *     // 允许审批
   *   }
   */
  hasPermission(
    ctx: AuthorizationContext,
    permission: PermissionCode
  ): boolean {
    return ctx.authorization.permissionSet.has(permission);
  }

  /**
   * 判断当前用户是否有指定角色
   *
   * 使用场景：页面级权限控制（如"只有年级主任才能看到统计入口"）
   */
  hasRole(ctx: AuthorizationContext, role: RoleCode): boolean {
    return ctx.authorization.roleSet.has(role);
  }

  /**
   * 要求必须有指定权限，否则抛 PermissionDeniedError
   *
   * 使用方式（Service 层入口守卫）：
   *   async approveLeave(ctx: AuthorizationContext, leaveId: string) {
   *     this.authService.requirePermission(ctx, PermissionCode.LEAVE_APPROVE);
   *     // ... 继续业务逻辑
   *   }
   */
  requirePermission(
    ctx: AuthorizationContext,
    permission: PermissionCode
  ): void {
    if (!this.hasPermission(ctx, permission)) {
      throw new PermissionDeniedError(permission, ctx.actor.userId);
    }
  }

  /**
   * 要求必须有任意一个指定权限（多权限"或"关系）
   *
   * 使用场景："年级主任或政教都可以审批"
   */
  requireAnyPermission(
    ctx: AuthorizationContext,
    ...permissions: PermissionCode[]
  ): void {
    const hasAny = permissions.some((p) =>
      ctx.authorization.permissionSet.has(p)
    );
    if (!hasAny) {
      throw new PermissionDeniedError(permissions[0], ctx.actor.userId);
    }
  }

  /**
   * 要求必须有全部指定权限（多权限"与"关系）
   *
   * 使用场景："既要有审批权限，又要有查看权限"
   */
  requireAllPermissions(
    ctx: AuthorizationContext,
    ...permissions: PermissionCode[]
  ): void {
    const hasAll = permissions.every((p) =>
      ctx.authorization.permissionSet.has(p)
    );
    if (!hasAll) {
      throw new PermissionDeniedError(permissions[0], ctx.actor.userId);
    }
  }
}

export const authorizationService = new AuthorizationService();
