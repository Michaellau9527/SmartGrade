import { request } from '@/utils/request';
import type {
  TeacherItem,
  TeacherListResponse,
  TeacherQueryParams,
  TeacherRolesResponse,
  RoleListResponse,
  TeacherUpsertInput,
  AssignTeacherRolesInput,
  BindWechatInitResponse,
} from '@/types/teacher';

/**
 * 教师列表
 * 路径：GET /api/v1/teachers
 * 入参：{ page, pageSize, keyword? }
 */
export function getTeacherList(params: TeacherQueryParams): Promise<TeacherListResponse> {
  return request.get('/teachers', { params });
}

/**
 * 教师详情
 * 路径：GET /api/v1/teachers/:id
 */
export function getTeacherDetail(id: string): Promise<TeacherItem> {
  return request.get(`/teachers/${id}`);
}

/**
 * 教师角色列表（只读）
 * 路径：GET /api/v1/teachers/:id/roles
 * 阶段 D 新增端点；返回 { teacherId, roles: string[] }
 * 前端仅展示，不允许用此接口做角色分配
 */
export function getTeacherRoles(id: string): Promise<TeacherRolesResponse> {
  return request.get(`/teachers/${id}/roles`);
}

/**
 * 新增教师
 * 路径：POST /api/v1/teachers（@RequirePermissions('teacher:create')）
 * 入参：TeacherUpsertInput（teacherNo / name / gender 必填，其余可选）
 * 注意：后端 controller 使用 any body，无独立 DTO；但底层 Prisma 约束
 * teacherNo 唯一、name 与 gender 非空，前端表单已做必填校验。
 */
export function createTeacher(body: TeacherUpsertInput): Promise<TeacherItem> {
  return request.post('/teachers', body);
}

/**
 * 编辑教师基本信息
 * 路径：PUT /api/v1/teachers/:id（@RequirePermissions('teacher:update')）
 */
export function updateTeacher(id: string, body: TeacherUpsertInput): Promise<TeacherItem> {
  return request.put(`/teachers/${id}`, body);
}

/**
 * 分配教师角色（全量替换）
 * 路径：POST /api/v1/teachers/:id/roles（@RequirePermissions('teacher:assign-role')）
 * 入参：{ roleIds: number[] }；空数组 = 清空全部角色
 * 后端强制白名单：ROLE_ADMIN 不在可分配之列，越权将被 403 拒绝。
 */
export function assignTeacherRoles(
  id: string,
  body: AssignTeacherRolesInput,
): Promise<{ success: boolean; teacherId: string; roles: string[] }> {
  return request.post(`/teachers/${id}/roles`, body);
}

/**
 * 角色列表（用于角色分配下拉，禁止前端硬编码）
 * 路径：GET /api/v1/roles
 * 返回 { list: RoleItem[], total, page, pageSize }，id 已由后端序列化为 number
 */
export function getRoleList(params?: { page?: number; pageSize?: number }): Promise<RoleListResponse> {
  return request.get('/roles', { params: params ?? { page: 1, pageSize: 100 } });
}

/**
 * 发起教师微信绑定（生成一次性绑定码）
 * 路径：POST /api/v1/teachers/:id/bind-wechat/init（@RequirePermissions('teacher:bind-wechat')）
 * 返回明文绑定码（仅此一次），需当面/私信交给教师在小程序内完成绑定，
 * 绑定后该教师即可通过微信登录（现有认证机制）进入小程序。
 */
export function initTeacherWechatBind(id: string): Promise<BindWechatInitResponse> {
  return request.post(`/teachers/${id}/bind-wechat/init`);
}