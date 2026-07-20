/**
 * NoticeRepository — 通知仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §3
 *
 * ⚠️ 强分离：Notice ≠ Todo
 * - Notice: 仅告知，弱提醒
 * - Todo: 必须完成，强提醒
 */

import type { Prisma, Notice, NoticeStatus, NoticeType } from '@prisma/client';
import { BaseRepository, type TxClient } from './base.repository';

export interface FindNoticesOptions {
  schoolId?: string;
  publisherId?: string;
  noticeType?: NoticeType;
  status?: NoticeStatus;
  requireConfirm?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class NoticeRepository extends BaseRepository {
  async findById(id: string, withReads = false): Promise<Notice | null> {
    if (withReads) {
      return this.db.notice.findUnique({
        where: { id },
        include: { reads: true, publisher: true },
      });
    }
    return this.db.notice.findUnique({ where: { id } });
  }

  async findPublishedForSchool(schoolId: string, options: Omit<FindNoticesOptions, 'schoolId'> = {}): Promise<Notice[]> {
    return this.db.notice.findMany({
      where: {
        schoolId,
        status: 'PUBLISHED',
        ...(options.noticeType && { noticeType: options.noticeType }),
        ...(options.publisherId && { publisherId: options.publisherId }),
      },
      orderBy: { publishedAt: 'desc' },
      take: options.limit ?? 20,
    });
  }

  async create(data: Prisma.NoticeCreateInput, tx?: TxClient): Promise<Notice> {
    const db = tx ?? this.db;
    return db.notice.create({ data });
  }

  async update(id: string, data: Prisma.NoticeUpdateInput, tx?: TxClient): Promise<Notice> {
    const db = tx ?? this.db;
    return db.notice.update({ where: { id }, data });
  }

  async publish(id: string, tx?: TxClient): Promise<Notice> {
    const db = tx ?? this.db;
    return db.notice.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async archive(id: string, tx?: TxClient): Promise<Notice> {
    const db = tx ?? this.db;
    return db.notice.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  // ============================================================
  // NoticeRead 操作
  // ============================================================

  async markRead(noticeId: string, teacherId: string, tx?: TxClient): Promise<void> {
    const db = tx ?? this.db;
    await db.noticeRead.upsert({
      where: { noticeId_teacherId: { noticeId, teacherId } },
      update: { isRead: true, readAt: new Date() },
      create: { noticeId, teacherId, isRead: true, readAt: new Date() },
    });
  }

  async markConfirmed(noticeId: string, teacherId: string, tx?: TxClient): Promise<void> {
    const db = tx ?? this.db;
    await db.noticeRead.upsert({
      where: { noticeId_teacherId: { noticeId, teacherId } },
      update: { isRead: true, readAt: new Date(), confirmAt: new Date() },
      create: { noticeId, teacherId, isRead: true, readAt: new Date(), confirmAt: new Date() },
    });
  }

  async getReadStats(noticeId: string): Promise<{ total: number; read: number; unread: number; readRate: number }> {
    const [total, read] = await Promise.all([
      this.db.noticeRead.count({ where: { noticeId } }),
      this.db.noticeRead.count({ where: { noticeId, isRead: true } }),
    ]);
    return {
      total,
      read,
      unread: total - read,
      readRate: total === 0 ? 0 : read / total,
    };
  }
}

export const noticeRepository = new NoticeRepository();
