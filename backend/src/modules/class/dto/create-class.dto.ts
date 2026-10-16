import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ClassStatus } from '@prisma/client';

/**
 * 新增班级入参
 *
 * 安全说明：`schoolId` 刻意**不**接受前端传入 —— 由服务端依据 gradeId 对应的
 * 年级所属学校推导，避免跨校注入。`gradeId` 对年级主任而言仅作「期望值」，
 * 服务端会以其真实授权范围（DataScope.gradeId）为准进行强制校验。
 */
export class CreateClassDto {
  @IsString()
  @MinLength(1, { message: '年级不能为空' })
  gradeId!: string;

  @IsString()
  @MinLength(1, { message: '班级编码不能为空' })
  @MaxLength(30, { message: '班级编码不能超过 30 个字符' })
  code!: string;

  @IsString()
  @MinLength(1, { message: '班级名称不能为空' })
  @MaxLength(50, { message: '班级名称不能超过 50 个字符' })
  name!: string;

  @IsOptional()
  @IsString()
  headTeacherId?: string | null;

  @IsOptional()
  @IsString()
  viceHeadTeacherId?: string | null;

  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
