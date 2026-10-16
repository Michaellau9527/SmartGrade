import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto';

/**
 * GET /leaves 查询参数 DTO
 *
 * 继承 PaginationDto（page/pageSize，page>=1，1<=pageSize<=100）。
 * 注意：全局 ValidationPipe 为 whitelist + forbidNonWhitelisted，
 * query 中出现的每个键都必须在此显式声明，否则直接 400。
 *
 * status / leaveType 不做枚举硬校验：非法值由查询自然为空兜底，
 * 状态机合法性在写路径 DomainService 强制，读路径保持宽松向后兼容。
 */
export class LeaveListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  leaveType?: string;
}
