import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators';
import { CurrentUserPayload } from '../types';

/**
 * PermissionsGuard - 权限验证守卫
 *
 * 检查当前用户是否拥有接口要求的权限编码
 *
 * 使用：@RequirePermissions('student:read', 'leave:create')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记 @RequirePermissions() 的接口不验证权限
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user || !user.permissions) {
      throw new ForbiddenException('权限不足：未获取用户权限信息');
    }

    // 管理员拥有所有权限
    if (user.roles?.includes('ROLE_ADMIN')) {
      return true;
    }

    // 检查是否拥有任一要求权限
    const hasPermission = requiredPermissions.some((perm) =>
      user.permissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `权限不足：需要权限 ${requiredPermissions.join(' 或 ')}`,
      );
    }

    return true;
  }
}
