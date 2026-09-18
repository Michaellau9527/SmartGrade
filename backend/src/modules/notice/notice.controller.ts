/**
 * NoticeController — 通知接口（C03 Skeleton）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 职责：接收 HTTP 请求，调用 NoticeCapabilityService（Mock 返回）
 */

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { NoticeCapabilityService } from './notice-capability.service';

@ApiTags('学生通知')
@ApiBearerAuth()
@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeCapabilityService: NoticeCapabilityService) {}

  /** POST /notice */
  @Post()
  @ApiOperation({ summary: '发布通知（Skeleton Mock）' })
  publish(@Body() body: Record<string, unknown>) {
    return this.noticeCapabilityService.publish(body);
  }

  /** GET /notice */
  @Get()
  @ApiOperation({ summary: '通知列表（Skeleton Mock）' })
  list() {
    return this.noticeCapabilityService.list();
  }

  /** GET /notice/:id */
  @Get(':id')
  @ApiOperation({ summary: '通知详情（Skeleton Mock）' })
  detail(@Param('id') id: string) {
    return this.noticeCapabilityService.detail(id);
  }

  /** POST /notice/:id/read */
  @Post(':id/read')
  @ApiOperation({ summary: '标记已读（Skeleton Mock）' })
  read(@Param('id') id: string) {
    return this.noticeCapabilityService.read(id);
  }

  /** POST /notice/:id/ack */
  @Post(':id/ack')
  @ApiOperation({ summary: '确认阅读（Skeleton Mock）' })
  ack(@Param('id') id: string) {
    return this.noticeCapabilityService.ack(id);
  }
}
