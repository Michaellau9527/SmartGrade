/**
 * LeaveRepository — 请假仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §1
 *
 * ⚠️ 关键约束：
 * - 8 状态机（v4.2 冻结）：DRAFT → PENDING → APPROVED → LEFT → RETURNED → CLOSED
 * - 6 原因分类（v1.1 必填）：ILLNESS / PERSONAL / FAMILY / SPORT / SCHOOL_ACTIVITY / OTHER
 * - ❌ 字段禁止：no_show_at / expired_at / overdue_at
 * - ✅ expected_return_time **仅参考**（Repository 不暴露自动判定方法）
 */

import type { Prisma, LeaveRecord, LeaveStatus, LeaveReasonType } from '@prisma/client';
import { BaseRepository, DirectStatusUpdateError, type TxClient } from './base.repository';

export interface FindLeavesOptions {
  studentId?: string;
  classId?: string;
  gradeId?: string;
  schoolId?: string;
  applicantId?: string;
  approverId?: string;
  status?: LeaveStatus | LeaveStatus[];
  leaveReasonType?: LeaveReasonType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

export class LeaveRepository extends BaseRepository {
  // ============================================================
  // 1. 查询
  // ============================================================

  async findById(id: string, includeRelations = false, tx?: TxClient): Promise<LeaveRecord | null> {
    const db = tx ?? this.db;
    if (includeRelations) {
      return db.leaveRecord.findUnique({
        where: { id },
        include: {
          student: true,
          applicant: true,
          approver: true,
          timelines: { orderBy: { occurredAt: 'asc' } },
        },
      });
    }
    return db.leaveRecord.findUnique({ where: { id } });
  }

  async findByLeaveNo(leaveNo: string): Promise<LeaveRecord | null> {
    return this.db.leaveRecord.findUnique({ where: { leaveNo } });
  }

  /**
   * 班级今日请假
   */
  async findTodayByClass(classId: string): Promise<LeaveRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.db.leaveRecord.findMany({
      where: {
        classId,
        startAt: { gte: today, lt: tomorrow },
        status: { notIn: ['DRAFT', 'REJECTED', 'CANCELLED'] },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * 学生请假历史
   */
  async findByStudent(studentId: string, options: Omit<FindLeavesOptions, 'studentId'> = {}): Promise<LeaveRecord[]> {
    return this.db.leaveRecord.findMany({
      where: {
        studentId,
        ...(options.status && { status: options.status as LeaveStatus }),
        ...(options.leaveReasonType && { leaveReasonType: options.leaveReasonType }),
        ...((options.startDate || options.endDate) && {
          startAt: {
            ...(options.startDate && { gte: options.startDate }),
            ...(options.endDate && { lte: options.endDate }),
          },
        }),
      },
      orderBy: { startAt: options.orderBy ?? 'desc' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 待审批列表（年级主任工作台用）
   */
  async findPendingForApprover(gradeId: string, limit = 50): Promise<LeaveRecord[]> {
    return this.db.leaveRecord.findMany({
      where: {
        gradeId,
        status: 'PENDING',
      },
      include: {
        student: true,
        applicant: true,
      },
      orderBy: { startAt: 'asc' },
      take: limit,
    });
  }

  /**
   * 请假原因统计（v1.1 关键 - 为 Sprint 3 数据分析准备）
   */
  async statsByReason(schoolId: string, gradeId: string | null, month: string): Promise<{
    ILLNESS: number;
    PERSONAL: number;
    FAMILY: number;
    SPORT: number;
    SCHOOL_ACTIVITY: number;
    OTHER: number;
    total: number;
  }> {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const groupBy = await this.db.leaveRecord.groupBy({
      by: ['leaveReasonType'],
      where: {
        schoolId,
        ...(gradeId && { gradeId }),
        createdAt: { gte: startDate, lt: endDate },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      _count: { _all: true },
    });

    const result: any = {
      ILLNESS: 0, PERSONAL: 0, FAMILY: 0, SPORT: 0, SCHOOL_ACTIVITY: 0, OTHER: 0, total: 0,
    };
    for (const g of groupBy) {
      result[g.leaveReasonType] = g._count._all;
      result.total += g._count._all;
    }
    return result;
  }

  // ============================================================
  // 2. 写入（8 状态机流转）
  // ============================================================

  async create(data: Prisma.LeaveRecordCreateInput, tx?: TxClient): Promise<LeaveRecord> {
    const db = tx ?? this.db;
    return db.leaveRecord.create({ data });
  }

  async update(id: string, data: Prisma.LeaveRecordUpdateInput): Promise<LeaveRecord> {
    return this.db.leaveRecord.update({ where: { id }, data });
  }

  /**
   * 状态机转换（v1.3 关键：Repository 不判断合法性）
   *
   * ⚠️ 注意：合法转换由 LeaveService 校验，Repository 不做。
   * 错误的状态转换会写入非法数据，由 Service 层的单元测试保证。
   */
  async updateStatus(id: string, status: LeaveStatus, operatorId?: string, extra?: Prisma.LeaveRecordUncheckedUpdateInput, tx?: TxClient): Promise<LeaveRecord> {
    const db = tx ?? this.db;
    return db.leaveRecord.update({
      where: { id },
      data: { status, ...(operatorId && { approverId: operatorId }), ...extra },
    });
  }

  async softDelete(id: string): Promise<LeaveRecord> {
    return this.db.leaveRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================================
  // 3. v1.3 强制：禁止自动状态转换
  // ============================================================

  /**
   * ❌ 禁止：自动判定学生返校时间
   *
   * expected_return_time 仅为参考字段（v1.2 业务规则）。
   * 不允许根据当前时间 + expected_return_time 自动标记 OVERDUE。
   */
  async autoCloseOverdueReturns(_now: Date = new Date()): Promise<never> {
    throw new Error('[v1.2] expected_return_time 仅参考，禁止自动判定返校状态。');
  }

  /**
   * ❌ 禁止：自动标记 NO_SHOW / EXPIRED
   */
  async autoMarkNoShow(_leaveId: string): Promise<never> {
    throw new Error('[v4.2] 业务规则禁止 NO_SHOW 状态。');
  }

  /**
   * ❌ 禁止：自动标记 EXPIRED
   */
  async autoMarkExpired(_leaveId: string): Promise<never> {
    throw new Error('[v4.2] 业务规则禁止 EXPIRED 状态。');
  }

  /**
   * ❌ 禁止：自动标记 OVERDUE
   */
  async autoMarkOverdue(_leaveId: string): Promise<never> {
    throw new Error('[v4.2] 业务规则禁止 OVERDUE 状态。');
  }
}

export const leaveRepository = new LeaveRepository();
