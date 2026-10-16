import { request } from '@/utils/request';
import type { ClassListResponse, ClassItem, ClassQueryParams } from '@/types/class';

export function getClassList(params: ClassQueryParams): Promise<ClassListResponse> {
  return request.get('/classes', { params });
}

export function getClassDetail(id: string): Promise<ClassItem> {
  return request.get(`/classes/${id}`);
}
