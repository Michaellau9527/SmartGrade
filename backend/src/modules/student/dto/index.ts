import { IsOptional, IsString, IsInt, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * 查询学生列表 DTO
 *
 * 支持 docs/09-API.md 第五章查询参数 + 数据权限自动过滤
 */
export class QueryStudentDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键词（姓名或学号）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '班级ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({ description: '年级ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeId?: number;

  @ApiPropertyOptional({ description: '住宿类型', enum: ['DAY', 'BOARDING'] })
  @IsOptional()
  @IsString()
  @IsIn(['DAY', 'BOARDING'])
  boardingType?: string;

  @ApiPropertyOptional({ description: '学生状态', enum: ['IN_SCHOOL', 'PENDING_LEAVE', 'LEFT_SCHOOL'] })
  @IsOptional()
  @IsString()
  @IsIn(['IN_SCHOOL', 'PENDING_LEAVE', 'LEFT_SCHOOL'])
  status?: string;

  @ApiPropertyOptional({ description: '性别', enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender?: string;
}

/**
 * 创建学生 DTO
 *
 * 字段对应 DB-008 Student 表
 */
export class CreateStudentDto {
  @ApiProperty({ description: '学号', example: 'S2024001' })
  @IsString()
  student_no: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString()
  name: string;

  @ApiProperty({ description: '性别', enum: ['MALE', 'FEMALE'], example: 'MALE' })
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender: string;

  @ApiProperty({ description: '班级ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  class_id: number;

  @ApiProperty({ description: '住宿类型', enum: ['DAY', 'BOARDING'], example: 'DAY' })
  @IsString()
  @IsIn(['DAY', 'BOARDING'])
  boarding_type: string;

  @ApiPropertyOptional({ description: '宿舍房间ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dorm_room_id?: number;

  @ApiPropertyOptional({ description: '床位号' })
  @IsOptional()
  @IsString()
  bed_no?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '家长姓名' })
  @IsOptional()
  @IsString()
  parent_name?: string;

  @ApiPropertyOptional({ description: '家长电话' })
  @IsOptional()
  @IsString()
  parent_phone?: string;
}

/**
 * 修改学生 DTO
 *
 * 所有字段可选
 */
export class UpdateStudentDto {
  @ApiPropertyOptional({ description: '姓名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '性别', enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender?: string;

  @ApiPropertyOptional({ description: '住宿类型', enum: ['DAY', 'BOARDING'] })
  @IsOptional()
  @IsString()
  @IsIn(['DAY', 'BOARDING'])
  boarding_type?: string;

  @ApiPropertyOptional({ description: '宿舍房间ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dorm_room_id?: number;

  @ApiPropertyOptional({ description: '床位号' })
  @IsOptional()
  @IsString()
  bed_no?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '家长姓名' })
  @IsOptional()
  @IsString()
  parent_name?: string;

  @ApiPropertyOptional({ description: '家长电话' })
  @IsOptional()
  @IsString()
  parent_phone?: string;
}

/**
 * 设置住宿信息 DTO
 */
export class SetDormitoryDto {
  @ApiProperty({ description: '宿舍房间ID' })
  @IsInt()
  @Type(() => Number)
  dorm_room_id: number;

  @ApiProperty({ description: '床位号', example: 'A01' })
  @IsString()
  bed_no: string;
}

/**
 * Excel 导入预留 DTO
 *
 * 暂不实现文件解析，仅预留接口
 */
export class ImportStudentDto {
  @ApiProperty({ description: 'Excel 文件', type: 'string', format: 'binary' })
  file: any;
}
