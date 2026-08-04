import { request } from '../utils/request';

/** 学生在校状态 */
export type StudentStatus = 'ON_CAMPUS' | 'OUT_OF_SCHOOL' | 'GRADUATED' | 'TRANSFERRED';

/** 住宿类型 */
export type BoardingType = 'DAY_STUDENT' | 'BOARDING';

/** 学生列表项 */
export interface StudentListItem {
  id: string;
  studentNo: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  className: string;
  gradeName: string;
  boardingType: BoardingType;
  currentStatus: StudentStatus;
  currentLocation: string;
}

/** 学生详情 */
export interface StudentDetail extends StudentListItem {
  phone: string | null;
  dormName: string | null;
  bedNo: string | null;
  enrolledAt: string;
}

/** 查询参数 */
export interface QueryStudentParams {
  keyword?: string;
  classId?: string;
  gradeId?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
}

/** 后端分页响应结构（不可修改 backend，仅在前端适配） */
interface StudentListResponse {
  list: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取学生列表
 * 接口：GET /students
 *
 * 后端返回分页对象 { list, total, page, pageSize }，
 * 这里在 API 层做适配，只把 list 数组返回给页面，
 * 避免页面拿到对象后直接 .map() 报错。
 */
export async function getStudents(params?: QueryStudentParams): Promise<StudentListItem[]> {
  const res = await request<StudentListResponse>('/students', {
    method: 'GET',
    data: params as unknown as Record<string, unknown>
  });
  // 兼容：后端可能返回分页对象，也可能直接返回数组（防御性处理）
  if (Array.isArray(res)) {
    return res;
  }
  return res?.list || [];
}

/**
 * 获取学生详情
 * 接口：GET /students/:id
 */
export function getStudentDetail(id: string): Promise<StudentDetail> {
  return request<StudentDetail>(`/students/${id}`, {
    method: 'GET'
  });
}
