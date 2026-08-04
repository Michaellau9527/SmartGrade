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
}

/**
 * 获取学生列表
 * 接口：GET /students
 */
export function getStudents(params?: QueryStudentParams): Promise<StudentListItem[]> {
  return request<StudentListItem[]>('/students', {
    method: 'GET',
    data: params as unknown as Record<string, unknown>
  });
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
