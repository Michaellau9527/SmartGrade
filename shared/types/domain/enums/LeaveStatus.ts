/**
 * LeaveStatus — 请假状态（8 状态 - v4.2 冻结）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §1.2
 *
 * 永久冻结：8 状态。
 *
 * ⚠️ v4.1 → v4.2 变更：
 * - 删除 `NO_SHOW`（"已批准未到"，企业考勤思维）
 * - 删除 `EXPIRED`（"已过期"，高中请假无过期概念）
 * - 删除 `OVERDUE`（"已逾期"，返校由人确认）
 *
 * 状态机：
 *   DRAFT → PENDING → APPROVED → LEFT → RETURNED → CLOSED
 *                  ↓                ↓
 *                REJECTED         CANCELLED
 */
export type LeaveStatus =
  | 'DRAFT'         // 草稿
  | 'PENDING'       // 待审批
  | 'APPROVED'      // 已批准
  | 'REJECTED'      // 已驳回
  | 'CANCELLED'     // 已取消
  | 'LEFT'          // 已离校
  | 'RETURNED'      // 已返校
  | 'CLOSED';       // 已销假

/** 永久黑名单（禁止使用的旧枚举） */
// - NO_SHOW
// - EXPIRED
// - OVERDUE
// - FINISHED （Sprint 1 旧定义，已被 CLOSED 替代）
// - LATE_RETURN

export const LeaveStatusText: Record<LeaveStatus, string> = {
  DRAFT: '草稿',
  PENDING: '待审批',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
  LEFT: '已离校',
  RETURNED: '已返校',
  CLOSED: '已销假',
};

export const LeaveStatusColor: Record<LeaveStatus, string> = {
  DRAFT: 'default',
  PENDING: 'gold',
  APPROVED: 'blue',
  REJECTED: 'red',
  CANCELLED: 'default',
  LEFT: 'orange',
  RETURNED: 'cyan',
  CLOSED: 'green',
};
