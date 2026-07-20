import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateNoticeDto - 创建并发布通知
 *
 * docs/09-API.md 第七章：POST /api/v1/notices
 * docs/07-BusinessFlow.md 第七章：通知发布流程
 *
 * 创建时自动设为 PUBLISHED 状态，并批量生成 NoticeRead
 */
export class CreateNoticeDto {
  @ApiProperty({ description: '通知标题', example: '关于国庆假期安全通知' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '通知正文', example: '各位老师请注意国庆假期安全事项...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '发送类型',
    example: 'ALL',
    enum: ['ALL', 'ROLE', 'TAG', 'ORGANIZATION'],
  })
  @IsString()
  @IsNotEmpty()
  noticeType: string;

  @ApiProperty({
    description: '发送范围（JSON）',
    example: '{"type":"ALL"}',
    examples: [
      { type: 'ALL', desc: '全体教师', value: '{"type":"ALL"}' },
      { type: 'ROLE', desc: '指定角色', value: '{"type":"ROLE","roles":["ROLE_HEADMASTER"]}' },
      { type: 'TAG', desc: '指定标签', value: '{"type":"TAG","tags":[1,2]}' },
    ],
  })
  @IsString()
  @IsNotEmpty()
  publishScope: string;

  @ApiPropertyOptional({
    description: '优先级',
    example: 'NORMAL',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: '是否需要阅读确认', example: false })
  @IsOptional()
  @IsBoolean()
  needConfirm?: boolean;

  @ApiPropertyOptional({ description: '截止时间 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;
}
