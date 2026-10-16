/**
 * 路由配置（Single Source of Truth）
 * App.tsx 和 Layout.tsx 共用此配置
 * 新增模块只需在这里添加一个对象
 */
import type { ComponentType } from 'react';
import type { ReactNode } from 'react';
import { PERM } from '@/auth/permission';

// 图标组件（延迟导入避免循环依赖）
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  NotificationOutlined,
  FolderOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  SolutionOutlined,
} from '@ant-design/icons';

// 页面组件
import Dashboard from '@/pages/dashboard';
import Teacher from '@/pages/teacher';
import Student from '@/pages/student';
import Leave from '@/pages/leave';
import Notice from '@/pages/notice';
import Document from '@/pages/document';
import Todo from '@/pages/todo';
import Config from '@/pages/config';
import Class from '@/pages/class';

export interface RouteItem {
  /** 路由路径（子路由不带 /） */
  path: string;
  /** 菜单显示名称 */
  label: string;
  /** 菜单图标组件 */
  icon: ReactNode;
  /** 页面组件 */
  component: ComponentType;
  /** 访问该路由需要的权限（满足任一即可） */
  permissions: string[];
}

/** 所有业务路由配置 */
export const routeConfig: RouteItem[] = [
  { path: 'dashboard', label: '工作台', icon: <DashboardOutlined />, component: Dashboard, permissions: [PERM.DASHBOARD_READ] },
  { path: 'todo', label: '待办管理', icon: <UnorderedListOutlined />, component: Todo, permissions: [PERM.TODO_READ] },
  { path: 'notice', label: '通知管理', icon: <NotificationOutlined />, component: Notice, permissions: [PERM.NOTICE_READ] },
  { path: 'leave', label: '请假管理', icon: <FileTextOutlined />, component: Leave, permissions: [PERM.LEAVE_READ] },
  { path: 'student', label: '学生管理', icon: <TeamOutlined />, component: Student, permissions: [PERM.STUDENT_READ] },
  { path: 'class', label: '班级管理', icon: <SolutionOutlined />, component: Class, permissions: [PERM.STUDENT_READ] },
  { path: 'teacher', label: '教师管理', icon: <UserOutlined />, component: Teacher, permissions: [PERM.TEACHER_READ] },
  { path: 'document', label: '文件管理', icon: <FolderOutlined />, component: Document, permissions: [PERM.DASHBOARD_READ] },
  { path: 'config', label: '角色权限', icon: <SettingOutlined />, component: Config, permissions: [PERM.ROLE_CREATE] },
];

/** 获取允许访问的路由列表（用于菜单渲染） */
export function getAccessibleRoutes(permissions: Set<string>, roles: string[] = []): RouteItem[] {
  // 与后端 permissions.guard.ts 保持一致：ROLE_ADMIN 可见全部菜单
  if (roles.includes('ROLE_ADMIN')) return routeConfig;
  return routeConfig.filter((route) =>
    route.permissions.some((p) => permissions.has(p)),
  );
}

/** 判断是否可以访问指定路径 */
export function canAccessRoute(path: string, permissions: Set<string>, roles: string[] = []): boolean {
  const normalizedPath = path.replace(/^\//, '');
  const route = routeConfig.find((r) => r.path === normalizedPath);
  if (!route) return true;
  if (roles.includes('ROLE_ADMIN')) return true;
  return route.permissions.some((p) => permissions.has(p));
}
