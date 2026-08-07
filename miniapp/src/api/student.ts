import { request } from '../utils/request';

/** 学生在校状态 */
export type StudentStatus = 'ON_CAMPUS' | 'OUT_OF_SCHOOL' | 'GRADUATED' | 'TRANSFERRED';

/** 住宿类型 */
export type BoardingType = 'DAY_STUDENT' | 'BOARDING';

/** 学生列表项（前端统一字段） */
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
  /** 宿舍名 = 楼栋名 + 房间号（从后端嵌套解析） */
  dormName: string | null;
  bedNo: string | null;
}

/** 学生详情（前端统一字段） */
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

/** 后端原始数据结构（嵌套） */
interface RawClass {
  id: string;
  name: string;
  code?: string;
  grade?: { id: string; name: string; code?: string };
  headTeacher?: { id: string; name: string; teacherNo: string; phone?: string | null };
  headTeacherId?: string;
  viceHeadTeacherId?: string | null;
  studentCount?: number;
  status?: string;
}

interface RawDorm {
  id: string;
  buildingId: string;
  floor: number;
  roomNo: string;
  capacity?: number;
  currentCount?: number;
  status?: string;
  building?: { id: string; name: string };
}

interface RawStudent {
  id: string;
  studentNo: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  classId: string;
  gradeId: string;
  schoolId: string;
  boardingType: BoardingType;
  dormId: string | null;
  bedNo: string | null;
  currentStatus: StudentStatus;
  currentLocation: string;
  statusUpdatedAt?: string | null;
  locationUpdatedAt?: string | null;
  phone?: string | null;
  enrolledAt?: string;
  graduatedAt?: string | null;
  transferredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // 嵌套字段
  class?: RawClass;
  dorm?: RawDorm | null;
  leaveCount?: number;
  timelineCount?: number;
}

/** 后端分页响应结构 */
interface StudentListResponse {
  list: RawStudent[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端原始数据 -> 前端统一结构
 *
 * 后端把"班级名/年级名"嵌在 class.name / class.grade.name，
 * "宿舍名"由 dorm.building.name + dorm.roomNo 拼接而成。
 * 这里统一拍平为顶层 className / gradeName / dormName，
 * 页面层就不用关心后端嵌套结构。
 */
function mapStudent(raw: RawStudent): StudentListItem {
  // 宿舍名 = 楼栋名 + 房间号
  let dormName: string | null = null;
  if (raw.dorm) {
    const buildingName = raw.dorm.building?.name || '';
    const roomNo = raw.dorm.roomNo || '';
    dormName = [buildingName, roomNo].filter(Boolean).join(' ') || null;
  }
  return {
    id: raw.id,
    studentNo: raw.studentNo,
    name: raw.name,
    gender: raw.gender,
    className: raw.class?.name || '',
    gradeName: raw.class?.grade?.name || '',
    boardingType: raw.boardingType,
    currentStatus: raw.currentStatus,
    currentLocation: raw.currentLocation,
    dormName,
    bedNo: raw.bedNo ?? null
  };
}

function mapStudentDetail(raw: RawStudent): StudentDetail {
  const base = mapStudent(raw);
  return {
    ...base,
    phone: raw.phone ?? null,
    enrolledAt: raw.enrolledAt || raw.createdAt
  };
}

/**
 * 获取学生列表
 * 接口：GET /students
 *
 * 后端返回 { list, total, page, pageSize }，
 * 列表项里班级名/年级名是嵌套字段，这里适配为顶层字段后返回数组。
 */
export async function getStudents(params?: QueryStudentParams): Promise<StudentListItem[]> {
  const res = await request<StudentListResponse>('/students', {
    method: 'GET',
    data: params as unknown as Record<string, unknown>
  });
  // 防御性：直接返回数组
  if (Array.isArray(res)) {
    return (res as RawStudent[]).map(mapStudent);
  }
  const list = res?.list || [];
  return list.map(mapStudent);
}

/**
 * 获取学生详情
 * 接口：GET /students/:id
 *
 * 后端返回 RawStudent 嵌套结构，适配为扁平 StudentDetail。
 */
export async function getStudentDetail(id: string): Promise<StudentDetail> {
  const raw = await request<RawStudent>(`/students/${id}`, {
    method: 'GET'
  });
  // 防御性：万一将来后端直接返回扁平结构
  if (raw && (raw as any).className !== undefined) {
    return raw as unknown as StudentDetail;
  }
  return mapStudentDetail(raw);
}

/**
 * 创建学生
 * 接口：POST /students
 */
export function createStudent(data: {
  studentNo: string;
  name: string;
  gender: string;
  classId: string;
  boardingType: string;
  dorm_room_id?: string;
  bedNo?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
}): Promise<StudentDetail> {
  return request<RawStudent>('/students', {
    method: 'POST',
    data: data as unknown as Record<string, unknown>
  }).then(mapStudentDetail);
}

/**
 * 更新学生
 * 接口：PUT /students/:id
 */
export function updateStudent(
  id: string,
  data: {
    name?: string;
    gender?: string;
    boardingType?: string;
    dorm_room_id?: string;
    bedNo?: string;
    phone?: string;
    parent_name?: string;
    parent_phone?: string;
  }
): Promise<StudentDetail> {
  return request<RawStudent>(`/students/${id}`, {
    method: 'PUT',
    data: data as unknown as Record<string, unknown>
  }).then(mapStudentDetail);
}

/**
 * 删除学生（逻辑删除）
 * 接口：DELETE /students/:id
 */
export function deleteStudent(id: string): Promise<void> {
  return request<void>(`/students/${id}`, {
    method: 'DELETE'
  });
}
