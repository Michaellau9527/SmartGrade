import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '../types';

/**
 * @CurrentUser()
 *
 * 从请求中提取当前登录用户信息
 *
 * 包含：id, teacherNo, name, roles, permissions, dataScope
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
