/**
 * RolePermissionMap — 角色权限映射
 *
 * 上游规则：docs/10-Permission.md §16 权限矩阵 + Sprint 2.1 Day 5.1/5.2 刘老师拍板
 *
 * 设计原则：
 * - 不导出 Map 本身，只导出 getPermissions(role) 函数
 * - 外部拿不到 Map 引用，不存在误修改问题
 * - 返回 ReadonlySet<PermissionCode>，编译时即不可变
 * - 多角色合并时：getPermissions(role).forEach(p => allPerms.add(p))
 *
 * 冻结状态：Sprint 2 v1.0 冻结
 */

import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

// ============================================================
// 按角色定义的权限集合（模块私有，不导出）
// ============================================================

/** 系统管理员 — 全部权限 */
const ADMIN_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.NOTICE_PUBLISH,
  PermissionCode.NOTICE_DELETE,
  PermissionCode.FILE_READ,
  PermissionCode.FILE_PUBLISH,
  PermissionCode.TASK_READ,
  PermissionCode.TASK_ASSIGN,
  PermissionCode.TASK_COMPLETE,
  PermissionCode.TASK_DELETE,
  PermissionCode.STUDENT_READ,
  PermissionCode.LEAVE_CREATE,
  PermissionCode.LEAVE_READ,
  PermissionCode.LEAVE_UPDATE,
  PermissionCode.LEAVE_APPROVE,
  PermissionCode.LEAVE_CLOSE,
  PermissionCode.LEAVE_CANCEL,
  PermissionCode.INCIDENT_CREATE,
  PermissionCode.INCIDENT_READ,
  PermissionCode.INCIDENT_HANDLE,
  PermissionCode.INCIDENT_CLOSE,
  PermissionCode.DORM_READ,
  PermissionCode.DORM_CHECK,
  PermissionCode.DORM_REPORT,
  PermissionCode.STATISTICS_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
  PermissionCode.SYSTEM_ADMIN,
]);

/** 年级主任 */
const GRADE_DIRECTOR_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.NOTICE_PUBLISH,
  PermissionCode.FILE_READ,
  PermissionCode.FILE_PUBLISH,
  PermissionCode.TASK_READ,
  PermissionCode.TASK_ASSIGN,
  PermissionCode.STUDENT_READ,
  PermissionCode.LEAVE_READ,
  PermissionCode.INCIDENT_READ,
  PermissionCode.DORM_READ,
  PermissionCode.STATISTICS_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 政教 */
const POLITICAL_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.FILE_READ,
  PermissionCode.TASK_READ,
  PermissionCode.STUDENT_READ,
  PermissionCode.LEAVE_READ,
  PermissionCode.LEAVE_APPROVE,
  PermissionCode.INCIDENT_CREATE,
  PermissionCode.INCIDENT_READ,
  PermissionCode.INCIDENT_HANDLE,
  PermissionCode.DORM_READ,
  PermissionCode.STATISTICS_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 班主任 */
const HEADMASTER_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.FILE_READ,
  PermissionCode.TASK_READ,
  PermissionCode.TASK_COMPLETE,
  PermissionCode.STUDENT_READ,
  PermissionCode.LEAVE_CREATE,
  PermissionCode.LEAVE_READ,
  PermissionCode.LEAVE_UPDATE,
  PermissionCode.LEAVE_CLOSE,
  PermissionCode.LEAVE_CANCEL,
  PermissionCode.INCIDENT_READ,
  PermissionCode.DORM_READ,
  PermissionCode.STATISTICS_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 任课教师 */
const SUBJECT_TEACHER_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.FILE_READ,
  PermissionCode.TASK_READ,
  PermissionCode.TASK_COMPLETE,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 宿管 */
const DORM_MANAGER_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.FILE_READ,
  PermissionCode.TASK_READ,
  PermissionCode.TASK_COMPLETE,
  PermissionCode.STUDENT_READ,
  PermissionCode.LEAVE_READ,
  PermissionCode.INCIDENT_CREATE,
  PermissionCode.INCIDENT_READ,
  PermissionCode.DORM_READ,
  PermissionCode.DORM_CHECK,
  PermissionCode.DORM_REPORT,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 家长 */
const PARENT_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.LEAVE_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

/** 学生 */
const STUDENT_PERMS = new Set<PermissionCode>([
  PermissionCode.WORKBENCH_VIEW,
  PermissionCode.NOTICE_READ,
  PermissionCode.LEAVE_READ,
  PermissionCode.USER_PROFILE_READ,
  PermissionCode.USER_PROFILE_UPDATE,
]);

// ============================================================
// 内部 Map（不导出）
// ============================================================

const ROLE_PERMISSION_MAP = new Map<RoleCode, ReadonlySet<PermissionCode>>([
  [RoleCode.ROLE_ADMIN, ADMIN_PERMS],
  [RoleCode.ROLE_GRADE_DIRECTOR, GRADE_DIRECTOR_PERMS],
  [RoleCode.ROLE_POLITICAL, POLITICAL_PERMS],
  [RoleCode.ROLE_HEADMASTER, HEADMASTER_PERMS],
  [RoleCode.ROLE_SUBJECT_TEACHER, SUBJECT_TEACHER_PERMS],
  [RoleCode.ROLE_DORM_MANAGER, DORM_MANAGER_PERMS],
  [RoleCode.ROLE_PARENT, PARENT_PERMS],
  [RoleCode.ROLE_STUDENT, STUDENT_PERMS],
]);

const EMPTY_SET: ReadonlySet<PermissionCode> = new Set<PermissionCode>();

// ============================================================
// 公开 API：只暴露查询函数，不暴露 Map
// ============================================================

/**
 * 获取指定角色的权限集合
 *
 * 使用方式：
 *   const perms = getPermissions(RoleCode.ROLE_HEADMASTER);
 *   if (perms.has(PermissionCode.LEAVE_APPROVE)) { ... }
 *
 * 多角色合并：
 *   const allPerms = new Set<PermissionCode>();
 *   roles.forEach(r => getPermissions(r).forEach(p => allPerms.add(p)));
 */
export function getPermissions(role: RoleCode): ReadonlySet<PermissionCode> {
  return ROLE_PERMISSION_MAP.get(role) ?? EMPTY_SET;
}
