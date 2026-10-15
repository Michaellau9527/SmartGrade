import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useUserStore } from '@/stores/user';

type PermissionMode = 'hide' | 'disable';

interface PermissionGuardProps {
  /** 需要的权限，满足任一即可 */
  permissions: string[];
  /** 无权限时的策略：hide（隐藏，默认）或 disable（置灰） */
  mode?: PermissionMode;
  children: ReactNode;
}

/**
 * 权限守卫组件
 * 用于路由级、按钮级等任意位置的权限控制
 *
 * @example
 * // 隐藏模式（默认）
 * <PermissionGuard permissions={[PERM.STUDENT_CREATE]}>
 *   <Button>新建学生</Button>
 * </PermissionGuard>
 *
 * // 置灰模式
 * <PermissionGuard permissions={[PERM.LEAVE_APPROVE]} mode="disable">
 *   <Button>审批</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({ permissions, mode = 'hide', children }: PermissionGuardProps) {
  const hasPermission = useUserStore((s) => s.hasPermission);
  const authorized = permissions.some((p) => hasPermission(p));

  if (!authorized) {
    if (mode === 'disable') {
      return (
        <span style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}>
          {children}
        </span>
      );
    }
    return null;
  }

  return <>{children}</>;
}

// ─── 路由守卫 ───────────────────────────────────────────

interface AuthGuardProps {
  children: ReactNode;
  /** 需要的权限，满足任一即可 */
  permissions?: string[];
  /** 是否需要登录，默认 true */
  requireAuth?: boolean;
  /** 无权限时跳转的路径，默认显示 403 页面 */
  fallbackPath?: string;
}

/**
 * 路由权限守卫
 * - 未登录 → 跳转登录页
 * - 无权限 → 显示 403 页面（带返回首页按钮）或跳转 fallbackPath
 */
export function AuthGuard({
  children,
  permissions,
  requireAuth = true,
  fallbackPath,
}: AuthGuardProps) {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);
  const hasPermission = useUserStore((state) => state.hasPermission);

  // 需要登录但未登录
  if (requireAuth && !user && !token) {
    navigate('/login', { replace: true });
    return null;
  }

  // 需要特定权限
  if (permissions && permissions.length > 0) {
    const authorized = permissions.some((p) => hasPermission(p));
    if (!authorized) {
      if (fallbackPath) {
        navigate(fallbackPath, { replace: true });
        return null;
      }
      return (
        <div style={{ padding: 40 }}>
          <Result
            status="403"
            title="403"
            subTitle="抱歉，您没有权限访问该页面"
            extra={
              <Button type="primary" onClick={() => navigate('/dashboard', { replace: true })}>
                返回首页
              </Button>
            }
          />
        </div>
      );
    }
  }

  return <>{children}</>;
}
