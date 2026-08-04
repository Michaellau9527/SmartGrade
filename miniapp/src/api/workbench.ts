import { request } from '../utils/request';

export interface WorkbenchToday {
  date: string;
  week: string;
  semesterWeek: number;
  isSchoolDay: boolean;
}

export type TodoType =
  | 'LEAVE_APPROVE'
  | 'TASK_COMPLETE'
  | 'DORM_CHECK'
  | 'INCIDENT_HANDLE'
  | 'OTHER';

export type TodoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TodoSourceType = 'LEAVE' | 'TASK' | 'DORM' | 'INCIDENT' | 'NOTICE' | 'OTHER';

export interface WorkbenchTodo {
  id: string;
  title: string;
  type: TodoType;
  status: TodoStatus;
  dueAt: string | null;
  sourceType: TodoSourceType | null;
  sourceId: string | null;
}

export interface StudentStatusSummary {
  totalStudents: number;
  onCampus: number;
  outOfSchool: number;
  studentsLeaving: number;
  overdueReturn: number;
  dormAbnormal: number;
}

export type NoticeType = 'NOTICE' | 'URGENT' | 'MEETING' | 'HOLIDAY' | 'TEACHING';

export interface WorkbenchNotice {
  id: string;
  title: string;
  noticeType: NoticeType;
  publishedAt: string;
  isRead: boolean;
}

export interface QuickAction {
  code: string;
  label: string;
  requiredPermission: string;
}

export interface WorkbenchResponse {
  today: WorkbenchToday;
  todos: WorkbenchTodo[];
  studentStatusSummary: StudentStatusSummary;
  recentNotices: WorkbenchNotice[];
  quickActions: QuickAction[];
}

/**
 * 获取工作台数据
 * 接口：GET /workbench（request 工具会拼接 API_BASE_URL 前缀）
 */
export function getWorkbench(): Promise<WorkbenchResponse> {
  return request<WorkbenchResponse>('/workbench', {
    method: 'GET'
  });
}
