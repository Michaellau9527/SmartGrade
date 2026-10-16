import { request } from '@/utils/request';
import type {
  ClassListResponse,
  ClassItem,
  ClassQueryParams,
  CreateClassParams,
  UpdateClassParams,
  GradeOptionsResponse,
} from '@/types/class';

/** 班级列表（GET /classes，受后端数据范围约束） */
export function getClassList(params: ClassQueryParams): Promise<ClassListResponse> {
  return request.get('/classes', { params });
}

/** 班级详情（GET /classes/:id） */
export function getClassDetail(id: string): Promise<ClassItem> {
  return request.get(`/classes/${id}`);
}

/** 可选年级（GET /classes/grades，受数据范围约束） */
export function getGradeOptions(): Promise<GradeOptionsResponse> {
  return request.get('/classes/grades');
}

/** 新增班级（POST /classes，@RequirePermissions('class:create')） */
export function createClass(data: CreateClassParams): Promise<ClassItem> {
  return request.post('/classes', data);
}

/** 修改班级（PUT /classes/:id，@RequirePermissions('class:update')） */
export function updateClass(id: string, data: UpdateClassParams): Promise<ClassItem> {
  return request.put(`/classes/${id}`, data);
}

/** 删除班级（DELETE /classes/:id，@RequirePermissions('class:delete')） */
export function deleteClass(id: string): Promise<{ success: boolean }> {
  return request.delete(`/classes/${id}`);
}
