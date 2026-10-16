import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto';

export class ClassQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
