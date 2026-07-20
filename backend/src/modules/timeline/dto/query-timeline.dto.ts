import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * QueryTimelineDto - 时间轴列表查询
 *
 * docs/09-API.md 第十章：GET /api/v1/timelines
 * 支持：按学生/教师/事件类型/时间范围/业务关联筛选
 */
export class QueryTimelineDto extends PaginationDto {
  @ApiPropertyOptional({ description: '学生ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({ description: '操作教师ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @ApiPropertyOptional({
    description: '事件类型',
    enum: [
      'LEAVE_APPLY', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED',
      'LEFT_SCHOOL', 'RETURN_SCHOOL', 'CHECKOUT_DORM', 'CHECKIN_DORM',
      'DORM_EXCEPTION', 'NOTICE_PUSH', 'TODO_CREATED', 'SYSTEM',
    ],
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '业务类型筛选（如 LEAVE/NOTICE/DORM）' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ description: '业务来源ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;
}
