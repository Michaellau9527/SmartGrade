import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckDormDto {
  @ApiProperty({ description: '查寝结果', enum: ['NORMAL', 'ABSENT', 'LATE', 'NIGHT_OUT'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '学生ID列表', example: [1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  studentIds: number[];
}
