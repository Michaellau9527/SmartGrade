import { IsArray, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CompleteTodoDto - 批量完成待办
 *
 * docs/09-API.md 第九章：POST /api/v1/todos/batch-complete
 */
export class CompleteTodoDto {
  @ApiProperty({ description: '待办ID列表', example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}
