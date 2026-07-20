import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';
import { CurrentUserPayload } from '../types';

/**
 * RolesGuard - 角色验证守卫
 *
 * 检查当前用户是否拥有接口要求的角色
 *
 * 使用：@Roles('ROLE_ADMIN', 'ROLE_HEADMASTER')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记 @Roles() 的接口不验证角色
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user || !user.roles) {
      throw new ForbiddenException('权限不足：未获取用户角色信息');
    }

    // 管理员拥有所有权限
    if (user.roles.includes('ROLE_ADMIN')) {
      return true;
    }

    // 检查是否拥有任一要求角色
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`权限不足：需要角色 ${requiredRoles.join(' 或 ')}`);
    }

    return true;
  }
}
