import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * QueryLeaveDto - 请假列表查询
 *
 * docs/09-API.md 第六章：GET /api/v1/leaves
 * 支持分页、状态筛选、学生/班级筛选、日期筛选、关键词搜索
 */
export class QueryLeaveDto extends PaginationDto {
  @ApiPropertyOptional({ description: '请假状态', enum: ['PENDING', 'APPROVED', 'REJECTED', 'LEFT', 'FINISHED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '学生ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({ description: '班级ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({ description: '日期筛选 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: '关键词搜索（学号/姓名/请假单号）' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
