/**
 * Express Request 类型扩展
 *
 * 将 CurrentUserPayload 附加到 request.user
 */

declare global {
  namespace Express {
    interface Request {
      user?: import('../common/types').CurrentUserPayload;
    }
  }
}

export {};
