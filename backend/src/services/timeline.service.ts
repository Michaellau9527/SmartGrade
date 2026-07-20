/**
 * TimelineService — 时间轴服务
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §10 + §8.1.1
 *
 * ⚠️ v1.3 关键定位：
 * - 这是业务代码**唯一**允许创建 TimelineEvent 的入口
 * - 创建事件后**自动**触发 StudentStatusLocationResolver（v1.3 强制）
 * - 整个流程在 $transaction 中，保证"事件 + 状态"原子性
 *
 * 调用链：
 *   LeaveService / DormService / NoticeService
 *     → TimelineService.createEvent()
 *       → TimelineEvent.create() (Prisma)
 *         → applyStatusUpdate() (Resolver)
 *           → Student.update() (Prisma)
 */

import type {
  TimelineEventType,
  TimelineEventSource,
  Student,
} from '@smartgrade/shared/types/domain';
import type { RelatedEntityType } from '@prisma/client';
import { timelineRepository } from '../repositories/timeline.repository';
import { studentRepository } from '../repositories/student.repository';
import { prisma } from '../db/prisma.client';
import {
  resolveFromEvent,
  applyStatusUpdate,
  type ResolvedStatusUpdate,
} from './StudentStatusLocationResolver.business';

export interface CreateTimelineEventParams {
  eventType: TimelineEventType;
  eventSource: TimelineEventSource;
  sourceEventId: string;
  studentId: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  metadata?: Record<string, any>;
  occurredAt?: Date;
  relatedType?: RelatedEntityType;
  relatedId?: string;
}

export interface TimelineEventResult {
  event: Awaited<ReturnType<typeof timelineRepository.create>>;
  resolved: ResolvedStatusUpdate;
  /** 事件后的最新学生快照（Prisma 类型，含 Date） */
  student: Awaited<ReturnType<typeof prisma.student.findUnique>>;
}

/**
 * 创建 Timeline 事件
 *
 * ⚠️ v1.3 强制规范：
 * - 这是业务代码唯一的事件创建入口
 * - 自动触发 Resolver 推导状态
 * - 整个流程在事务中
 * - 失败回滚
 */
export class TimelineService {
  /**
   * 创建事件 + 触发 Resolver
   *
   * 测试 3 + 测试 4 关键路径：
   * - LeaveService 创建请假 → 调用本方法 → 产生 LEAVE_CREATED 事件 → Resolver 推导
   * - 门卫扫码 → 调用本方法 → 产生 LEAVE_GATE_LEFT → 状态变为 OUT_OF_SCHOOL
   */
  async createEvent(params: CreateTimelineEventParams): Promise<TimelineEventResult> {
    const occurredAt = params.occurredAt ?? new Date();

    return prisma.$transaction(async (tx) => {
      // 1. 拉取学生信息（用于 Resolver + 冗余字段）
      const student = await tx.student.findUnique({ where: { id: params.studentId } });
      if (!student) {
        throw new Error(`[TimelineService] Student ${params.studentId} 不存在`);
      }

      // 2. 推 Resolver（不写库）
      const resolved = resolveFromEvent(params.eventType, params.metadata);

      // 3. 写 TimelineEvent
      const event = await tx.timelineEvent.create({
        data: {
          eventType: params.eventType,
          eventSource: params.eventSource,
          sourceEventId: params.sourceEventId,
          studentId: params.studentId,
          operatorId: params.operatorId ?? null,
          operatorName: params.operatorName ?? null,
          operatorRole: params.operatorRole ?? null,
          metadata: (params.metadata ?? {}) as any,
          occurredAt,
          classId: student.classId,
          gradeId: student.gradeId,
          schoolId: student.schoolId,
          relatedType: params.relatedType ?? null,
          relatedId: params.relatedId ?? null,
          isSystem: !params.operatorId,
        },
      });

      // 4. 应用 Resolver 结果（如有）
      if (resolved.touched !== 'NONE') {
        await tx.student.update({
          where: { id: params.studentId },
          data: {
            ...(resolved.touched === 'STATUS' || resolved.touched === 'BOTH' ? { statusUpdatedAt: occurredAt } : {}),
            ...(resolved.touched === 'LOCATION' || resolved.touched === 'BOTH' ? { locationUpdatedAt: occurredAt } : {}),
            ...(resolved.newStatus ? { currentStatus: resolved.newStatus } : {}),
            ...(resolved.newLocation ? { currentLocation: resolved.newLocation } : {}),
          },
        });
      }

      // 5. 返回最新学生
      const updatedStudent = await tx.student.findUnique({ where: { id: params.studentId } });
      return { event, resolved, student: updatedStudent! };
    });
  }

  /**
   * 读取学生时间轴（仅查询，无副作用）
   */
  async getStudentTimeline(studentId: string, options?: {
    eventSource?: TimelineEventSource;
    relatedType?: RelatedEntityType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return timelineRepository.findByStudent(studentId, options);
  }

  /**
   * 按业务记录反查（如 leaveId → 所有事件）
   */
  async getRelatedEvents(relatedType: RelatedEntityType, relatedId: string) {
    return timelineRepository.findByRelated(relatedType, relatedId);
  }

  /**
   * 班级异常学生列表（班主任工作台用）
   */
  async getClassAbnormalStudents(classId: string, month: string) {
    return timelineRepository.findAbnormalStudentsInClass(classId, month);
  }

  /**
   * 月度统计
   */
  async getMonthlyStats(studentId: string, month: string) {
    return timelineRepository.monthlyStats(studentId, month);
  }
}

export const timelineService = new TimelineService();
