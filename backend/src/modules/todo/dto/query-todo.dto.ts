import { IsOptional, IsString, IsInt, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * QueryTodoDto - 待办列表查询
 *
 * docs/09-API.md 第九章：GET /api/v1/todos
 * 支持：按状态/业务类型/优先级筛选
 * 默认只显示 TODO 和 PROCESSING 状态
 */
export class QueryTodoDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '待办状态',
    enum: ['TODO', 'PROCESSING', 'DONE', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '业务类型（LEAVE/NOTICE/DORM）' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  priority?: string;
}
