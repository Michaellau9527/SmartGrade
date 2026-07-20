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
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 40007;

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
      message = exception.message;
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