/**
 * AuthorizationResolver — 授权解析器
 *
 * 上游规则：AUTHORIZATION_CONTEXT_v1.md + Sprint 2.1 Day 5.1/5.2 刘老师拍板
 *
 * 职责：从数据库解析授权信息，构建完整的 AuthorizationContext
 * - resolve(userId) → AuthorizationContext
 *
 * 组装流程（Day 5.2 完整版）：
 *   User → CurrentActor
 *     ↓
 *   Role → Permission (RBAC)
 *     ↓
 *   OrganizationResolver → Organization
 *     ↓
 *   DataScopeResolver → DataScope
 *     ↓
 *   AuthorizationContext { actor, authorization, issuedAt }
 *
 * 设计约束：
 * - 只查 User / Role / Permission / Organization / DataScope
 * - 不查 Student / Leave / Notice / Task 等业务数据
 * - 避免成为巨大 Resolver
 *
 * 依赖：
 * - UserRepository（查 User 基本信息）
 * - TeacherRepository（查 Teacher 角色）
 * - OrganizationResolver（组织归属）
 * - DataScopeResolver（数据范围）
 * - getPermissions()（角色 → 权限映射）
 */

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';
import { getPermissions } from './role-permission.map';
import type { OrganizationResolver } from './organization.resolver';
import type { DataScopeResolver } from './data-scope.resolver';
import type {
  AuthorizationContext,
  CurrentActor,
  AuthorizationInfo,
} from './types';

/** 解析器依赖接口（便于测试 mock） */
export interface ResolverDependencies {
  /** 查 User 基本信息（userType / teacherId / parentId） */
  findUserById(userId: string): Promise<{
    id: string;
    userType: 'SYSTEM_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
    teacherId: string | null;
    parentId: string | null;
  } | null>;

  /** 查 Teacher 的角色列表 */
  findRolesByTeacherId(teacherId: string): Promise<RoleCode[]>;
}

export class AuthorizationResolver {
  constructor(
    private deps: ResolverDependencies,
    private orgResolver: OrganizationResolver,
    private scopeResolver: DataScopeResolver
  ) {}

  /**
   * 解析 AuthorizationContext
   *
   * 流程：
   * 1. 查 User → CurrentActor
   * 2. 查 Role → Permission（RBAC）
   * 3. OrganizationResolver.resolve(actor) → Organization
   * 4. DataScopeResolver.resolve(actor) → DataScope
   * 5. 组装 AuthorizationContext（含 issuedAt）
   */
  async resolve(userId: string): Promise<AuthorizationContext> {
    // 1. 查 User
    const user = await this.deps.findUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 2. 构建 CurrentActor
    const actor: CurrentActor = {
      userId: user.id,
      teacherId: user.teacherId,
      parentId: user.parentId,
      userType: user.userType,
    };

    // 3. 查角色
    let roleCodes: RoleCode[] = [];
    if (user.userType === 'SYSTEM_ADMIN') {
      roleCodes = [RoleCode.ROLE_ADMIN];
    } else if (user.userType === 'TEACHER' && user.teacherId) {
      roleCodes = await this.deps.findRolesByTeacherId(user.teacherId);
    } else if (user.userType === 'PARENT') {
      roleCodes = [RoleCode.ROLE_PARENT];
    } else if (user.userType === 'STUDENT') {
      roleCodes = [RoleCode.ROLE_STUDENT];
    }

    // 4. 合并权限（多角色取并集）
    const roleSet = new Set(roleCodes);
    const permissionSet = new Set<PermissionCode>();
    roleCodes.forEach((role) => {
      getPermissions(role).forEach((p) => permissionSet.add(p));
    });

    // 5. 解析组织归属（Day 5.2）
    const organization = await this.orgResolver.resolve(actor);

    // 6. 解析数据范围（Day 5.2）
    const dataScope = await this.scopeResolver.resolve(actor);

    // 7. 组装 AuthorizationContext
    const authorization: AuthorizationInfo = {
      roleSet,
      permissionSet,
      organization,
      dataScope,
    };

    return { actor, authorization, issuedAt: new Date() };
  }
}
