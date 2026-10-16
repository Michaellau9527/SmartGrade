import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

/**
 * 查询学生列表 DTO
 *
 * 支持 docs/09-API.md 第五章查询参数 + 数据权限自动过滤
 *
 * 注意：classId/gradeId 为 VARCHAR(36)（生产 init_db.sql 实证），必须是字符串。
 * 旧定义 @IsInt + @Type(Number) 会把 cuid/UUID 转成 NaN 直接 400。
 */
export class QueryStudentDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键词（姓名或学号）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '班级ID（cuid/UUID 字符串）' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: '年级ID（cuid/UUID 字符串）' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: '住宿类型', enum: ['DAY_STUDENT', 'BOARDING'] })
  @IsOptional()
  @IsString()
  @IsIn(['DAY_STUDENT', 'BOARDING'])
  boardingType?: string;

  @ApiPropertyOptional({ description: '学生状态（筛选口径，服务端映射到 currentStatus）', enum: ['IN_SCHOOL', 'PENDING_LEAVE', 'LEFT_SCHOOL'] })
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
 * 字段对应 DB-008 Student 表。命名统一 camelCase（2026-10-16 契约对齐）：
 * dormRoomId / parentName / parentPhone（旧 snake_case 已废弃，
 * 全局 ValidationPipe forbidNonWhitelisted 会直接拒绝旧字段名）。
 *
 * 说明：parentName / parentPhone 当前版本仅做接口预留（Student 家长信息
 * 存在于 StudentParent 关联表，创建流程暂不落库），字段可传、不报错、不写入。
 */
export class CreateStudentDto {
  @ApiProperty({ description: '学号', example: 'S2024001' })
  @IsString()
  studentNo: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString()
  name: string;

  @ApiProperty({ description: '性别', enum: ['MALE', 'FEMALE'], example: 'MALE' })
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender: string;

  @ApiProperty({ description: '班级ID（cuid/UUID 字符串）' })
  @IsString()
  classId: string;

  @ApiProperty({ description: '住宿类型', enum: ['DAY_STUDENT', 'BOARDING'], example: 'BOARDING' })
  @IsString()
  @IsIn(['DAY_STUDENT', 'BOARDING'])
  boardingType: string;

  @ApiPropertyOptional({ description: '宿舍房间ID（DormRoom 的 cuid）' })
  @IsOptional()
  @IsString()
  dormRoomId?: string;

  @ApiPropertyOptional({ description: '床位号' })
  @IsOptional()
  @IsString()
  bedNo?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '家长姓名（预留，暂不落库）' })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiPropertyOptional({ description: '家长电话（预留，暂不落库）' })
  @IsOptional()
  @IsString()
  parentPhone?: string;
}

/**
 * 修改学生 DTO
 *
 * 所有字段可选；命名 camelCase（同 CreateStudentDto）。
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

  @ApiPropertyOptional({ description: '住宿类型', enum: ['DAY_STUDENT', 'BOARDING'] })
  @IsOptional()
  @IsString()
  @IsIn(['DAY_STUDENT', 'BOARDING'])
  boardingType?: string;

  @ApiPropertyOptional({ description: '宿舍房间ID（DormRoom 的 cuid）' })
  @IsOptional()
  @IsString()
  dormRoomId?: string;

  @ApiPropertyOptional({ description: '床位号' })
  @IsOptional()
  @IsString()
  bedNo?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '家长姓名（预留，暂不落库）' })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiPropertyOptional({ description: '家长电话（预留，暂不落库）' })
  @IsOptional()
  @IsString()
  parentPhone?: string;
}

/**
 * 设置住宿信息 DTO
 *
 * dormRoomId 为 DormRoom 的 cuid 字符串（旧定义 @IsInt 与生产数据形态不符）。
 */
export class SetDormitoryDto {
  @ApiProperty({ description: '宿舍房间ID（DormRoom 的 cuid）' })
  @IsString()
  dormRoomId: string;

  @ApiProperty({ description: '床位号', example: 'A01' })
  @IsString()
  bedNo: string;
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
