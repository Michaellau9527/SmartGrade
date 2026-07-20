/**
 * Teacher — 教师
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §7.1（6+2 双体系）
 *
 * Teacher = 所有教职工的统一身份（含班主任 / 任课教师 / 年级主任 / 政教 / 宿管 / 管理员）。
 * 一个 Teacher 可以拥有 0..N 个 Role（如：班主任 + 英语教师 + 年级主任）。
 */

export interface Teacher {
  /** 主键 UUID */
  id: string;

  /** 工号（学校内唯一） */
  teacher_no: string;

  /** 姓名 */
  name: string;

  /** 性别 */
  gender: Gender;

  /** 手机号（用于手机号登录） */
  phone?: string;

  /** 邮箱 */
  email?: string;

  /** 头像 URL */
  avatar?: string;

  /** 教研组（"英语组" / "数学组"） */
  teaching_group?: string;

  /** 学科（"英语" / "数学"） */
  subject?: string;

  /** 职位（"教师" / "年级主任" / "政教主任"） */
  position?: string;

  /** 状态 */
  status: TeacherStatus;

  /** 角色 ID 列表（多对多） */
  role_ids: string[];

  /** 标签 ID 列表（多对多） */
  tag_ids: string[];

  /** 所属组织（学校 / 年级 / 班级，多个） */
  organization_ids: string[];

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 性别 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/** 教师状态 */
export enum TeacherStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  RESIGNED = 'RESIGNED',
}

/** Mock 示例 */
export const TEACHER_MOCK: Teacher = {
  id: 'tch_001',
  teacher_no: 'T2026001',
  name: '王主任',
  gender: Gender.MALE,
  phone: '13800000001',
  email: 'wang@example.com',
  avatar: 'https://cdn.example.com/avatar/tch_001.png',
  teaching_group: '数学组',
  subject: '数学',
  position: '高一年级主任',
  status: TeacherStatus.ACTIVE,
  role_ids: ['role_grade_director', 'role_teacher'],
  tag_ids: ['tag_party_member', 'tag_young'],
  organization_ids: ['sch_001', 'grade_001'],
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
