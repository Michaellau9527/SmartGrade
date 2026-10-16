import { request } from '@/utils/request';
import type {
  LeaveListResponse,
  LeaveItem,
  LeaveQueryParams,
  CreateLeaveParams,
  ApproveLeaveParams,
  RejectLeaveParams,
} from '@/types/leave';

/** GET /leaves — 请假列表（分页结构 {list,total,page,pageSize}，支持 status/leaveType 筛选） */
export function getLeaveList(params: LeaveQueryParams): Promise<LeaveListResponse> {
  return request.get('/leaves', { params });
}

/** GET /leaves/:id — 请假详情（含 Timeline） */
export function getLeaveDetail(id: string): Promise<LeaveItem> {
  return request.get(`/leaves/${id}`);
}

/** POST /leaves — 创建请假（PENDING） */
export function createLeave(data: CreateLeaveParams): Promise<LeaveItem> {
  return request.post('/leaves', data);
}

/** POST /leaves/:id/approve — 审批通过（PENDING → APPROVED） */
export function approveLeave(id: string, data: ApproveLeaveParams): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/approve`, data);
}

/** POST /leaves/:id/reject — 驳回（PENDING → REJECTED） */
export function rejectLeave(id: string, data: RejectLeaveParams): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/reject`, data);
}

/** POST /leaves/:id/confirm-left — 确认离校（APPROVED → LEFT） */
export function confirmLeft(id: string): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/confirm-left`);
}

/** POST /leaves/:id/confirm-returned — 确认返校（LEFT → RETURNED） */
export function confirmReturned(id: string): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/confirm-returned`);
}

/** POST /leaves/:id/close — 销假完成（RETURNED → CLOSED；原 finish 路由不存在，已对齐后端） */
export function closeLeave(id: string): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/close`);
}

/** POST /leaves/:id/cancel — 取消请假（PENDING → CANCELLED） */
export function cancelLeave(id: string, data: { cancelReason?: string } = {}): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/cancel`, data);
}
