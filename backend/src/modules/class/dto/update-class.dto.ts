import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ClassStatus } from '@prisma/client';

/**
 * 修改班级入参（全部可选）
 *
 * 同 CreateClassDto：`schoolId` 不接受前端传入，换年级时由服务端重新推导。
 */
export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  gradeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

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
