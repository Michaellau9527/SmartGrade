export interface ClassItem {
  [key: string]: unknown;
  id: string;
  gradeId: string;
  schoolId: string;
  code: string;
  name: string;
  headTeacherId: string | null;
  viceHeadTeacherId?: string | null;
  studentCount: number;
  status: string;
  grade?: { id: string; name: string; code: string } | null;
  school?: { id: string; name: string; shortName: string | null } | null;
  headTeacher?: { id: string; name: string; teacherNo: string } | null;
}

export interface ClassQueryParams {
  page?: number;
  pageSize?: number;
  schoolId?: string;
  gradeId?: string;
  keyword?: string;
}

export interface ClassListResponse {
  list: ClassItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 新增班级入参（schoolId 由服务端依据 gradeId 推导，前端不可传） */
export interface CreateClassParams {
  gradeId: string;
  code: string;
  name: string;
  headTeacherId?: string | null;
  status?: string;
}

/** 修改班级入参（全部可选） */
export type UpdateClassParams = Partial<CreateClassParams>;

/** 可选年级（GET /classes/grades，受数据范围约束） */
export interface GradeOption {
  id: string;
  name: string;
  code: string;
  schoolId: string;
}

export interface GradeOptionsResponse {
  list: GradeOption[];
}
