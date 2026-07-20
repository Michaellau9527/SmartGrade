/**
 * Student — 学生
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §2.5（双维度模型）+ §9.1 #6
 *
 * ⚠️ v1.2 关键变更：
 * 1. `current_status` 从 v1.1 的 6 状态缩为 4 状态
 *    （ON_CAMPUS / OUT_OF_SCHOOL / GRADUATED / TRANSFERRED）
 * 2. **新增** `current_location`（6 位置：CLASSROOM / DORM / PLAYGROUND / GATE / OFF_CAMPUS / UNKNOWN）
 * 3. ❌ 禁止让 Leave / Dorm 模块直接修改这两个字段
 *    ✅ 必须通过 Timeline 事件 → StudentStatusLocationResolver 触发
 */

import type { StudentStatus } from './enums/StudentStatus';
import type { StudentLocation } from './enums/StudentLocation';

export interface Student {
  /** 主键 UUID */
  id: string;

  /** 学号（学校内唯一） */
  student_no: string;

  /** 姓名 */
  name: string;

  /** 性别 */
  gender: 'MALE' | 'FEMALE' | 'OTHER';

  /** 所属班级 ID（FK Class） */
  class_id: string;

  /** 所属年级 ID（冗余，便于查询） */
  grade_id: string;

  /** 所属学校 ID（冗余，便于查询） */
  school_id: string;

  /** 住宿类型 */
  boarding_type: BoardingType;

  /** 宿舍 ID（仅住宿生） */
  dorm_id?: string;

  /** 床位号 */
  bed_no?: string;

  // ===== v1.2 双维度状态（核心字段）=====

  /** 在校状态（4 状态）- 业务事件驱动 */
  current_status: StudentStatus;

  /** 当前位置（6 位置）- 业务事件驱动 */
  current_location: StudentLocation;

  // ===== 联系信息 =====

  /** 学生本人手机号（高中生通常没有） */
  phone?: string;

  // ===== 家长关联 =====

  /** 家长 ID 列表（FK Parent，可多个：父母双方） */
  parent_ids: string[];

  // ===== 时间戳 =====

  /** 入学时间 */
  enrolled_at: string;

  /** 毕业时间（未毕业为空） */
  graduated_at?: string;

  /** 转学时间（未转学为空） */
  transferred_at?: string;

  /** 状态最后更新时间（用于缓存失效） */
  status_updated_at: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 住宿类型 */
export enum BoardingType {
  /** 走读生 */
  DAY_STUDENT = 'DAY_STUDENT',
  /** 住宿生 */
  BOARDING = 'BOARDING',
}

/** Mock 示例 */
export const STUDENT_MOCK: Student = {
  id: 'stu_001',
  student_no: 'S20260001',
  name: '张三',
  gender: 'MALE',
  class_id: 'cls_001',
  grade_id: 'grade_001',
  school_id: 'sch_001',
  boarding_type: BoardingType.BOARDING,
  dorm_id: 'dorm_room_001',
  bed_no: 'A-12',
  current_status: 'ON_CAMPUS' as StudentStatus,
  current_location: 'CLASSROOM' as StudentLocation,
  parent_ids: ['par_001', 'par_002'],
  enrolled_at: '2026-09-01T00:00:00+08:00',
  status_updated_at: '2026-09-01T08:00:00+08:00',
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
