/**
 * 学生模块前端类型 — 与后端契约对齐（camelCase）
 *
 * 权威来源：Prisma Student 模型 + StudentService.findAll/findOne 返回结构（include class{grade,headTeacher}, dorm{building}）。
 * 注意：
 * - 后端返回的状态字段名为 currentStatus（v1.2 双维度状态），筛选参数为 status（IN_SCHOOL/...，服务端映射）。
 * - BoardingType 枚举为 BOARDING | DAY_STUDENT（前端旧 'DAY' 已废弃）。
 * - Student 模型无家长姓名/电话字段（存于 StudentParent 关联表，当前接口不返回）。
 */

export type StudentStatus = 'ON_CAMPUS' | 'OUT_OF_SCHOOL' | 'GRADUATED' | 'TRANSFERRED';
export type BoardingType = 'BOARDING' | 'DAY_STUDENT';

/** 筛选口径（后端 QueryStudentDto.status，服务端映射到 currentStatus） */
export type StudentStatusFilter = 'IN_SCHOOL' | 'PENDING_LEAVE' | 'LEFT_SCHOOL';

export interface StudentItem {
  [key: string]: unknown;
  id: string;
  studentNo: string;
  name: string;
  gender: string;
  phone: string | null;
  boardingType: BoardingType;
  classId: string;
  gradeId: string;
  schoolId: string;
  dormId: string | null;
  bedNo: string | null;
  currentStatus: StudentStatus;
  enrolledAt: string;
  createdAt: string;
  class: {
    id: string;
    name: string;
    code: string;
    grade: { id: string; name: string; code: string } | null;
    headTeacher: { id: string; name: string; teacherNo: string } | null;
  } | null;
  dorm: {
    id: string;
    roomNo: string;
    floor: number;
    building: { id: string; name: string } | null;
  } | null;
  /** 仅详情接口返回 */
  leaveCount?: number;
  timelineCount?: number;
}

export interface StudentQueryParams {
  page?: number;
  pageSize?: number;
  status?: StudentStatusFilter;
  classId?: string;
  gradeId?: string;
  gender?: string;
  boardingType?: BoardingType;
  keyword?: string;
}

export interface StudentListResponse {
  list: StudentItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 创建学生参数（对应后端 CreateStudentDto，camelCase） */
export interface CreateStudentParams {
  studentNo: string;
  name: string;
  gender: string;
  classId: string;
  boardingType: string;
  dormRoomId?: string;
  bedNo?: string;
  phone?: string;
  /** 预留字段：后端当前版本不落库 */
  parentName?: string;
  parentPhone?: string;
}

/** 修改学生参数（对应后端 UpdateStudentDto，所有字段可选） */
export interface UpdateStudentParams {
  name?: string;
  gender?: string;
  boardingType?: string;
  dormRoomId?: string;
  bedNo?: string;
  phone?: string;
  /** 预留字段：后端当前版本不落库 */
  parentName?: string;
  parentPhone?: string;
}

/** 设置住宿信息参数（对应后端 SetDormitoryDto，dormRoomId 为 DormRoom cuid） */
export interface SetDormitoryParams {
  dormRoomId: string;
  bedNo: string;
}
