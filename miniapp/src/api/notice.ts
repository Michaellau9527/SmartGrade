import { request } from '../utils/request';

/** 通知类型 */
export type NoticeType = 'NOTICE' | 'URGENT' | 'MEETING' | 'HOLIDAY' | 'TEACHING';

/** 通知状态 */
export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** 通知列表项 */
export interface NoticeListItem {
  id: string;
  noticeNo: string;
  title: string;
  noticeType: NoticeType;
  status: NoticeStatus;
  publisherName: string;
  publishedAt: string | null;
  requireConfirm: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
}

/** 通知详情 */
export interface NoticeDetail extends NoticeListItem {
  content: string;
  contentFormat: string;
  confirmDeadline: string | null;
  readAt: string | null;
  confirmedAt: string | null;
}

/**
 * 获取通知列表
 * 接口：GET /notices
 */
export function getNotices(): Promise<NoticeListItem[]> {
  return request<NoticeListItem[]>('/notices', {
    method: 'GET'
  });
}

/**
 * 获取通知详情
 * 接口：GET /notices/:id
 */
export function getNoticeDetail(id: string): Promise<NoticeDetail> {
  return request<NoticeDetail>(`/notices/${id}`, {
    method: 'GET'
  });
}

/**
 * 标记已读
 * 接口：POST /notices/:id/read
 */
export function markNoticeRead(id: string): Promise<void> {
  return request<void>(`/notices/${id}/read`, {
    method: 'POST'
  });
}

/**
 * 确认阅读
 * 接口：POST /notices/:id/acknowledge
 */
export function acknowledgeNotice(id: string): Promise<void> {
  return request<void>(`/notices/${id}/acknowledge`, {
    method: 'POST'
  });
}
