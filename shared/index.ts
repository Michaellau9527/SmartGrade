/**
 * SmartGrade Shared - 公共入口
 *
 * 统一导出类型、常量、工具函数
 */

// ==================== 类型 ====================
export type {
  ApiResponse,
  PaginationParams,
  PaginationData,
  Teacher,
  Role,
  Tag,
  Grade,
  Class,
  Student,
  LeaveRecord,
  Timeline,
  Notice,
  Document,
  Todo,
  Incident,
} from './types';

export {
  StudentStatus,
  BoardingType,
  LeaveStatus,
  Gender,
  TodoStatus,
  NoticeType,
  RoleCode,
} from './types';

// ==================== 常量 ====================
export {
  STUDENT_STATUS_TEXT,
  LEAVE_STATUS_TEXT,
  BOARDING_TYPE_TEXT,
  GENDER_TEXT,
  ROLE_NAME_MAP,
  STUDENT_STATUS_COLOR,
  LEAVE_STATUS_COLOR,
  ERROR_CODES,
  BUSINESS_ERROR_CODES,
  API_PREFIX,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './constants';

// ==================== 工具 ====================
export {
  createResponse,
  success,
  fail,
  getPaginationParams,
  formatDate,
  generateNo,
  delay,
  deepClone,
  isEmpty,
  maskPhone,
} from './utils';