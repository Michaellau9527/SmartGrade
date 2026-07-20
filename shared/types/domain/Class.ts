/**
 * Class — 班级
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 #6
 *
 * 一个年级有多个班级（高一 1班 / 2班 / 3班 ...）。
 * 每个班级有 1 位班主任（head_teacher_id）。
 */

export interface Class {
  /** 主键 UUID */
  id: string;

  /** 所属年级 ID */
  grade_id: string;

  /** 所属学校 ID（冗余，便于查询） */
  school_id: string;

  /** 班级代码（年级内唯一，例如 C2026_11 = 2026 级 11 班） */
  code: string;

  /** 班级名称（"高一11班"） */
  name: string;

  /** 班主任 Teacher.id（FK Teacher） */
  head_teacher_id?: string;

  /** 副班主任（可空） */
  vice_head_teacher_id?: string;

  /** 班级人数（冗余缓存） */
  student_count: number;

  /** 状态 */
  status: ClassStatus;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 班级状态 */
export enum ClassStatus {
  ACTIVE = 'ACTIVE',
  GRADUATED = 'GRADUATED',
  ARCHIVED = 'ARCHIVED',
}

/** Mock 示例 */
export const CLASS_MOCK: Class = {
  id: 'cls_001',
  grade_id: 'grade_001',
  school_id: 'sch_001',
  code: 'C2026_11',
  name: '高一11班',
  head_teacher_id: 'tch_002',
  student_count: 48,
  status: ClassStatus.ACTIVE,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
