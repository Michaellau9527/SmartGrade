import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RejectLeaveDto - 拒绝请假请求
 *
 * docs/09-API.md 第六章：POST /api/v1/leaves/{id}/reject
 * 拒绝原因必填
 */
export class RejectLeaveDto {
  @ApiProperty({ description: '拒绝原因', example: '请假天数超出规定范围' })
  @IsString()
  @IsNotEmpty()
  rejectReason: string;
}
