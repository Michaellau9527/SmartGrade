import { request } from '@/utils/request';
import type {
  LeaveListResponse,
  LeaveItem,
  LeaveQueryParams,
  CreateLeaveParams,
  ApproveLeaveParams,
  RejectLeaveParams,
} from '@/types/leave';

export function getLeaveList(params: LeaveQueryParams): Promise<LeaveListResponse> {
  return request.get('/leaves', { params });
}

export function getLeaveDetail(id: string): Promise<LeaveItem> {
  return request.get(`/leaves/${id}`);
}

export function createLeave(data: CreateLeaveParams): Promise<LeaveItem> {
  return request.post('/leaves', data);
}

export function approveLeave(id: string, data: ApproveLeaveParams): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/approve`, data);
}

export function rejectLeave(id: string, data: RejectLeaveParams): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/reject`, data);
}

export function confirmLeft(id: string): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/confirm-left`);
}

export function finishLeave(id: string): Promise<LeaveItem> {
  return request.post(`/leaves/${id}/finish`);
}
