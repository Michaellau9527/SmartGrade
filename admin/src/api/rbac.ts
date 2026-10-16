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
 *
 * 后端公共分页 DTO 硬约束 pageSize <= 100（@Max(100)），传 200 会直接 400。
 * 默认全量加载：以 pageSize=100 分页循环拉齐，直到覆盖 total，
 * 避免权限数超过单页容量时静默丢失（当前种子 47 条 < 100，单页即全量）。
 */
export async function getPermissions(
  params?: { page?: number; pageSize?: number },
): Promise<PermissionListResponse> {
  const first = (await request.get('/permissions', {
    params: params ?? { page: 1, pageSize: 100 },
  })) as PermissionListResponse;
  // 仅在「默认全量加载」时聚合；调用方显式传参（真实分页场景）不合并，尊重其分页语义
  if (params || !first || !Array.isArray(first.list)) return first;

  const merged: PermissionItem[] = [...first.list];
  const total = first.total ?? merged.length;
  const pageSize = first.pageSize || 100;
  let page = first.page || 1;
  while (merged.length < total) {
    page += 1;
    const next = (await request.get('/permissions', {
      params: { page, pageSize },
    })) as PermissionListResponse;
    if (!next?.list?.length) break; // 防御：后端异常时终止，不无限循环
    merged.push(...next.list);
  }
  return { ...first, list: merged };
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
