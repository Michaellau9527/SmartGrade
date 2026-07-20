/**
 * 角色定义与权限矩阵
 * 5 个角色：超级管理员 / 年级主任 / 班主任 / 宿管 / 普通教师
 */

import { PERM } from './permission';

// ─── 角色标识 ─────────────────────────────────────────
export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  GRADE_ADMIN: 'GRADE_ADMIN',
  HEAD_TEACHER: 'HEAD_TEACHER',
  DORM_ADMIN: 'DORM_ADMIN',
  TEACHER: 'TEACHER',
} as const;

export type RoleKey = (typeof ROLE)[keyof typeof ROLE];

// ─── 角色元数据（中文显示名 + 描述） ──────────────────
export const ROLE_META: Record<RoleKey, { label: string; description: string }> = {
  [ROLE.SUPER_ADMIN]: { label: '超级管理员', description: '拥有所有权限' },
  [ROLE.GRADE_ADMIN]: { label: '年级主任', description: '管理本年级数据和教师' },
  [ROLE.HEAD_TEACHER]: { label: '班主任', description: '管理本班学生和请假审批' },
  [ROLE.DORM_ADMIN]: { label: '宿管老师', description: '管理住宿学生和宿舍信息' },
  [ROLE.TEACHER]: { label: '普通教师', description: '查看自己相关的数据' },
};

// ─── 权限矩阵 ─────────────────────────────────────────
// 规则：未列出的权限默认不授予
const ALL_PERMISSIONS = Object.values(PERM);

/** 角色权限映射 */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly string[]> = {
  // 超管：全部权限
  [ROLE.SUPER_ADMIN]: ALL_PERMISSIONS,

  // 年级主任：Dashboard + Todo + Notice(全部) + Leave(全部) + Student(全部) + Teacher(查看) + Dorm(查看)
  [ROLE.GRADE_ADMIN]: [
    PERM.DASHBOARD_READ,
    PERM.TODO_READ, PERM.TODO_COMPLETE,
    PERM.NOTICE_READ, PERM.NOTICE_CREATE, PERM.NOTICE_UPDATE, PERM.NOTICE_DELETE,
    PERM.LEAVE_READ, PERM.LEAVE_CREATE, PERM.LEAVE_APPROVE, PERM.LEAVE_UPDATE, PERM.LEAVE_FINISH,
    PERM.STUDENT_READ, PERM.STUDENT_CREATE, PERM.STUDENT_UPDATE, PERM.STUDENT_DELETE,
    PERM.TEACHER_READ,
    PERM.DORM_READ,
  ],

  // 班主任：Dashboard + Todo + Notice(查看) + Leave(全部) + Student(全部)
  [ROLE.HEAD_TEACHER]: [
    PERM.DASHBOARD_READ,
    PERM.TODO_READ, PERM.TODO_COMPLETE,
    PERM.NOTICE_READ,
    PERM.LEAVE_READ, PERM.LEAVE_CREATE, PERM.LEAVE_APPROVE, PERM.LEAVE_UPDATE, PERM.LEAVE_FINISH,
    PERM.STUDENT_READ, PERM.STUDENT_CREATE, PERM.STUDENT_UPDATE, PERM.STUDENT_DELETE,
  ],

  // 宿管：Dashboard + Todo + Leave(查看) + Student(查看) + Dorm(全部)
  [ROLE.DORM_ADMIN]: [
    PERM.DASHBOARD_READ,
    PERM.TODO_READ, PERM.TODO_COMPLETE,
    PERM.LEAVE_READ,
    PERM.STUDENT_READ, PERM.STUDENT_UPDATE,
    PERM.DORM_READ, PERM.DORM_CHECK,
  ],

  // 普通教师：Dashboard + Todo + Notice(查看) + Leave(查看+创建) + Student(查看)
  [ROLE.TEACHER]: [
    PERM.DASHBOARD_READ,
    PERM.TODO_READ, PERM.TODO_COMPLETE,
    PERM.NOTICE_READ,
    PERM.LEAVE_READ, PERM.LEAVE_CREATE,
    PERM.STUDENT_READ,
  ],
};

// ─── 数据范围映射 ─────────────────────────────────────
export const ROLE_DATA_SCOPE: Record<RoleKey, { type: string; description: string }> = {
  [ROLE.SUPER_ADMIN]: { type: 'ALL', description: '所有数据' },
  [ROLE.GRADE_ADMIN]: { type: 'GRADE', description: '本年级数据' },
  [ROLE.HEAD_TEACHER]: { type: 'CLASS', description: '本班数据' },
  [ROLE.DORM_ADMIN]: { type: 'DORM', description: '住宿生数据' },
  [ROLE.TEACHER]: { type: 'SELF', description: '仅自己相关的数据' },
};

// ─── 菜单权限映射 ────────────────────────────────────
// 每个菜单项对应的最低访问权限
export const MENU_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': [PERM.DASHBOARD_READ],
  '/todo': [PERM.TODO_READ],
  '/notice': [PERM.NOTICE_READ],
  '/leave': [PERM.LEAVE_READ],
  '/student': [PERM.STUDENT_READ],
  '/teacher': [PERM.TEACHER_READ],
  '/document': [PERM.DASHBOARD_READ], // 文件管理暂用 dashboard 权限
  '/config': [PERM.ROLE_CREATE],      // 系统配置仅超管
};
