/**
 * Parent — 家长
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §6.4
 *
 * 家长端定位：仅接收通知、查看孩子状态、确认重要信息、查看离校记录。
 * ❌ 不开放：请假申请 / 聊天 / 家长圈 / 成绩。
 *
 * 一个家长（家长实体）可关联多个学生（多对多：父母+多子女 / 重组家庭）。
 */

export interface Parent {
  /** 主键 UUID */
  id: string;

  /** 姓名 */
  name: string;

  /** 与学生的关系 */
  relation: ParentRelation;

  /** 手机号（**唯一**，用于登录） */
  phone: string;

  /** 微信号（可选，微信登录用） */
  wechat_openid?: string;

  /** UnionID（跨小程序用） */
  wechat_unionid?: string;

  /** 邮箱（可选） */
  email?: string;

  /** 头像 */
  avatar?: string;

  /** 状态 */
  status: ParentStatus;

  /** 关联的学生 ID 列表（FK Student） */
  student_ids: string[];

  /** 通知接收偏好 */
  notify_preference: NotifyPreference;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 家长与学生关系 */
export enum ParentRelation {
  FATHER = 'FATHER',               // 父亲
  MOTHER = 'MOTHER',               // 母亲
  GRANDFATHER = 'GRANDFATHER',     // 祖父/外祖父
  GRANDMOTHER = 'GRANDMOTHER',     // 祖母/外祖母
  GUARDIAN = 'GUARDIAN',           // 监护人
  OTHER = 'OTHER',
}

/** 家长状态 */
export enum ParentStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',         // 冻结
}

/** 通知接收偏好 */
export enum NotifyPreference {
  /** 全部接收 */
  ALL = 'ALL',
  /** 仅重要 */
  IMPORTANT_ONLY = 'IMPORTANT_ONLY',
  /** 仅请假相关 */
  LEAVE_ONLY = 'LEAVE_ONLY',
  /** 不接收 */
  NONE = 'NONE',
}

/** Mock 示例 */
export const PARENT_MOCK: Parent = {
  id: 'par_001',
  name: '李梅',
  relation: ParentRelation.MOTHER,
  phone: '13900000001',
  wechat_openid: 'oxxx_001',
  email: 'limei@example.com',
  status: ParentStatus.ACTIVE,
  student_ids: ['stu_001'],
  notify_preference: NotifyPreference.ALL,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
