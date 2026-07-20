import { SetMetadata } from '@nestjs/common';

export const DATA_SCOPE_KEY = 'data_scope';

/**
 * @DataScope()
 *
 * 标记接口需要数据权限控制
 * Guard 会自动根据用户角色计算数据范围并附加到 request.user.dataScope
 */
export const DataScope = () => SetMetadata(DATA_SCOPE_KEY, true);
