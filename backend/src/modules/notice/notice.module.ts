/**
 * NoticeModule — 学生通知模块（C03）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 六层流水线：
 *   NoticeController
 *       ↓
 *   NoticeCapabilityService（编排）
 *       ↓
 *   NoticeDomainService（规则）+ NoticeRepository + TimelineRepository
 *       ↓
 *   TimelineEvent（强一致）
 *       ↓
 *   Prisma
 *
 * 兼容保留：
 * - NoticeService（旧版 CRUD 服务，供 Workbench / Leave / Todo 等模块调用 sendSystemNotice）
 */

import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeCapabilityService } from './notice.capability-service';
import { NoticeDomainService } from './notice.domain-service';
import { NoticeService } from './notice.service';
import { noticeRepository } from '../../repositories/notice.repository';
import { timelineRepository } from '../../repositories/timeline.repository';

@Module({
  controllers: [NoticeController],
  providers: [
    // C03 Capability 层（新）
    {
      provide: NoticeCapabilityService,
      useFactory: () => {
        return new NoticeCapabilityService({
          noticeRepository,
          timelineRepository,
          domainService: new NoticeDomainService(),
        });
      },
    },
    // 旧版服务（兼容保留，供其他模块调用 sendSystemNotice）
    NoticeService,
  ],
  exports: [NoticeCapabilityService, NoticeService],
})
export class NoticeModule {}
