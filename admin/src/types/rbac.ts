// 角色与权限管理（后端 /roles、/permissions 已上线）

export interface RoleItem {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string | null;
  isSystem?: boolean;
  createdAt?: string;
}

export interface RoleListResponse {
  list: RoleItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionItem {
  id: number;
  permissionCode: string;
  permissionName: string;
  resource?: string | null;
  action?: string | null;
  description?: string | null;
}

export interface PermissionListResponse {
  list: PermissionItem[];
  total: number;
  page: number;
  pageSize: number;
}
