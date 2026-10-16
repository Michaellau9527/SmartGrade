export interface ClassItem {
  [key: string]: unknown;
  id: string;
  gradeId: string;
  schoolId: string;
  code: string;
  name: string;
  headTeacherId: string | null;
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
