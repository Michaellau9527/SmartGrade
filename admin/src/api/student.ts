import { request } from '@/utils/request';
import type {
  StudentListResponse,
  StudentItem,
  StudentQueryParams,
  CreateStudentParams,
  UpdateStudentParams,
  SetDormitoryParams,
} from '@/types/student';

export function getStudentList(params: StudentQueryParams): Promise<StudentListResponse> {
  return request.get('/students', { params });
}

export function getStudentDetail(id: string): Promise<StudentItem> {
  return request.get(`/students/${id}`);
}

export function createStudent(data: CreateStudentParams): Promise<StudentItem> {
  return request.post('/students', data);
}

export function updateStudent(id: string, data: UpdateStudentParams): Promise<StudentItem> {
  return request.put(`/students/${id}`, data);
}

export function deleteStudent(id: string): Promise<{ success: boolean }> {
  return request.delete(`/students/${id}`);
}

export function setStudentDormitory(id: string, data: SetDormitoryParams): Promise<StudentItem> {
  return request.post(`/students/${id}/dormitory`, data);
}
