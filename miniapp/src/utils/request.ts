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
  /** 单次请求超时（毫秒），默认 15s */
  timeout?: number;
  /** 是否允许 5xx 自动重试，默认 true */
  retry?: boolean;
}

/**
 * 后端 API 基地址。
 * 微信云托管后端地址：直接写死，避免 Taro defineConstant 编译期注入失败。
 */
const BASE_URL: string =
  'https://smartgrade-api-287135-10-1426534958.sh.run.tcloudbase.com/api/v1';

/** 默认超时：云托管冷启动可能耗时数秒，给足 15s */
const DEFAULT_TIMEOUT = 15000;

/** 需要自动重试的状态码：云托管缩容到 0 时网关返回 503，实例重启中返回 502/504 */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

/** 5xx 最大重试次数（总尝试次数 = 1 + MAX_RETRY） */
const MAX_RETRY = 2;

/** 重试基础退避毫秒数，实际间隔 = BASE_BACKOFF * 2^n */
const BASE_BACKOFF = 600;

/**
 * 业务码 40007 = 数据服务不可用（后端连不上数据库）。
 * 这是「确定性故障」：重试只是空等 Prisma 连接超时（每次可达 10s+），
 * 且前端多页面并发重试会放大成请求风暴。因此命中即熔断，直接对客户端报错。
 */
const CODE_DB_UNAVAILABLE = 40007;

/** 熔断冷却时长（毫秒）：期间所有请求本地快速失败，不再打网络 */
const BACKEND_DOWN_COOLDOWN = 30000;

/** 熔断截止时间戳，0 表示正常 */
let backendDownUntil = 0;

/** 熔断时的提示文案 */
let backendDownMessage = '';

/** 标记后端不可用，进入冷却 */
function markBackendDown(message: string): void {
  backendDownUntil = Date.now() + BACKEND_DOWN_COOLDOWN;
  backendDownMessage = message || '数据服务暂时不可用，请稍后重试';
}

/** 后端是否处于熔断冷却中 */
export function isBackendDown(): boolean {
  return Date.now() < backendDownUntil;
}

/** 获取后端故障状态，供页面渲染统一提示 */
export function getBackendStatus(): { down: boolean; message: string } {
  return {
    down: isBackendDown(),
    message: backendDownMessage || '数据服务暂时不可用，请稍后重试'
  };
}

/** 用户手动重试时调用，清除熔断状态 */
export function resetBackendStatus(): void {
  backendDownUntil = 0;
  backendDownMessage = '';
}

/** 登录态刷新后需要同步给 user store，由 app.ts 注入，避免 request <-> store 循环依赖 */
export interface RefreshedUserInfo {
  token: string;
  teacherNo: string;
  teacherName: string;
  roles: string[];
  permissions: string[];
}
type TokenRefreshHandler = (info: RefreshedUserInfo) => void;
let tokenRefreshHandler: TokenRefreshHandler | null = null;

/** 由 app.ts 调用，注册登录态同步回调 */
export function configureRequest(options: {
  onTokenRefreshed?: TokenRefreshHandler;
}): void {
  if (options.onTokenRefreshed) {
    tokenRefreshHandler = options.onTokenRefreshed;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 读取当前 token */
export function getToken(): string {
  const token = Taro.getStorageSync('token');
  return typeof token === 'string' ? token : '';
}

function buildHeader(options: RequestOptions, token: string): Record<string, string> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.header || {})
  };
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  return header;
}

/**
 * 底层单次请求：不带任何重试/重登录逻辑，供上层编排使用。
 * 网络层异常（超时、断网）统一归一成 statusCode = 0。
 */
async function rawRequest<T>(
  url: string,
  options: RequestOptions = {},
  token?: string
): Promise<{ statusCode: number; body: ApiResponse<T> | null }> {
  const bearer = token === undefined ? getToken() : token;
  const res = await Taro.request<unknown>({
    url: BASE_URL + url,
    method: options.method || 'GET',
    data: options.data,
    header: buildHeader(options, bearer),
    timeout: options.timeout ?? DEFAULT_TIMEOUT
  });

  const statusCode = typeof res.statusCode === 'number' ? res.statusCode : 0;
  const body = (res.data ?? null) as ApiResponse<T> | null;
  return { statusCode, body };
}

/** 是否可重试：网络层失败(0) 或 网关类 5xx */
function isRetryable(statusCode: number): boolean {
  return statusCode === 0 || RETRYABLE_STATUS.has(statusCode);
}

/**
 * 静默重新登录。
 * 用 Promise 单例保证并发请求只触发一次登录，避免 401 风暴。
 */
let reloginPromise: Promise<string> | null = null;

