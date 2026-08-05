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
  teacherNo: string;
}

/**
 * 调用 POST /auth/login 进行登录
 * @param teacherNo 工号
 * @returns 登录结果（已由 request 工具解包 data 部分）
 */
export async function mockLogin(teacherNo: string): Promise<LoginResult> {
  const payload: LoginRequest = { teacherNo };
  const res = await request<LoginResult>('/auth/login', {
    method: 'POST',
    data: payload
  });
  console.log('[auth login 返回]', res);
  return res;
}
