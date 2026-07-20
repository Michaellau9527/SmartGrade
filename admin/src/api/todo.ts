import { request } from '@/utils/request';
import type {
  TodoItem,
  TodoListResponse,
  TodoQueryParams,
  TodoStatistics,
} from '@/types/todo';

export function getTodoList(params: TodoQueryParams): Promise<TodoListResponse> {
  return request.get('/todos', { params });
}

export function getTodoStatistics(): Promise<TodoStatistics> {
  return request.get('/todos/statistics');
}

export function getTodoDetail(id: string): Promise<TodoItem> {
  return request.get(`/todos/${id}`);
}

export function completeTodo(id: string): Promise<void> {
  return request.post(`/todos/${id}/complete`);
}

export function batchCompleteTodos(
  ids: number[],
): Promise<{ success: boolean; updatedCount: number }> {
  return request.post('/todos/batch-complete', { ids });
}