function relogin(): Promise<string> {
  if (reloginPromise) {
    return reloginPromise;
  }

  reloginPromise = (async () => {
    // 真实微信登录：用 wx.login 的 code 换 token（不再使用写死的工号）
    const { code } = await Taro.login();
    const { statusCode, body } = await rawRequest<{
      token: string;
      teacher: { teacherNo: string; name: string };
      roles: string[];
      permissions: string[];
    }>('/auth/login', { method: 'POST', data: { code }, retry: false }, '');

    if (!body || body.code !== 0 || !body.data?.token) {
      throw new Error(body?.message || `登录失败 (${statusCode})`);
    }

    const d = body.data;
    Taro.setStorageSync('token', d.token);
    Taro.setStorageSync('teacherNo', d.teacher.teacherNo);
    Taro.setStorageSync('teacherName', d.teacher.name);
    Taro.setStorageSync('roles', d.roles ?? []);
    Taro.setStorageSync('permissions', d.permissions ?? []);

    tokenRefreshHandler?.({
      token: d.token,
      teacherNo: d.teacher.teacherNo,
      teacherName: d.teacher.name,
      roles: d.roles ?? [],
      permissions: d.permissions ?? []
    });

    return d.token;
  })().finally(() => {
    // 允许后续重新登录，但立即清空以便下次 401 重新触发
    reloginPromise = null;
  });

  return reloginPromise;
}

/**
 * 统一请求工具：
 * - 自动拼接 API_BASE_URL
 * - 自动从 Taro storage 读取 token 并写入 Authorization header
 * - 解析后端统一响应 {code,message,data}，code !== 0 抛错，否则返回 data
 * - 5xx / 网络失败自动重试（应对云托管冷启动）
 * - 401 自动静默重登录一次并重放请求
 *
 * 注意：这里直接从 storage 读 token，而不是 import user store，
 * 是为了避免 request 与 store 之间的循环依赖。
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const allowRetry = options.retry !== false;
  let lastError: Error = new Error(`请求失败: ${url}`);

  // ---- 熔断：后端已判定不可用时，本地快速失败，杜绝请求风暴 ----
  if (isBackendDown()) {
    throw new Error(getBackendStatus().message);
  }

  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    if (attempt > 0) {
      await sleep(BASE_BACKOFF * Math.pow(2, attempt - 1));
    }

    let statusCode = 0;
    let body: ApiResponse<T> | null = null;

    try {
      const result = await rawRequest<T>(url, options);
      statusCode = result.statusCode;
      body = result.body;
    } catch (err) {
      // Taro.request 网络层 reject（超时 / 断网 / DNS 失败）
      lastError = new Error(`网络异常，请检查网络后重试 (${url})`);
      if (!allowRetry || attempt === MAX_RETRY) {
        throw lastError;
      }
      continue;
    }

    // ---- 数据服务不可用：立即熔断，不重试（重试只会空等 DB 连接超时）----
    if (body?.code === CODE_DB_UNAVAILABLE) {
      markBackendDown(body.message);
      throw new Error(getBackendStatus().message);
    }

    // ---- 401：静默重登录一次并重放 ----
    if (statusCode === 401 && allowRetry) {
      try {
        const newToken = await relogin();
        const replay = await rawRequest<T>(url, options, newToken);
        statusCode = replay.statusCode;
        body = replay.body;
        // 重放后仍 401 说明该账号确实无权限，走下方统一抛错
      } catch (err) {
        // 登录失败（DB 不可用等）：清掉失效 token，避免后续请求继续带脏 token
        Taro.removeStorageSync('token');
        throw new Error(
          err instanceof Error ? `登录失败：${err.message}` : '登录失败，请稍后重试'
        );
      }
    }

    // ---- 5xx / 网络层失败：退避重试 ----
    if (isRetryable(statusCode)) {
      lastError = new Error(
        statusCode === 0
          ? `网络异常，请检查网络后重试 (${url})`
          : `服务暂时不可用 (${statusCode})，正在重试…`
      );
      if (!allowRetry || attempt === MAX_RETRY) {
        throw new Error(
          statusCode === 0
            ? `网络异常，请检查网络后重试 (${url})`
            : `服务暂时不可用 (${statusCode})，请稍后重试`
        );
      }
      continue;
    }

    if (statusCode < 200 || statusCode >= 300) {
      const serverMsg = body?.message;
      throw new Error(serverMsg || `请求失败 (${statusCode}): ${url}`);
    }

    if (!body || typeof body.code !== 'number') {
      throw new Error(`响应格式异常: ${url}`);
    }
    if (body.code !== 0) {
      throw new Error(body.message || `请求错误: code=${body.code}`);
    }
    return body.data;
  }

  throw lastError;
}

export default request;
