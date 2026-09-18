import { request } from '../utils/request';

/** 登录接口返回的教师信息 */
export interface TeacherInfo {
  id: string;
  teacherNo: string;
  name: string;
  gender: string;
  avatar: string;
  position: string;
}

/** 登录接口返回的 data 部分 */
export interface LoginResult {
  teacher: TeacherInfo;
  roles: string[];
  permissions: string[];
  tags: unknown[];
  token: string;
  refreshToken: string;
  expiresIn: string;
}

interface LoginRequest {
  code: string;
}

/**
 * 调用 POST /auth/login 进行微信登录
 * @param code wx.login() 返回的临时登录凭证
 * @returns 登录结果（已由 request 工具解包 data 部分）
 */
export function login(code: string): Promise<LoginResult> {
  const payload: LoginRequest = { code };
  return request<LoginResult>('/auth/login', {
    method: 'POST',
    data: payload
  });
}
