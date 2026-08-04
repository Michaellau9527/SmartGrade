import Taro from '@tarojs/taro';

/** 后端统一响应包装 */
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: Record<string, unknown> | unknown;
  header?: Record<string, string>;
}

/**
 * API 基地址，由 Taro defineConstant 在编译期通过 webpack DefinePlugin
 * 注入为自由标识符 API_BASE_URL（字符串形如 "https://xxx/api/v1"，
 * 已包含 /api/v1 前缀）。直接引用该标识符即可在编译期被替换为字面量。
 * 类型声明见 src/global.d.ts。
 */
const BASE_URL: string = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';

/**
 * 统一请求工具：
 * - 自动拼接 API_BASE_URL
 * - 自动从 Taro storage 读取 token 并写入 Authorization header
 * - 解析后端统一响应 {code,message,data}，code !== 0 抛错，否则返回 data
 *
 * 注意：这里直接从 storage 读 token，而不是 import user store，
 * 是为了避免 request 与 store 之间的循环依赖。
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const token = Taro.getStorageSync('token') as string | '';

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.header || {})
  };
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  const fullUrl = BASE_URL + url;

  const res = await Taro.request<unknown>({
    url: fullUrl,
    method: options.method || 'GET',
    data: options.data,
    header
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`请求失败 (${res.statusCode}): ${url}`);
  }

  const body = res.data as ApiResponse<T>;
  if (!body || typeof body.code !== 'number') {
    throw new Error(`响应格式异常: ${url}`);
  }
  if (body.code !== 0) {
    throw new Error(body.message || `请求错误: code=${body.code}`);
  }
  return body.data;
}

export default request;
