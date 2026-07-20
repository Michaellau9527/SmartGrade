/**
 * LeaveRecord — 请假记录
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §1.3.1 + §1.3.1.1
 *
 * ⚠️ v1.2 关键变更：
 * 1. `status` 8 状态（v4.2 冻结）
 * 2. **新增** `leave_reason_type` 6 枚举（v1.1 冻结，必填）
 * 3. `expected_return_time` **仅参考**（不参与自动状态转换）
 * 4. ❌ 禁止字段：no_show_at / expired_at / overdue_at / auto_close_at
 */

import type { LeaveStatus } from './enums/LeaveStatus';
import type { LeaveType } from './enums/LeaveType';
import type { LeaveReasonType } from './enums/LeaveReasonType';

export interface LeaveRecord {
  /** 主键 UUID */
  id: string;

  /** 请假编号（业务编号，例如 LV20260718-0001） */
  leave_no: string;

  /** 学生 ID（FK Student） */
  student_id: string;

  /** 学生姓名（冗余） */
  student_name: string;

  /** 班级 ID（冗余） */
  class_id: string;

  /** 班级名称（冗余） */
  class_name: string;

  /** 年级 ID（冗余） */
  grade_id: string;

  /** 学校 ID（冗余） */
  school_id: string;

  // ===== 请假基本信息 =====

  /** 请假大类 */
  leave_type: LeaveType;

  /** 请假原因分类（v1.1 冻结 - 必填） */
  leave_reason_type: LeaveReasonType;

  /** 请假原因（自由文本 - 必填） */
  reason: string;

  // ===== 时间字段 =====

  /** 实际开始时间（必填） */
  start_at: string;

  /** 请假结束时间（必填） */
  end_at: string;

  /** 预计返校时间（可选，**仅参考**，不参与自动状态转换） */
  expected_return_time?: string;

  /** 预计返校备注 */
  expected_return_note?: string;

  /** 实际离校时间（门卫登记） */
  actual_left_at?: string;

  /** 实际返校时间（班主任确认） */
  actual_returned_at?: string;

  /** 销假时间 */
  closed_at?: string;

  // ===== 状态 =====

  /** 8 状态枚举（v4.2 冻结） */
  status: LeaveStatus;

  // ===== 流程角色 =====

  /** 申请人（班主任）ID */
  applicant_id: string;

  /** 申请人姓名（冗余） */
  applicant_name: string;

  /** 审批人（年级主任）ID */
  approver_id?: string;

  /** 审批人姓名（冗余） */
  approver_name?: string;

  /** 审批意见 */
  approve_remark?: string;

  /** 审批时间 */
  approved_at?: string;

  /** 驳回意见 */
  reject_reason?: string;

  /** 驳回时间 */
  rejected_at?: string;

  /** 取消原因 */
  cancel_reason?: string;

  // ===== 附件 =====

  /** 附件 ID 列表（FK Attachment） */
  attachment_ids: string[];

  // ===== 统计字段（v1.2 新增） =====

  /** 返校判定（销假时计算） */
  return_judgment?: ReturnJudgment;

  // ===== 时间戳 =====

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 返校判定（v1.2 新增 - 由 system 销假时计算） */
export enum ReturnJudgment {
  /** 准时：|actual_returned_at - expected_return_time| <= 24h */
  ON_TIME = 'ON_TIME',
  /** 提前：actual_returned_at < expected_return_time */
  EARLY = 'EARLY',
  /** 延期：actual_returned_at > expected_return_time + 24h */
  DELAYED = 'DELAYED',
  /** 无预计返校时间（病假无固定返校时间） */
  NOT_SET = 'NOT_SET',
}

/** Mock 示例 */
export const LEAVE_RECORD_MOCK: LeaveRecord = {
  id: 'leave_001',
  leave_no: 'LV20260718-0001',
  student_id: 'stu_001',
  student_name: '张三',
  class_id: 'cls_001',
  class_name: '高一11班',
  grade_id: 'grade_001',
  school_id: 'sch_001',
  leave_type: 'SICK' as LeaveType,
  leave_reason_type: 'ILLNESS' as LeaveReasonType,
  reason: '急性肠胃炎，需要回家休息',
  start_at: '2026-09-10T08:30:00+08:00',
  end_at: '2026-09-11T18:00:00+08:00',
  expected_return_time: '2026-09-11T08:00:00+08:00',
  expected_return_note: '病愈即返',
  status: 'DRAFT' as LeaveStatus,
  applicant_id: 'tch_002',
  applicant_name: '刘老师',
  attachment_ids: ['att_001'],
  created_at: '2026-09-10T08:30:00+08:00',
  updated_at: '2026-09-10T08:30:00+08:00',
};
