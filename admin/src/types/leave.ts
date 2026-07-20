export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'LEFT' | 'FINISHED' | 'CANCELLED';
export type LeaveType = 'LEAVE_SCHOOL' | 'RETURN_DORM' | 'OTHER';

export interface LeaveItem {
  [key: string]: unknown;
  id: string;
  leave_no: string;
  student_id: number;
  student_name: string;
  student_no: string;
  leave_type: LeaveType;
  leave_reason: string;
  start_time: string;
  end_time: string;
  status: LeaveStatus;
  boarding_type: string;
  apply_teacher_id: number;
  apply_teacher_name: string;
  approve_teacher_id: number | null;
  approve_teacher_name: string | null;
  approve_remark: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  student: {
    id: number;
    name: string;
    student_no: string;
    class: { id: number; class_name: string } | null;
    dorm_room: { id: number; room_no: string } | null;
    building: { id: number; building_name: string } | null;
  } | null;
}

export interface LeaveQueryParams {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  studentName?: string;
  studentNo?: string;
}

export interface LeaveListResponse {
  list: LeaveItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateLeaveParams {
  studentId: number;
  leaveType: LeaveType;
  leaveReason: string;
  remark?: string;
}

export interface ApproveLeaveParams {
  approveRemark?: string;
}

export interface RejectLeaveParams {
  rejectReason: string;
}
