import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * AllExceptionsFilter - 全局异常过滤器
 *
 * 统一捕获所有异常，返回标准 API 响应格式
 *
 * 关键约束（安全）：
 * - 未知异常（Prisma / 驱动 / 运行时错误）的原始 message **绝不下发给客户端**。
 *   Prisma 的连接错误会完整携带内网数据库地址、端口、账号结构，
 *   直接回传等于把内网拓扑暴露到公网。服务端完整记录日志，客户端只拿到脱敏提示。
 */

/** Prisma 数据库连接/可用性类错误码（P1xxx），出现即代表 DB 暂时不可用 */
const PRISMA_CONNECTIVITY_CODES = new Set([
  'P1000', // 认证失败
  'P1001', // 无法连接数据库服务器
  'P1002', // 已连通但超时
  'P1008', // 操作超时
  'P1010', // 拒绝访问
  'P1017', // 服务端关闭连接
]);

/** 连接类错误在 message 中的特征串（Prisma 不同版本文案略有差异） */
const PRISMA_CONNECTIVITY_MARKERS = [
  "Can't reach database server",
  'Timed out fetching a new connection',
  'Server has closed the connection',
  'Connection pool timeout',
  'db server is not available',
];

/**
 * AllExceptionsFilter - 全局异常过滤器（实现见上方说明）
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  /** 判定是否为数据库连接类异常 */
  private isDatabaseUnavailable(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }
    const err = exception as { code?: unknown; message?: unknown; name?: unknown };

    const code = typeof err.code === 'string' ? err.code : '';
    if (PRISMA_CONNECTIVITY_CODES.has(code)) {
      return true;
    }

    const message = typeof err.message === 'string' ? err.message : '';
    return PRISMA_CONNECTIVITY_MARKERS.some((marker) => message.includes(marker));
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 40007;

    // ---------- 数据库不可用：最高优先级判定 ----------
    // 必须在 HttpException 分支之前，否则会被归入通用 500 并泄漏原始错误
    if (this.isDatabaseUnavailable(exception)) {
      const raw = exception instanceof Error ? exception.message : String(exception);
      // 完整错误只进服务端日志，便于运维排查
      this.logger.error(`[DB UNAVAILABLE] ${raw}`);

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        code: 40007,
        message: '数据服务暂时不可用，请稍后重试',
        data: null,
      });
      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        // 若是 NestJS validation 错误，取第一个错误信息
        if (Array.isArray(res.message)) {
          message = res.message[0];
        }
      } else {
        message = exceptionResponse as string;
      }

      // 映射 HTTP 状态码到业务错误码
      if (status === HttpStatus.UNAUTHORIZED) code = 40002;
      else if (status === HttpStatus.FORBIDDEN) code = 40001;
      else if (status === HttpStatus.NOT_FOUND) code = 40005;
      else if (status === HttpStatus.BAD_REQUEST) code = 40004;
      else code = 40007;
    } else if (exception instanceof Error) {
      // 未知运行时错误：记录完整堆栈，但对外只给脱敏提示
      const isDev = process.env.NODE_ENV === 'development';
      message = isDev ? exception.message : '服务器内部错误';
      this.logger.error(`[UNHANDLED] ${exception.message}`, exception.stack);
    }

    // 非 4xx 错误记录日志
    if (status >= 500) {
      this.logger.error(`[${status}] ${message}`, exception instanceof Error ? exception.stack : '');
    }

    response.status(status).json({
      code,
      message,
      data: null,
    });
  }
}