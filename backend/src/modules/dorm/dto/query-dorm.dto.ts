import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto';

export class QueryDormDto extends PaginationDto {
  @ApiPropertyOptional({ description: '公寓ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dormitoryId?: number;

  @ApiPropertyOptional({ description: '楼层' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ description: '性别 MALE/FEMALE' })
  @IsOptional()
  @IsString()
  gender?: string;
}
