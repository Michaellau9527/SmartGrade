/**
 * Grade — 年级
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 #6
 *
 * 一个学校有多个年级（高一 / 高二 / 高三）。
 * 每个年级由一位「年级主任 Grade Director」管理。
 */

export interface Grade {
  /** 主键 UUID */
  id: string;

  /** 所属学校 ID */
  school_id: string;

  /** 年级代码（学校内唯一，例如 G2026_1 = 2026 级高一） */
  code: string;

  /** 年级名称（"高一年级"） */
  name: string;

  /** 入学年份（用于排序） */
  enrollment_year: number;

  /** 毕业年份 */
  graduation_year: number;

  /** 当前阶段 */
  stage: GradeStage;

  /** 年级主任 Teacher.id（FK Teacher） */
  director_id?: string;

  /** 状态 */
  status: GradeStatus;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 年级阶段 */
export enum GradeStage {
  /** 高一在读 */
  GRADE_10 = 'GRADE_10',
  /** 高二在读 */
  GRADE_11 = 'GRADE_11',
  /** 高三在读 */
  GRADE_12 = 'GRADE_12',
  /** 已毕业 */
  GRADUATED = 'GRADUATED',
}

/** 年级状态 */
export enum GradeStatus {
  ACTIVE = 'ACTIVE',
  GRADUATED = 'GRADUATED',
  ARCHIVED = 'ARCHIVED',
}

/** Mock 示例 */
export const GRADE_MOCK: Grade = {
  id: 'grade_001',
  school_id: 'sch_001',
  code: 'G2026_1',
  name: '高一年级',
  enrollment_year: 2026,
  graduation_year: 2029,
  stage: GradeStage.GRADE_10,
  director_id: 'tch_001',
  status: GradeStatus.ACTIVE,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
