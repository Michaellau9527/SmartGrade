import { request } from '@/utils/request';
import type { LoginResponseData } from '@/stores/user';

/**
 * 后端 GET /auth/me 实际返回结构（与登录接口不同）。
 * 注意：字段为扁平结构（id / teacherNo / name 在顶层，不嵌套于 teacher），
 * 且不返回 token / refreshToken。请勿与 LoginResponseData 混用。
 */
export interface CurrentUserResponse {
  id: string;
  teacherNo: string;
  name: string;
  gender?: string;
  avatar?: string;
  position?: string;
  roles: string[];
  tags?: unknown[];
  permissions: string[];
}

/** 后端 POST /auth/logout 返回结构 */
export interface LogoutResponse {
  success: boolean;
}

/**
 * 管理员账号密码登录（冷启动）。
 * 路径：POST /auth/login-with-password（@Public）
 * 入参：{ username, password }
 * 返回：经 request 拦截器拆包后的 data，类型与 B1 定义的 LoginResponseData 一致。
 */
export function loginWithPassword(
  username: string,
  password: string,
): Promise<LoginResponseData> {
  return request.post('/auth/login-with-password', { username, password });
}

/**
 * 获取当前登录用户信息。
 * 路径：GET /auth/me（@ApiBearerAuth，Bearer 由 request 自动注入）
 * 返回扁平结构 CurrentUserResponse（与登录接口结构不同，见上方说明）。
 */
export function getCurrentUser(): Promise<CurrentUserResponse> {
  return request.get('/auth/me');
}

/**
 * 退出登录。
 * 路径：POST /auth/logout（@ApiBearerAuth，Bearer 由 request 自动注入）
 * 本函数仅封装 API 调用；不改变任何退出流程（store.setLogout 仍由调用方负责）。
 */
export function logout(): Promise<LogoutResponse> {
  return request.post('/auth/logout');
}
