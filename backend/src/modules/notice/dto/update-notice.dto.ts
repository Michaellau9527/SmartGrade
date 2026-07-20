import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateNoticeDto - 修改通知（仅 DRAFT 状态可修改）
 *
 * docs/09-API.md 第七章：PUT /api/v1/notices/{id}
 * docs/07-BusinessFlow.md：发布后不可修改内容，仅允许撤回
 */
export class UpdateNoticeDto {
  @ApiPropertyOptional({ description: '通知标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '通知正文' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: '截止时间 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;
}
