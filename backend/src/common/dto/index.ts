import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * PaginationDto - 分页请求 DTO
 *
 * 所有列表接口统一使用此 DTO
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** 计算后的跳过数量 */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.pageSize || 20);
  }

  /** 计算后的每页数量 */
  get take(): number {
    return Math.min(this.pageSize || 20, 100);
  }
}

/**
 * IdParamDto - ID 路径参数验证
 */
export class IdParamDto {
  @Type(() => Number)
  @IsInt()
  id: number;
}