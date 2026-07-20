/**
 * 权限 Hook
 * 提供便捷的权限判断方法，页面/组件中使用
 */
import { useUserStore } from '@/stores/user';
import type { RoleKey } from './roles';
import { ROLE_PERMISSIONS } from './roles';
import { ROLE } from './roles';

export function usePermission() {
  const hasPermission = useUserStore((state) => state.hasPermission);
  const user = useUserStore((state) => state.user);

  /** 判断是否拥有指定权限（单个） */
  const can = (permission: string): boolean => {
    return hasPermission(permission);
  };

  /** 判断是否拥有任一权限 */
  const canAny = (...permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  /** 判断是否拥有全部权限 */
  const canAll = (...permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  /** 判断当前用户是否拥有指定角色 */
  const hasRole = (role: RoleKey): boolean => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  /** 判断是否为超级管理员 */
  const isSuperAdmin = (): boolean => {
    return hasRole(ROLE.SUPER_ADMIN);
  };

  /** 获取当前用户角色列表 */
  const getRoles = (): string[] => {
    return user?.roles ?? [];
  };

  /** 获取当前用户主角色（第一个角色） */
  const getPrimaryRole = (): RoleKey | null => {
    const roles = getRoles();
    if (roles.length === 0) return null;
    return roles[0] as RoleKey;
  };

  /** 获取当前用户角色对应的权限集合（用于开发调试） */
  const getRolePermissions = (): readonly string[] => {
    const primaryRole = getPrimaryRole();
    if (!primaryRole) return [];
    return ROLE_PERMISSIONS[primaryRole] ?? [];
  };

  /** 判断当前用户数据范围类型 */
  const getDataScopeType = (): string => {
    return user?.dataScope?.type ?? 'SELF';
  };

  return {
    can,
    canAny,
    canAll,
    hasRole,
    isSuperAdmin,
    getRoles,
    getPrimaryRole,
    getRolePermissions,
    getDataScopeType,
  };
}
