/**
 * User — 系统账户
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §7（6+2 双体系角色）
 *
 * ⚠️ v4.1 重要变更：User 表**不直接**保存微信 OpenID。
 * 微信相关身份在 UserIdentity 表中管理。
 *
 * 6+2 体系：
 * - 管理端 RBAC 6 角色：SYSTEM_ADMIN / GRADE_DIRECTOR / DISCIPLINE_TEACHER /
 *                          HEAD_TEACHER / DORM_MANAGER / TEACHER
 * - 用户端能力位 2 个：STUDENT / PARENT
 */

import type { UserType } from './enums/UserType';

export interface User {
  /** 主键 UUID */
  id: string;

  /** 用户名（仅教师账户，登录用） */
  username?: string;

  /** 密码哈希（仅教师账户，手机号登录可不填） */
  password_hash?: string;

  /** 关联的教师 ID（教师账户 FK Teacher） */
  teacher_id?: string;

  /** 关联的学生 ID（学生账户 FK Student） */
  student_id?: string;

  /** 关联的家长 ID（家长账户 FK Parent） */
  parent_id?: string;

  /** 用户类型（决定登录入口） */
  user_type: UserType;

  /** 状态 */
  status: UserStatus;

  /** 最后登录时间 */
  last_login_at?: string;

  /** 最后登录 IP */
  last_login_ip?: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 用户状态 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  LOCKED = 'LOCKED',
}

/** Mock 示例 */
export const USER_TEACHER_MOCK: User = {
  id: 'usr_001',
  username: 'tch_001',
  teacher_id: 'tch_001',
  user_type: 'TEACHER' as UserType,
  status: UserStatus.ACTIVE,
  last_login_at: '2026-07-18T08:00:00+08:00',
  last_login_ip: '10.0.0.1',
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-18T08:00:00+08:00',
};
