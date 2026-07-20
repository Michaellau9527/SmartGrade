/**
 * NoticeCapabilityService — 通知业务编排
 *
 * 上游规则：Sprint 2.2 C03 §5.1 六层流水线 — 刘老师拍板
 *
 * 职责："这一件事情怎么完成"
 * - 编排：Notice 创建/发布 + NoticeRead 标记 + Timeline 写入 + 事务保证
 * - 调用 DomainService 校验状态机
 * - 调用 Repository 读写数据
 *
 * Timeline 强一致（§5.2）：
 * Notice 更新 + TimelineEvent 创建在同一个 Prisma 事务内完成。
 * 任何一步失败 → 整个事务回滚。
 */

import type { Prisma, Notice as PrismaNotice, NoticeRead as PrismaNoticeRead } from '@prisma/client';
import type { AuthorizationContext } from '../authorization/types';
import type { TxClient } from '../../repositories/base.repository';
import { NoticeRepository } from '../../repositories/notice.repository';
import { TimelineRepository, type CreateTimelineEventInput } from '../../repositories/timeline.repository';
import { NoticeDomainService, NoticeNotFoundError, NoticeStateTransitionError } from './notice.domain-service';
import type {
  NoticeResponse,
  NoticeListItem,
  NoticeTimelineEvent,
  CreateNoticeRequest,
  PublishNoticeRequest,
} from '@smartgrade/shared/types/notice/NoticeResponse';
import type { NoticeStatus } from '@smartgrade/shared/types/domain/enums/NoticeStatus';

// ============================================================
// 依赖接口（便于测试 mock）
// ============================================================

export interface NoticeCapabilityDeps {
  noticeRepository: NoticeRepository;
  timelineRepository: TimelineRepository;
  domainService: NoticeDomainService;
}

// ============================================================
// NoticeCapabilityService
// ============================================================

export class NoticeCapabilityService {
  constructor(private deps: NoticeCapabilityDeps) {}

  // ============================================================
  // 1. 创建通知草稿 → DRAFT
  // ============================================================

  async createNotice(req: CreateNoticeRequest, ctx: AuthorizationContext): Promise<NoticeResponse> {
    const { actor, authorization } = ctx;
    const organization = authorization.organization;
    const { noticeRepository, timelineRepository, domainService } = this.deps;

    const initialState = domainService.getInitialState(); // DRAFT
    const noticeNo = this._generateNoticeNo();

    // 事务：创建 Notice + 写 Timeline（强一致）
    const record = await noticeRepository.withTransaction(async (tx) => {
      const created = await noticeRepository.create(
        {
          noticeNo,
          title: req.title,
          content: req.content,
          contentFormat: req.contentFormat ?? 'PLAIN',
          noticeType: req.noticeType as any,
          targets: req.targets as any,
          requireConfirm: req.requireConfirm ?? false,
          confirmDeadline: req.confirmDeadline ? new Date(req.confirmDeadline) : null,
          status: initialState,
          publisherId: actor.teacherId ?? actor.userId,
          publisherName: actor.teacherId ? '教师' : actor.userId,
          schoolId: organization.schoolId,
        } as Prisma.NoticeCreateInput,
        tx,
      );

      // 写 Timeline（NOTICE_CREATED）— 必须成功
      await timelineRepository.create(
        {
          eventType: 'NOTICE_CREATED' as any,
          eventSource: 'NOTICE' as any,
          sourceEventId: created.id,
          operatorId: actor.teacherId ?? actor.userId,
          operatorName: actor.teacherId ? '教师' : actor.userId,
          operatorRole: actor.userType,
          metadata: {
            noticeNo: created.noticeNo,
            title: req.title,
            noticeType: req.noticeType,
            status: initialState,
          },
          occurredAt: new Date(),
          schoolId: organization.schoolId,
          noticeId: created.id,
        } as CreateTimelineEventInput,
        tx,
      );

      return created;
    });

    return this._toResponse(record, null, []);
  }

  // ============================================================
  // 2. 发布通知 → PUBLISHED
  // ============================================================

  async publishNotice(id: string, _req: PublishNoticeRequest, ctx: AuthorizationContext): Promise<NoticeResponse> {
    const { actor } = ctx;
    const { noticeRepository, timelineRepository, domainService } = this.deps;

    const record = await noticeRepository.findById(id);
    if (!record) throw new NoticeNotFoundError(id);

    // DomainService 校验状态机
    const eventType = domainService.validateTransition(record.status as NoticeStatus, 'PUBLISHED');

    // 事务：发布 + Timeline
    const updated = await noticeRepository.withTransaction(async (tx) => {
      const result = await noticeRepository.publish(id, tx);

      await timelineRepository.create(
        {
          eventType: eventType as any,
          eventSource: 'NOTICE' as any,
          sourceEventId: id,
          operatorId: actor.teacherId ?? actor.userId,
          operatorName: actor.teacherId ? '教师' : actor.userId,
          operatorRole: actor.userType,
          metadata: {
            noticeNo: result.noticeNo,
            title: result.title,
            from: record.status,
            to: 'PUBLISHED',
          },
          occurredAt: new Date(),
          schoolId: result.schoolId,
          noticeId: id,
        } as CreateTimelineEventInput,
        tx,
      );

      return result;
    });

    const readRecord = await noticeRepository.findById(id, true);
    const timelines = await timelineRepository.findByRelated('NOTICE' as any, id);
    return this._toResponse(updated, readRecord?.reads?.[0] ?? null, timelines);
  }

