import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * @Public()
 *
 * 标记接口为公开接口，跳过 JWT 认证
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
