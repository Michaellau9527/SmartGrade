import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ApproveLeaveDto - 审批通过请求
 *
 * docs/09-API.md 第六章：POST /api/v1/leaves/{id}/approve
 */
export class ApproveLeaveDto {
  @ApiPropertyOptional({ description: '审批备注' })
  @IsOptional()
  @IsString()
  approveRemark?: string;
}
