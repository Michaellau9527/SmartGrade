import { request } from '../utils/request';

/** 请假状态 */
export type LeaveStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'LEFT'
  | 'RETURNED'
  | 'CLOSED';

/** 请假大类 */
export type LeaveType = 'SICK' | 'PERSONAL' | 'OTHER';

/** 请假原因分类 */
export type LeaveReasonType =
  | 'ILLNESS'
  | 'PERSONAL'
  | 'FAMILY'
  | 'SPORT'
  | 'SCHOOL_ACTIVITY'
  | 'OTHER';

/** 请假列表项 */
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

/** 请假详情 */
export interface LeaveDetail extends LeaveListItem {
  expectedReturnTime: string | null;
  actualLeftAt: string | null;
  actualReturnedAt: string | null;
  closedAt: string | null;
  approverId: string | null;
  approverName: string | null;
  approveRemark: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  cancelReason: string | null;
}

/** 查询参数 */
export interface QueryLeaveParams {
  status?: LeaveStatus;
  studentId?: string;
  classId?: string;
}

/**
 * 获取请假列表
 * 接口：GET /leaves
 */
export function getLeaves(params?: QueryLeaveParams): Promise<LeaveListItem[]> {
  return request<LeaveListItem[]>('/leaves', {
    method: 'GET',
    data: params as unknown as Record<string, unknown>
  });
}

/**
 * 获取请假详情
 * 接口：GET /leaves/:id
 */
export function getLeaveDetail(id: string): Promise<LeaveDetail> {
  return request<LeaveDetail>(`/leaves/${id}`, {
    method: 'GET'
  });
}

/**
 * 审批通过
 * 接口：POST /leaves/:id/approve
 */
export function approveLeave(id: string, approveRemark?: string): Promise<LeaveDetail> {
  return request<LeaveDetail>(`/leaves/${id}/approve`, {
    method: 'POST',
    data: { approveRemark }
  });
}

/**
 * 驳回
 * 接口：POST /leaves/:id/reject
 */
export function rejectLeave(id: string, rejectReason: string): Promise<LeaveDetail> {
  return request<LeaveDetail>(`/leaves/${id}/reject`, {
    method: 'POST',
    data: { rejectReason }
  });
}

/**
 * 创建请假（班主任替学生提交）
 * 接口：POST /leaves
 */
export function createLeave(data: {
  studentId: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  expectedReturnTime?: string;
}): Promise<LeaveDetail> {
  return request<LeaveDetail>('/leaves', {
    method: 'POST',
    data
  });
}

/**
 * 确认离校
 * 接口：POST /leaves/:id/confirm-left
 */
export function confirmLeft(id: string): Promise<LeaveDetail> {
  return request<LeaveDetail>(`/leaves/${id}/confirm-left`, {
    method: 'POST'
  });
}

/**
 * 确认返校
 * 接口：POST /leaves/:id/confirm-returned
 */
export function confirmReturned(id: string): Promise<LeaveDetail> {
  return request<LeaveDetail>(`/leaves/${id}/confirm-returned`, {
    method: 'POST'
  });
}
