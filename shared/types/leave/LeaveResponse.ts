/**
 * LeaveResponse — 请假响应类型（跨端共享）
 *
 * 上游规则：Sprint 2.2 C02 — 刘老师拍板
 *
 * 设计原则：
 * - 围绕"请假生命周期"设计，不是 CRUD
 * - 所有端（小程序 / Admin / Web）统一引用此类型
 * - Controller 不自己写 interface，统一从这里 import
 *
 * Sprint 2.2 C02 冻结
 */

import type { LeaveStatus } from '../domain/enums/LeaveStatus';
import type { LeaveType } from '../domain/enums/LeaveType';
import type { LeaveReasonType } from '../domain/enums/LeaveReasonType';

// ============================================================
// LeaveResponse — 请假详情
// ============================================================

/** GET /leaves/:id 响应 */
export interface LeaveResponse {
  /** 请假 ID */
  id: string;

  /** 请假编号 */
  leaveNo: string;

  /** 状态（PENDING / APPROVED / LEFT / RETURNED / CLOSED / REJECTED / CANCELLED） */
  status: LeaveStatus;

  // ===== 学生信息 =====

  /** 学生 ID */
  studentId: string;
  /** 学生姓名 */
  studentName: string;
  /** 班级 ID */
  classId: string;
  /** 班级名称 */
  className: string;

  // ===== 请假信息 =====

  /** 请假大类 */
  leaveType: LeaveType;
  /** 请假原因分类 */
  leaveReasonType: LeaveReasonType;
  /** 请假原因 */
  reason: string;

  // ===== 时间 =====

  /** 开始时间（ISO 8601） */
  startAt: string;
  /** 结束时间（ISO 8601） */
  endAt: string;
  /** 预计返校时间（可选，仅参考） */
  expectedReturnTime: string | null;

  /** 实际离校时间 */
  actualLeftAt: string | null;
  /** 实际返校时间 */
  actualReturnedAt: string | null;
  /** 销假时间 */
  closedAt: string | null;

  // ===== 流程角色 =====

  /** 申请人 ID */
  applicantId: string;
  /** 申请人姓名 */
  applicantName: string;
  /** 审批人 ID */
  approverId: string | null;
  /** 审批人姓名 */
  approverName: string | null;
  /** 审批意见 */
  approveRemark: string | null;
  /** 审批时间 */
  approvedAt: string | null;
  /** 驳回原因 */
  rejectReason: string | null;
  /** 取消原因 */
  cancelReason: string | null;

  // ===== Timeline =====

  /** 该请假关联的 Timeline 事件 */
  timeline: LeaveTimelineEvent[];

  // ===== 时间戳 =====

  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ============================================================
// LeaveListItem — 请假列表项（精简版）
// ============================================================

/** GET /leaves 列表项 */
export interface LeaveListItem {
  id: string;
  leaveNo: string;
  status: LeaveStatus;
  studentId: string;
  studentName: string;
  className: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  applicantName: string;
  createdAt: string;
}

// ============================================================
// LeaveTimelineEvent — 请假关联的 Timeline 事件
// ============================================================

/** 请假详情中的 Timeline 事件 */
export interface LeaveTimelineEvent {
  /** 事件 ID */
  id: string;
  /** 事件类型（LEAVE_CREATED / LEAVE_APPROVED / ...） */
  eventType: string;
  /** 操作人 ID */
  operatorId: string | null;
  /** 操作人姓名 */
  operatorName: string | null;
  /** 操作人角色 */
  operatorRole: string | null;
  /** 发生时间（ISO 8601） */
  occurredAt: string;
  /** 事件元数据（AI 友好） */
  metadata: Record<string, any>;
}

// ============================================================
// DTO 类型（请求体）
// ============================================================

/** POST /leaves 创建请假 */
export interface CreateLeaveRequest {
  studentId: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  expectedReturnTime?: string;
  expectedReturnNote?: string;
}

/** POST /leaves/:id/approve 审批通过 */
export interface ApproveLeaveRequest {
  approveRemark?: string;
}

/** POST /leaves/:id/reject 驳回 */
export interface RejectLeaveRequest {
  rejectReason: string;
}

/** POST /leaves/:id/cancel 取消 */
export interface CancelLeaveRequest {
  cancelReason?: string;
}

/** GET /leaves 查询参数 */
export interface QueryLeavesParams {
  status?: LeaveStatus;
  studentId?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}
