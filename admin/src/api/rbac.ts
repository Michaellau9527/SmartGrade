import { request } from '@/utils/request';
import type {
  RoleListResponse,
  RoleItem,
  PermissionListResponse,
  PermissionItem,
} from '@/types/rbac';

/**
 * 角色列表
 * 路径：GET /api/v1/roles
 */
export function getRoles(params?: { page?: number; pageSize?: number }): Promise<RoleListResponse> {
  return request.get('/roles', { params: params ?? { page: 1, pageSize: 100 } });
}

/**
 * 权限目录（全量，用于角色赋权勾选）
 * 路径：GET /api/v1/permissions
 */
export function getPermissions(params?: { page?: number; pageSize?: number }): Promise<PermissionListResponse> {
  return request.get('/permissions', { params: params ?? { page: 1, pageSize: 200 } });
}

/**
 * 某角色已授予的权限列表
 * 路径：GET /api/v1/roles/:id/permissions
 */
export function getRolePermissions(roleId: number): Promise<PermissionItem[]> {
  return request.get(`/roles/${roleId}/permissions`);
}

/**
 * 分配角色权限（全量替换）
 * 路径：POST /api/v1/roles/:id/permissions（@RequirePermissions('role:assign-permission')）
 * 入参：{ permissionIds: number[] }
 */
export function assignRolePermissions(
  roleId: number,
  permissionIds: number[],
): Promise<{ success: boolean }> {
  return request.post(`/roles/${roleId}/permissions`, { permissionIds });
}

/**
 * 新增角色
 * 路径：POST /api/v1/roles（@RequirePermissions('role:create')）
 */
export function createRole(body: {
  roleCode: string;
  roleName: string;
  description?: string;
}): Promise<RoleItem> {
  return request.post('/roles', body);
}

/**
 * 修改角色
 * 路径：PUT /api/v1/roles/:id（@RequirePermissions('role:update')）
 */
export function updateRole(
  roleId: number,
  body: { roleName?: string; description?: string },
): Promise<RoleItem> {
  return request.put(`/roles/${roleId}`, body);
}

/**
 * 删除角色
 * 路径：DELETE /api/v1/roles/:id（@RequirePermissions('role:delete')）
 */
export function deleteRole(roleId: number): Promise<{ success: boolean }> {
  return request.delete(`/roles/${roleId}`);
}
