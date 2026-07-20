import { request } from '@/utils/request';
import type {
  NoticeListResponse,
  NoticeItem,
  NoticeQueryParams,
  CreateNoticeParams,
  UpdateNoticeParams,
  NoticeReadStats,
} from '@/types/notice';

export function getNoticeList(params: NoticeQueryParams): Promise<NoticeListResponse> {
  return request.get('/notices', { params });
}

export function getUnreadNotices(): Promise<NoticeItem[]> {
  return request.get('/notices/unread');
}

export function getNoticeDetail(id: string): Promise<NoticeItem> {
  return request.get(`/notices/${id}`);
}

export function getNoticeReads(id: string): Promise<NoticeReadStats> {
  return request.get(`/notices/${id}/reads`);
}

export function createNotice(data: CreateNoticeParams): Promise<NoticeItem> {
  return request.post('/notices', data);
}

export function updateNotice(id: string, data: UpdateNoticeParams): Promise<NoticeItem> {
  return request.put(`/notices/${id}`, data);
}

export function deleteNotice(id: string): Promise<{ success: boolean }> {
  return request.delete(`/notices/${id}`);
}

export function withdrawNotice(id: string): Promise<NoticeItem> {
  return request.post(`/notices/${id}/withdraw`);
}

export function confirmNotice(id: string): Promise<{ success: boolean; confirmed_at: string }> {
  return request.post(`/notices/${id}/confirm`);
}
