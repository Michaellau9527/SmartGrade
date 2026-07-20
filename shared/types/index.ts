/**
 * SmartGrade Shared Types
 * 公共类型定义
 *
 * ⚠️ **v1.2 迁移说明（2026-07-18）**：
 * 本文件是 Sprint 1 时代的**旧版类型**（使用 v4.1 旧枚举 IN_SCHOOL / PENDING_LEAVE / LEFT_SCHOOL）。
 * Sprint 2.1+ 全部迁移到 `shared/types/domain/`（v1.2 冻结）。
 *
 * 新代码请使用：
 *   import { Student, LeaveRecord, StudentStatus, ... } from '@smartgrade/shared/types/domain';
 *
 * 本文件**仅**用于 Sprint 1 历史代码的兼容，**不允许**新增内容。
 * 完整迁移计划见 docs/domain-model.md §八。
 */

// ==================== 枚举定义 ====================

/** 学生状态 */
export enum StudentStatus {
  IN_SCHOOL = 'IN_SCHOOL',
  PENDING_LEAVE = 'PENDING_LEAVE',
  LEFT_SCHOOL = 'LEFT_SCHOOL',
}

/** 住宿类型 */
export enum BoardingType {
  DAY = 'DAY',
  BOARDING = 'BOARDING',
}

/** 请假状态 */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LEFT = 'LEFT',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

/** 性别 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/** 待办状态 */
export enum TodoStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

/** 通知类型 */
export enum NoticeType {
  ALL = 'ALL',
  ROLE = 'ROLE',
  TAG = 'TAG',
  ORGANIZATION = 'ORGANIZATION',
}

/** 角色编码 */
export enum RoleCode {
  ADMIN = 'ROLE_ADMIN',
  GRADE_DIRECTOR = 'ROLE_GRADE_DIRECTOR',
  POLITICAL = 'ROLE_POLITICAL',
  HEADMASTER = 'ROLE_HEADMASTER',
  DORM_MANAGER = 'ROLE_DORM_MANAGER',
  SUBJECT_TEACHER = 'ROLE_SUBJECT_TEACHER',
}

// ==================== 接口定义 ====================

/** 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 分页响应数据 */
export interface PaginationData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 教师 */
export interface Teacher {
  id: number;
  teacher_no: string;
  name: string;
  gender: Gender;
  phone?: string;
  email?: string;
  avatar?: string;
  department?: string;
  position?: string;
  status: boolean;
  roles?: Role[];
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

/** 角色 */
export interface Role {
  id: number;
  role_code: string;
  role_name: string;
  description?: string;
}

/** 标签 */
export interface Tag {
  id: number;
  tag_code: string;
  tag_name: string;
  description?: string;
}

/** 年级 */
export interface Grade {
  id: number;
  grade_name: string;
  grade_code: string;
  director_teacher_id?: number;
}

/** 班级 */
export interface Class {
  id: number;
  grade_id: number;
  class_name: string;
  head_teacher_id?: number;
  student_count: number;
}

/** 学生 */
export interface Student {
  id: number;
  student_no: string;
  name: string;
  gender: Gender;
  class_id: number;
  boarding_type: BoardingType;
  dorm_room_id?: number;
  bed_no?: string;
  status: StudentStatus;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  created_at: string;
  updated_at: string;
}

/** 请假记录 */
export interface LeaveRecord {
  id: number;
  leave_no: string;
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  boarding_type: BoardingType;
  leave_type: string;
  leave_reason: string;
  remark?: string;
  status: LeaveStatus;
  current_node: string;
  apply_teacher_id: number;
  apply_teacher_name: string;
  approve_teacher_id?: number;
  approve_teacher_name?: string;
  approve_remark?: string;
  approved_at?: string;
  left_at?: string;
  return_at?: string;
  finished_at?: string;
  created_at: string;
}

/** 时间轴事件 */
export interface Timeline {
  id: number;
  timeline_no: string;
  student_id: number;
  leave_record_id?: number;
  event_type: string;
  event_title: string;
  event_description?: string;
  operator_teacher_id?: number;
  operator_teacher_name?: string;
  operator_role?: string;
  target_role?: string;
  before_status?: string;
  after_status?: string;
  event_source: string;
  is_system: boolean;
  created_at: string;
}

/** 通知 */
export interface Notice {
  id: number;
  notice_no: string;
  title: string;
  content: string;
  notice_type: NoticeType;
  target_roles?: string;
  target_tags?: string;
  target_orgs?: string;
  publisher_id: number;
  publisher_name: string;
  status: string;
  published_at?: string;
  read_count: number;
  created_at: string;
}

/** 文件 */
export interface Document {
  id: number;
  document_no: string;
  title: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploader_id: number;
  uploader_name: string;
  status: string;
  download_count: number;
  created_at: string;
}

/** 待办 */
export interface Todo {
  id: number;
  todo_no: string;
  teacher_id: number;
  todo_type: string;
  title: string;
  content?: string;
  source_type?: string;
  source_id?: number;
  status: TodoStatus;
  finished_at?: string;
  expired_at?: string;
  created_at: string;
}

/** 异常事件 */
export interface Incident {
  id: number;
  incident_no: string;
  student_id?: number;
  incident_type: string;
  title: string;
  description?: string;
  reporter_id: number;
  reporter_name: string;
  status: string;
  handler_id?: number;
  handler_name?: string;
  handle_remark?: string;
  handled_at?: string;
  closed_at?: string;
  created_at: string;
}