export type StudentStatus = 'IN_SCHOOL' | 'PENDING_LEAVE' | 'LEFT_SCHOOL' | 'SUSPENDED' | 'GRADUATED';
export type BoardingType = 'BOARDING' | 'DAY';

export interface StudentItem {
  [key: string]: unknown;
  id: string;
  student_no: string;
  name: string;
  gender: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  boarding_type: BoardingType;
  dorm_room_id: number | null;
  bed_no: string | null;
  status: StudentStatus;
  class_id: number;
  created_at: string;
  class: {
    id: number;
    class_name: string;
    grade: {
      id: number;
      grade_name: string;
    } | null;
  } | null;
  dorm_room: {
    id: number;
    room_no: string;
    floor: number;
    building: {
      id: number;
      building_name: string;
    } | null;
  } | null;
}

export interface StudentQueryParams {
  page?: number;
  pageSize?: number;
  status?: StudentStatus;
  classId?: number;
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

/** 创建学生参数（对应后端 CreateStudentDto） */
export interface CreateStudentParams {
  student_no: string;
  name: string;
  gender: string;
  class_id: number;
  boarding_type: string;
  dorm_room_id?: number;
  bed_no?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
}

/** 修改学生参数（对应后端 UpdateStudentDto，所有字段可选） */
export interface UpdateStudentParams {
  name?: string;
  gender?: string;
  boarding_type?: string;
  dorm_room_id?: number;
  bed_no?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
}

/** 设置住宿信息参数 */
export interface SetDormitoryParams {
  dorm_room_id: number;
  bed_no: string;
}
