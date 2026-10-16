/**
 * 请假模块前端类型 — 与后端契约对齐（camelCase）
 *
 * 权威来源（shared 包，admin 未配置 @smartgrade/shared 别名，此处内联同值镜像，
 * 后端契约变更时需同步）：
 * - 列表项：shared/types/leave/LeaveResponse.ts 的 LeaveListItem（+ studentNo 扩展）
 * - 详情：LeaveResponse
 * - 请求体：CreateLeaveRequest / ApproveLeaveRequest / RejectLeaveRequest
 * - 枚举：shared/types/domain/enums/LeaveType|LeaveReasonType|LeaveStatus
 */

export type LeaveType = 'SICK' | 'PERSONAL' | 'OTHER';

export type LeaveReasonType =
  | 'ILLNESS'
  | 'PERSONAL'
  | 'FAMILY'
  | 'SPORT'
  | 'SCHOOL_ACTIVITY'
  | 'OTHER';

export const LeaveTypeText: Record<LeaveType, string> = {
  SICK: '病假',
  PERSONAL: '事假',
  OTHER: '其他',
};

export const LeaveReasonTypeText: Record<LeaveReasonType, string> = {
  ILLNESS: '身体原因',
  PERSONAL: '个人事务',
  FAMILY: '家庭原因',
  SPORT: '体育/训练',
  SCHOOL_ACTIVITY: '学校活动',
  OTHER: '其他',
};

/** 8 状态（v4.2 冻结）：DRAFT→PENDING→APPROVED→LEFT→RETURNED→CLOSED / REJECTED / CANCELLED */
export type LeaveStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'LEFT'
  | 'RETURNED'
  | 'CLOSED';

/** GET /leaves 列表项（后端 LeaveController.list 返回） */
export interface LeaveItem {
  [key: string]: unknown;
  id: string;
  leaveNo: string;
  status: LeaveStatus;
  studentId: string;
  studentName: string;
  studentNo: string | null;
  className: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  applicantName: string;
  createdAt: string;
}

export interface LeaveQueryParams {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}

export interface LeaveListResponse {
  list: LeaveItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** POST /leaves 创建请假（后端 CreateLeaveRequest，必填：studentId/leaveType/leaveReasonType/reason/startAt/endAt） */
export interface CreateLeaveParams {
  studentId: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  expectedReturnTime?: string;
  expectedReturnNote?: string;
}

export interface ApproveLeaveParams {
  approveRemark?: string;
}

export interface RejectLeaveParams {
  rejectReason: string;
}
