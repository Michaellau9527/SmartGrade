/**
 * UserType — 用户类型枚举
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §7.1
 *
 * 决定：
 * - 登录入口（小程序 / 管理后台 / PC）
 * - 权限模型（管理端 RBAC / 用户端能力位）
 * - 数据范围（DataScope）
 */

export type UserType =
  /** 系统管理员（管理后台） */
  | 'SYSTEM_ADMIN'
  /** 教师（管理后台 + 小程序） */
  | 'TEACHER'
  /** 学生（仅小程序） */
  | 'STUDENT'
  /** 家长（仅小程序） */
  | 'PARENT';

/** 用户类型显示文本 */
export const UserTypeText: Record<UserType, string> = {
  SYSTEM_ADMIN: '系统管理员',
  TEACHER: '教师',
  STUDENT: '学生',
  PARENT: '家长',
};

/** 用户类型 → 登录入口 */
export const UserTypeLoginEntry: Record<UserType, 'ADMIN_WEB' | 'MINIAPP'> = {
  SYSTEM_ADMIN: 'ADMIN_WEB',
  TEACHER: 'ADMIN_WEB',
  STUDENT: 'MINIAPP',
  PARENT: 'MINIAPP',
};
