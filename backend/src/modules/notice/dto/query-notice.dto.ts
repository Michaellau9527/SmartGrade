import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * QueryNoticeDto - 通知列表查询
 *
 * docs/09-API.md 第七章：GET /api/v1/notices
 * 支持：按状态/类型/优先级/未读筛选
 */
export class QueryNoticeDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '通知状态',
    enum: ['DRAFT', 'PUBLISHED', 'WITHDRAWN'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: '发送类型',
    enum: ['ALL', 'ROLE', 'TAG', 'ORGANIZATION'],
  })
  @IsOptional()
  @IsString()
  noticeType?: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: '仅显示未读' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread?: boolean;
}
