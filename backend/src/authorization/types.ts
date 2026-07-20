/**
 * Authorization 类型定义
 *
 * 上游规则：AUTHORIZATION_CONTEXT_v1.md + Sprint 2.1 Day 5.1/5.2 刘老师拍板
 *
 * 组合设计：
 * - CurrentActor（操作者）— Timeline / AuditLog / OperationLog 用它
 * - AuthorizationInfo（授权信息）— 能力 + 组织 + 数据范围
 * - AuthorizationContext = { actor, authorization, issuedAt }
 *
 * v1.1 变更（Day 5.2）：
 * - AuthorizationContext 新增 issuedAt（用于判断 Context 是否过期）
 */

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

// ============================================================
// CurrentActor — 当前操作者
// ============================================================

/**
 * CurrentActor — 当前操作者
 *
 * 用途：
 * - TimelineEvent.operatorId / operatorType
 * - OperationLog.actor
 * - AuditLog.who
 *
 * 以后任何需要"谁"的地方，传 CurrentActor，不散传 userId + teacherId + parentId。
 */
export interface CurrentActor {
  /** User.id（必填） */
  userId: string;

  /** 业务身份 ID（按 userType 只有一个非 null） */
  teacherId: string | null;
  parentId: string | null;

  /** User.userType */
  userType: 'SYSTEM_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
}

// ============================================================
// DataScope — 数据范围
// ============================================================

/**
 * DataScope — 数据范围（Day 5.3 产出）
 *
 * 所有涉及"查哪些行"的 Repository 方法都依赖它。
 */
export interface DataScope {
  /** 可管理的班级 ID 列表（核心） */
  classIds: string[];

  /** 可管理的年级 ID 列表（年级主任） */
  gradeIds: string[];

  /** 是否可看全校（校长 / 管理员） */
  isSchoolWide: boolean;

  /** 是否仅限个人（家长只看自己孩子） */
  isParentScoped: boolean;

  /** 权限算法版本号（初始 = 1，升级时 +1） */
  version: number;
}

// ============================================================
// AuthorizationInfo — 授权信息
// ============================================================

/**
 * AuthorizationInfo — 授权信息（能力 + 组织 + 数据范围）
 *
 * Day 5.1 RBAC 产出 roleSet + permissionSet
 * Day 5.2 Organization 产出 organization
 * Day 5.3 DataScope Resolver 产出 dataScope
 */
export interface AuthorizationInfo {
  /** 角色集合（Set，O(1) 查询） */
  roleSet: Set<RoleCode>;

  /** 能力集合（Set，O(1) 查询） */
  permissionSet: Set<PermissionCode>;

  /** 当前组织 */
  organization: {
    /** 当前学校 ID */
    schoolId: string;
    /** 当前年级 ID 列表 */
    gradeIds: string[];
    /** 当前班级 ID 列表 */
    classIds: string[];
  };

  /** 数据范围 */
  dataScope: DataScope;
}

// ============================================================
// AuthorizationContext — 授权上下文（组合对象）
// ============================================================

/**
 * AuthorizationContext — 授权上下文（Sprint 2 核心对象）
 *
 * 任何 Service 拿到 ctx 就拥有完整的：
 * - 我是谁（actor）
 * - 我能做什么（authorization）
 * - 什么时候解析的（issuedAt）
 *
 * Sprint 2.2 起所有业务模块都依赖它。
 */
export interface AuthorizationContext {
  /** 当前操作者 */
  actor: CurrentActor;

  /** 授权信息（能力 + 组织 + 数据范围） */
  authorization: AuthorizationInfo;

  /** 解析时间戳（用于判断 Context 是否过期，如缓存 5 分钟场景） */
  issuedAt: Date;
}
