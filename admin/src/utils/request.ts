import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

const request: AxiosInstance = axios.create({
  // 生产环境由 .env.production 的 VITE_API_BASE_URL 注入绝对地址（CloudBase 纯静态托管下
  // 无同源代理，必须指向云托管后端域名）；本地 dev 未配置时回退到相对路径 /api/v1（依赖 vite proxy）。
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      // 注入当前角色，供 MSW Mock 数据过滤使用
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw) as { roles?: string[] };
          if (parsed.roles && parsed.roles.length > 0) {
            config.headers['X-Mock-Role'] = parsed.roles[0];
          }
        } catch {
          // ignore parse error
        }
      }
      // 开发环境：注入异常模拟 header
      if (import.meta.env.DEV) {
        const mockError = localStorage.getItem('mock_error');
        if (mockError) {
          config.headers['X-Mock-Error'] = mockError;
        }
        const mockEmpty = localStorage.getItem('mock_empty');
        if (mockEmpty) {
          config.headers['X-Mock-Empty'] = mockEmpty;
        }
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    // 真实后端经 TransformInterceptor 包装为 { code, message, data }；
    // MSW Mock 返回原始结构（无数值顶层 code 键），需兼容。
    // 精确判定 typeof code === 'number' 且含 data 字段，避免业务实体含 code 字符串被误拆。
    if (
      body &&
      typeof body === 'object' &&
      typeof (body as { code?: unknown }).code === 'number' &&
      'data' in body
    ) {
      return (body as { data: unknown }).data;
    }
    return body;
  },
  (error: unknown) => {
    const err = error as {
      config?: { url?: string };
      response?: { status: number; data?: { message?: string }; config?: { url?: string } };
      message?: string;
    };
    // 登录接口（login-with-password）的失败属于“登录凭证问题”，不属于“已登录会话过期”，
    // 也不应由全局拦截器弹 Toast。统一交由登录页内联 Alert 展示：此处短路返回，
    // 不弹全局提示、不清 Token、不执行整页跳转。其余请求维持原有全局处理。
    const reqUrl = err.config?.url || err.response?.config?.url || '';
    if (reqUrl.includes('login-with-password')) {
      return Promise.reject(error);
    }
    if (!err.response) {
      message.error('网络异常，请检查网络连接');
      return Promise.reject(error);
    }
    const { status, data } = err.response;
    const msg = data?.message || err.message || '请求失败';
    switch (status) {
      case 401:
      message.warning('登录已过期，请重新登录');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      window.location.href = '/login';
      break;
      case 403:
        message.error('您没有权限执行此操作');
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 500:
        message.error('服务器内部错误，请稍后重试');
        break;
      default:
        message.error(msg);
    }
    return Promise.reject(error);
  },
);

export { request };
