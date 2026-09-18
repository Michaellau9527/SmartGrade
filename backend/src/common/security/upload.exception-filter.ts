import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { MulterError } from 'multer';
import type { Response } from 'express';

/**
 * 上传异常过滤器（P1-3）
 *
 * Multer 在超限/字段数超限时抛出 MulterError，Nest 默认会转成 500。
 * 这里捕获并统一返回项目风格的业务错误（400 + code 40004），
 * 便于前端按现有约定展示「文件过大」等可读提示。
 *
 * 注：本过滤器独立于全局 AllExceptionsFilter（P0-6），不改动 P0 代码。
 */
@Catch(MulterError)
export class UploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let message = '文件上传失败，请重试';
    if (exception.code === 'LIMIT_FILE_SIZE') {
      message = '文件大小超过限制';
    } else if (exception.code === 'LIMIT_FILE_COUNT' || exception.code === 'LIMIT_UNEXPECTED_FILE') {
      message = '文件数量或字段不符合要求';
    }
    res.status(400).json({
      code: 40004,
      message,
      data: null,
    });
  }
}
