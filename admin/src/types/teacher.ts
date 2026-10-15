/**
 * 教师相关类型契约
 * 与后端 GET /api/v1/teachers/* 系列接口字段保持一致
 */

export type TeacherGender = 'MALE' | 'FEMALE';
export type TeacherStatus = 'ACTIVE' | 'RESIGNED';

export interface TeacherItem {
  [key: string]: unknown;
  id: string;
  teacherNo: string;
  name: string;
  gender: TeacherGender | string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  teachingGroup: string | null;
  position: string | null;
  status: TeacherStatus | string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface TeacherListResponse {
  list: TeacherItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端 GET /api/v1/teachers/:id/roles 返回结构
 * 阶段 D 新增；仅只读，不含分配/写入能力
 */
export interface TeacherRolesResponse {
  teacherId: string;
  roles: string[];
}

/**
 * 角色实体（GET /api/v1/roles 列表项）
 * id 已由后端序列化为 number（role 表自增主键）
 */
export interface RoleItem {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleListResponse {
  list: RoleItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 新增/编辑教师入参（POST/PUT /api/v1/teachers）
 * 与后端 teacher.service.create/update 直接落库的字段一致
 */
export interface TeacherUpsertInput {
  teacherNo: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string | null;
  email?: string | null;
  teachingGroup?: string | null;
  position?: string | null;
  status?: 'ACTIVE' | 'RESIGNED';
}

/**
 * 角色分配入参（POST /api/v1/teachers/:id/roles）
 * 全量替换：roleIds 为该教师将拥有的全部角色 id（空数组 = 清空）
 * 后端有白名单强校验：ROLE_ADMIN 不允许通过此接口授予
 */
export interface AssignTeacherRolesInput {
  roleIds: number[];
}

/**
 * 发起微信绑定返回（POST /api/v1/teachers/:id/bind-wechat/init）
 * 明文绑定码仅此一次返回，需当面/私信交给教师
 */
export interface BindWechatInitResponse {
  bindingToken: string;
  expiresIn: number;
  teacherId: string;
}