import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
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
  (response: AxiosResponse) => response.data,
  (error: unknown) => {
    const err = error as { response?: { status: number; data?: { message?: string } }; message?: string };
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
