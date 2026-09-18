import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteTodoDto {
  @ApiProperty({ description: '待办ID列表', example: ['abc123', 'def456'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
