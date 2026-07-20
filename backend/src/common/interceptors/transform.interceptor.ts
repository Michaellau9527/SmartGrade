import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * TransformInterceptor - 响应转换拦截器
 *
 * 将所有成功响应统一包装为 { code: 0, message: 'success', data: ... }
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TransformInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 如果已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        return {
          code: 0,
          message: 'success',
          data: data ?? null,
        };
      }),
    );
  }
}