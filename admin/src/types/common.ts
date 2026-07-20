/** 通用 API 分页请求参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 通用 API 分页响应 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 通用 API 响应包装 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  code?: number;
}