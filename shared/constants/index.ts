/**
 * SmartGrade Shared Constants
 * 公共常量定义
 */

// ==================== 状态文本映射 ====================

/** 学生状态文本 */
export const STUDENT_STATUS_TEXT: Record<string, string> = {
  IN_SCHOOL: '在校',
  PENDING_LEAVE: '待离校',
  LEFT_SCHOOL: '已离校',
};

/** 请假状态文本 */
export const LEAVE_STATUS_TEXT: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  LEFT: '已离校',
  FINISHED: '已销假',
  CANCELLED: '已撤销',
};

/** 住宿类型文本 */
export const BOARDING_TYPE_TEXT: Record<string, string> = {
  DAY: '走读',
  BOARDING: '住宿',
};

/** 性别文本 */
export const GENDER_TEXT: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
};

/** 角色名称映射 */
export const ROLE_NAME_MAP: Record<string, string> = {
  ROLE_ADMIN: '系统管理员',
  ROLE_GRADE_DIRECTOR: '年级主任',
  ROLE_POLITICAL: '政教',
  ROLE_HEADMASTER: '班主任',
  ROLE_DORM_MANAGER: '宿管',
  ROLE_SUBJECT_TEACHER: '任课教师',
};

// ==================== 状态颜色 ====================

/** 学生状态颜色 */
export const STUDENT_STATUS_COLOR: Record<string, string> = {
  IN_SCHOOL: 'green',
  PENDING_LEAVE: 'orange',
  LEFT_SCHOOL: 'red',
};

/** 请假状态颜色 */
export const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  LEFT: 'orange',
  FINISHED: 'default',
  CANCELLED: 'default',
};

// ==================== 错误码 ====================

/** 通用错误码 */
export const ERROR_CODES = {
  SUCCESS: 0,
  PERMISSION_DENIED: 40001,
  TOKEN_INVALID: 40002,
  TOKEN_EXPIRED: 40003,
  PARAM_ERROR: 40004,
  NOT_FOUND: 40005,
  ALREADY_EXISTS: 40006,
  OPERATION_FAILED: 40007,
  BUSINESS_RULE_CONFLICT: 40008,
} as const;

/** 业务错误码 */
export const BUSINESS_ERROR_CODES = {
  STUDENT_HAS_PENDING_LEAVE: 50001,
  STUDENT_STATUS_INVALID: 50002,
  LEAVE_ALREADY_APPROVED: 50003,
  LEAVE_ALREADY_FINISHED: 50004,
  NOT_BOARDING_STUDENT: 50005,
  DORM_ROOM_FULL: 50006,
  NOTICE_WITHDRAWN: 50007,
  DOCUMENT_NOT_FOUND: 50008,
} as const;

// ==================== API 配置 ====================

/** API 前缀 */
export const API_PREFIX = '/api/v1';

/** 默认分页配置 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;