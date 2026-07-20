import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateLeaveDto - 发起请假请求
 *
 * docs/09-API.md 第六章：POST /api/v1/leaves
 * docs/07-BusinessFlow.md 第二章：班主任选择学生 → 填写原因 → 提交
 */
export class CreateLeaveDto {
  @ApiProperty({ description: '学生ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({
    description: '请假类型',
    example: 'LEAVE_SCHOOL',
    enum: ['LEAVE_SCHOOL', 'RETURN_DORM', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  leaveType: string;

  @ApiProperty({ description: '请假原因', example: '病假，需要去医院就诊' })
  @IsString()
  @IsNotEmpty()
  leaveReason: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
