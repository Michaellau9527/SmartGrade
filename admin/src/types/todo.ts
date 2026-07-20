export type TodoStatus = 'TODO' | 'PROCESSING' | 'DONE' | 'CANCELLED';
export type BusinessType = 'LEAVE' | 'NOTICE' | 'DORM' | 'SYSTEM';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TodoItem {
  [key: string]: unknown;
  id: string;
  todo_no: string;
  title: string;
  content: string | null;
  teacher_id: number;
  business_type: BusinessType;
  business_id: string | null;
  priority: Priority;
  status: TodoStatus;
  deadline: string | null;
  finished_at: string | null;
  created_at: string;
  teacher: { id: number; name: string; teacher_no: string } | null;
}

export interface TodoStatistics {
  todo: number;
  processing: number;
  done: number;
  cancelled: number;
  total: number;
}

export interface TodoListResponse {
  list: TodoItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TodoQueryParams {
  page?: number;
  pageSize?: number;
  status?: TodoStatus;
  businessType?: BusinessType;
  priority?: Priority;
}
