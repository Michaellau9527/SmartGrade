/**
 * NoticeModule — 学生通知模块（C03 Skeleton）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 兼容保留：
 * - NoticeService（旧版 CRUD 服务，供 Workbench / Leave / Todo 等模块调用）
 */

import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeCapabilityService } from './notice-capability.service';
import { NoticeDomainService } from './notice-domain.service';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';

@Module({
  controllers: [NoticeController],
  providers: [
    NoticeCapabilityService,
    NoticeDomainService,
    NoticeRepository,
    NoticeService,
  ],
  exports: [NoticeCapabilityService, NoticeService],
})
export class NoticeModule {}