  // ============================================================
  // 3. 标记已读
  // ============================================================

  async markRead(id: string, ctx: AuthorizationContext): Promise<NoticeResponse> {
    const { actor } = ctx;
    const { noticeRepository, timelineRepository } = this.deps;

    const record = await noticeRepository.findById(id, true);
    if (!record) throw new NoticeNotFoundError(id);

    const readerId = actor.teacherId ?? actor.userId;

    // 事务：markRead + Timeline
    await noticeRepository.withTransaction(async (tx) => {
      await noticeRepository.markRead(id, readerId, tx);

      await timelineRepository.create(
        {
          eventType: 'NOTICE_READ' as any,
          eventSource: 'NOTICE' as any,
          sourceEventId: id,
          operatorId: readerId,
          operatorName: actor.teacherId ? '教师' : actor.userId,
          operatorRole: actor.userType,
          metadata: {
            noticeNo: record.noticeNo,
            title: record.title,
            readerId,
          },
          occurredAt: new Date(),
          schoolId: record.schoolId,
          noticeId: id,
        } as CreateTimelineEventInput,
        tx,
      );
    });

    const updated = await noticeRepository.findById(id, true);
    const timelines = await timelineRepository.findByRelated('NOTICE' as any, id);
    return this._toResponse(updated!, updated?.reads?.[0] ?? null, timelines);
  }

  // ============================================================
  // 4. 确认阅读（Acknowledge）
  // ============================================================

  async acknowledge(id: string, ctx: AuthorizationContext): Promise<NoticeResponse> {
    const { actor } = ctx;
    const { noticeRepository, timelineRepository, domainService } = this.deps;

    const record = await noticeRepository.findById(id, true);
    if (!record) throw new NoticeNotFoundError(id);

    const readerId = actor.teacherId ?? actor.userId;
    const existingRead = record.reads?.find((r: any) => r.teacherId === readerId);

    // DomainService 校验是否可以 Acknowledge
    if (!domainService.canAcknowledge(record.requireConfirm, !!existingRead?.confirmAt)) {
      throw new Error('该通知不需要确认或已确认');
    }

    // 事务：markConfirmed + Timeline
    await noticeRepository.withTransaction(async (tx) => {
      await noticeRepository.markConfirmed(id, readerId, tx);

      await timelineRepository.create(
        {
          eventType: 'NOTICE_ACKNOWLEDGED' as any,
          eventSource: 'NOTICE' as any,
          sourceEventId: id,
          operatorId: readerId,
          operatorName: actor.teacherId ? '教师' : actor.userId,
          operatorRole: actor.userType,
          metadata: {
            noticeNo: record.noticeNo,
            title: record.title,
            readerId,
          },
          occurredAt: new Date(),
          schoolId: record.schoolId,
          noticeId: id,
        } as CreateTimelineEventInput,
        tx,
      );
    });

    const updated = await noticeRepository.findById(id, true);
    const timelines = await timelineRepository.findByRelated('NOTICE' as any, id);
    return this._toResponse(updated!, updated?.reads?.[0] ?? null, timelines);
  }

  // ============================================================
  // 5. 查询
  // ============================================================

  async getNotice(id: string, ctx: AuthorizationContext): Promise<NoticeResponse> {
    const { noticeRepository, timelineRepository } = this.deps;

    const record = await noticeRepository.findById(id, true);
    if (!record) throw new NoticeNotFoundError(id);

    const readerId = ctx.actor.teacherId ?? ctx.actor.userId;
    const readRecord = record.reads?.find((r: any) => r.teacherId === readerId);

    const timelines = await timelineRepository.findByRelated('NOTICE' as any, id);

    return this._toResponse(record, readRecord ?? null, timelines);
  }

  // ============================================================
  // 私有：DTO 转换
  // ============================================================

  private _toResponse(record: PrismaNotice, read: PrismaNoticeRead | null, timelines: any[]): NoticeResponse {
    return {
      id: record.id,
      noticeNo: record.noticeNo,
      title: record.title,
      content: record.content,
      contentFormat: record.contentFormat,
      noticeType: record.noticeType as any,
      targets: (record.targets as any) ?? [],
      requireConfirm: record.requireConfirm,
      confirmDeadline: record.confirmDeadline?.toISOString() ?? null,
      status: record.status as NoticeStatus,
      publisherId: record.publisherId,
      publisherName: record.publisherName,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      archivedAt: record.archivedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      isRead: read?.isRead ?? false,
      readAt: read?.readAt?.toISOString() ?? null,
      isAcknowledged: !!read?.confirmAt,
      confirmedAt: read?.confirmAt?.toISOString() ?? null,
      timeline: timelines.map((t) => this._toTimelineEvent(t)),
    };
  }

  private _toTimelineEvent(t: any): NoticeTimelineEvent {
    return {
      id: t.id,
      eventType: t.eventType,
      operatorId: t.operatorId ?? null,
      operatorName: t.operatorName ?? null,
      occurredAt: t.occurredAt.toISOString(),
      metadata: t.metadata,
    };
  }

  private _generateNoticeNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NT${dateStr}-${random}`;
  }
}
