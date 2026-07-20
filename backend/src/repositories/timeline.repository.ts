/**
 * TimelineRepository — 时间轴仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §10 + §8.1.1 + §8.1.3
 *
 * ⚠️ v1.3 关键约束：
 * - 21 事件 + 5 来源（v1.2 冻结）
 * - 唯一性约束：(studentId, eventSource, sourceEventId) - v1.0 冻结
 * - 主查询索引：(studentId, occurredAt DESC) - v1.0 冻结
 * - v1.3 新增：relatedType (6 枚举) + relatedId (string)
 * - ❌ 不允许 update / delete（永久留痕 R-014）
 */

import type { Prisma, TimelineEvent, TimelineEventType, TimelineEventSource, RelatedEntityType } from '@prisma/client';
import { BaseRepository, type TxClient } from './base.repository';

export interface CreateTimelineEventInput {
  eventType: TimelineEventType;
  eventSource: TimelineEventSource;
  sourceEventId: string;
  studentId: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  metadata: Record<string, any>;
  occurredAt: Date;
  // 冗余字段
  classId?: string;
  gradeId?: string;
  schoolId?: string;
  // v1.3 关联字段
  relatedType?: RelatedEntityType;
  relatedId?: string;
  // 兼容字段
  leaveRecordId?: string;
  noticeId?: string;
  isSystem?: boolean;
}

export interface FindTimelineOptions {
  studentId?: string;
  classId?: string;
  gradeId?: string;
  schoolId?: string;
  eventType?: TimelineEventType;
  eventSource?: TimelineEventSource;
  relatedType?: RelatedEntityType;
  relatedId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export class TimelineRepository extends BaseRepository {
  /**
   * 创建 Timeline 事件
   *
   * ⚠️ 注意：(studentId, eventSource, sourceEventId) 唯一性约束
   * 重复创建会抛 P2002 错误。
   */
  async create(data: CreateTimelineEventInput, tx?: TxClient): Promise<TimelineEvent> {
    const db = tx ?? this.db;
    return db.timelineEvent.create({
      data: {
        eventType: data.eventType,
        eventSource: data.eventSource,
        sourceEventId: data.sourceEventId,
        studentId: data.studentId,
        operatorId: data.operatorId ?? null,
        operatorName: data.operatorName ?? null,
        operatorRole: data.operatorRole ?? null,
        metadata: data.metadata as any,
        occurredAt: data.occurredAt,
        classId: data.classId ?? null,
        gradeId: data.gradeId ?? null,
        schoolId: data.schoolId ?? null,
        relatedType: data.relatedType ?? null,
        relatedId: data.relatedId ?? null,
        leaveRecordId: data.leaveRecordId ?? null,
        noticeId: data.noticeId ?? null,
        isSystem: data.isSystem ?? false,
      },
    });
  }

  /**
   * 学生时间轴（v1.0 §10.6 主查询）
   */
  async findByStudent(studentId: string, options: Omit<FindTimelineOptions, 'studentId'> = {}): Promise<TimelineEvent[]> {
    return this.db.timelineEvent.findMany({
      where: this.buildWhere({ ...options, studentId }),
      orderBy: { occurredAt: options.order ?? 'desc' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 按业务记录反查（如：请假 leaveId → 所有 Timeline 事件）
   */
  async findByRelated(relatedType: RelatedEntityType, relatedId: string): Promise<TimelineEvent[]> {
    return this.db.timelineEvent.findMany({
      where: { relatedType, relatedId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /**
   * 按业务源 ID + 来源（v1.0 唯一性约束反查）
   */
  async findBySource(eventSource: TimelineEventSource, sourceEventId: string): Promise<TimelineEvent[]> {
    return this.db.timelineEvent.findMany({
      where: { eventSource, sourceEventId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /**
   * 月度统计（v1.0 §10.6 接口）
   */
  async monthlyStats(studentId: string, month: string): Promise<{
    leave_count: number;
    dorm_absent_count: number;
    incident_count: number;
    notice_read_rate: number;
  }> {
    // month 格式：2026-09
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const events = await this.db.timelineEvent.findMany({
      where: {
        studentId,
        occurredAt: { gte: startDate, lt: endDate },
        eventSource: { in: ['LEAVE', 'DORM', 'INCIDENT', 'NOTICE'] },
      },
      select: { eventType: true, eventSource: true },
    });

    return {
      leave_count: events.filter((e) => e.eventSource === 'LEAVE').length,
      dorm_absent_count: events.filter((e) => e.eventType === 'DORM_ABSENT').length,
      incident_count: events.filter((e) => e.eventSource === 'INCIDENT').length,
      notice_read_rate: 0, // TODO: 需联合 NoticeRead 计算
    };
  }

  /**
   * 班级异常学生（v1.0 §10.6 接口）
   */
  async findAbnormalStudentsInClass(classId: string, month: string): Promise<{ studentId: string; abnormalCount: number }[]> {
    const stats = await this.db.timelineEvent.groupBy({
      by: ['studentId'],
      where: {
        classId,
        eventType: { in: ['DORM_ABSENT', 'INCIDENT_RECORDED', 'LEAVE_LATE_RETURN' as any] },
        occurredAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      },
      _count: { _all: true },
    });

    return stats.map((s) => ({ studentId: s.studentId, abnormalCount: s._count._all }));
  }

  // ============================================================
  // v1.3 强制：禁止 update / delete
  // ============================================================

  /**
   * ❌ 禁止：Timeline 不允许修改
   * 抛出错误，强制业务代码走 create。
   */
  async update(_id: string, _data: Prisma.TimelineEventUpdateInput): Promise<never> {
    throw new Error('[v1.3 R-014] Timeline 不允许修改。如需修正，请新增事件。');
  }

  /**
   * ❌ 禁止：Timeline 不允许删除
   */
  async delete(_id: string): Promise<never> {
    throw new Error('[v1.3 R-014] Timeline 永久留痕，禁止删除。');
  }

  /**
   * ❌ 禁止：物理删除多个
   */
  async deleteMany(_filter: Prisma.TimelineEventWhereInput): Promise<never> {
    throw new Error('[v1.3 R-014] Timeline 永久留痕，禁止批量删除。');
  }

  // ============================================================
  // 内部
  // ============================================================

  private buildWhere(options: FindTimelineOptions): Prisma.TimelineEventWhereInput {
    const where: Prisma.TimelineEventWhereInput = {};
    if (options.studentId) where.studentId = options.studentId;
    if (options.classId) where.classId = options.classId;
    if (options.gradeId) where.gradeId = options.gradeId;
    if (options.schoolId) where.schoolId = options.schoolId;
    if (options.eventType) where.eventType = options.eventType;
    if (options.eventSource) where.eventSource = options.eventSource;
    if (options.relatedType) where.relatedType = options.relatedType;
    if (options.relatedId) where.relatedId = options.relatedId;
    if (options.startDate || options.endDate) {
      where.occurredAt = {};
      if (options.startDate) (where.occurredAt as any).gte = options.startDate;
      if (options.endDate) (where.occurredAt as any).lte = options.endDate;
    }
    return where;
  }
}

export const timelineRepository = new TimelineRepository();
