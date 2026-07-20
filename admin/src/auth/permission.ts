/**
 * 权限常量
 * 与后端 @RequirePermissions 注解中的权限标识一一对应
 */

// ─── 页面级权限（访问页面） ────────────────────────────
export const PERM = {
  // Dashboard
  DASHBOARD_READ: 'statistics:read',

  // Todo
  TODO_READ: 'todo:read',
  TODO_COMPLETE: 'todo:complete',

  // Leave
  LEAVE_READ: 'leave:read',
  LEAVE_CREATE: 'leave:create',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_UPDATE: 'leave:update',
  LEAVE_FINISH: 'leave:finish',

  // Notice
  NOTICE_READ: 'notice:read',
  NOTICE_CREATE: 'notice:create',
  NOTICE_UPDATE: 'notice:update',
  NOTICE_DELETE: 'notice:delete',

  // Student
  STUDENT_READ: 'student:read',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',

  // Teacher
  TEACHER_READ: 'teacher:read',         // GET 无显式权限，约定为 'teacher:read'
  TEACHER_CREATE: 'teacher:create',
  TEACHER_UPDATE: 'teacher:update',
  TEACHER_DELETE: 'teacher:delete',
  TEACHER_ASSIGN_ROLE: 'teacher:assign-role',
  TEACHER_ASSIGN_TAG: 'teacher:assign-tag',

  // Dorm
  DORM_READ: 'dorm:read',
  DORM_CHECK: 'dorm:check',

  // System
  PERMISSION_CREATE: 'permission:create',
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_DELETE: 'permission:delete',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_ASSIGN_PERMISSION: 'role:assign-permission',
} as const;

/** 所有权限标识类型 */
export type PermissionKey = (typeof PERM)[keyof typeof PERM];
