export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
export type NoticeType = 'ALL' | 'ROLE' | 'TAG' | 'ORGANIZATION';
export type NoticePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface NoticeItem {
  id: string;
  notice_no: string;
  title: string;
  content: string;
  notice_type: NoticeType;
  publisher_teacher_id: number;
  publisher_name: string;
  publish_scope: string;
  priority: NoticePriority;
  need_confirm: boolean;
  status: NoticeStatus;
  publish_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  read_at?: string | null;
  confirm_at?: string | null;
  publisher: {
    id: number;
    name: string;
    teacher_no: string;
  } | null;
  [key: string]: unknown;
}

export interface NoticeQueryParams {
  page?: number;
  pageSize?: number;
  status?: NoticeStatus;
  noticeType?: NoticeType;
  priority?: NoticePriority;
  unread?: boolean;
}

export interface NoticeListResponse {
  list: NoticeItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateNoticeParams {
  title: string;
  content: string;
  noticeType: NoticeType;
  publishScope: string;
  priority?: NoticePriority;
  needConfirm?: boolean;
  expiredAt?: string;
}

export interface UpdateNoticeParams {
  title?: string;
  content?: string;
  priority?: NoticePriority;
  expiredAt?: string;
}

export interface NoticeReadItem {
  id: string;
  notice_id: number;
  teacher_id: number;
  is_read: boolean;
  read_at: string | null;
  confirm_at: string | null;
  created_at: string;
  teacher: {
    id: number;
    name: string;
    teacher_no: string;
    department: string | null;
  } | null;
}

export interface NoticeReadStats {
  notice_id: number;
  notice_no: string;
  title: string;
  total_receivers: number;
  read_count: number;
  unread_count: number;
  confirmed_count: number;
  read_rate: number;
  reads: NoticeReadItem[];
}
