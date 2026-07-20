/**
 * LeaveCapabilityService — 请假业务编排
 *
 * 上游规则：Sprint 2.2 C02 §5.1 六层流水线 — 刘老师拍板
 *
 * 职责："这一件事情怎么完成"
 * - 编排：LeaveRecord 创建/更新 + Timeline 写入 + 事务保证
 * - 调用 DomainService 校验状态机
 * - 调用 Repository 读写数据
 *
 * 不允许：
 * - ❌ 直接查 Prisma（通过 Repository）
 * - ❌ 判断业务规则（通过 DomainService）
 * - ❌ 直接改 Student 状态（通过 StudentStatusResolver，C05 实现）
 *
 * Timeline 强一致（§5.2）：
 * LeaveRecord 更新 + TimelineEvent 创建在同一个 Prisma 事务内完成。
 * 任何一步失败 → 整个事务回滚。
 */

import type { Prisma, LeaveRecord as PrismaLeaveRecord } from '@prisma/client';
import type { AuthorizationContext } from '../authorization/types';
import type { TxClient } from '../../repositories/base.repository';
import { LeaveRepository } from '../../repositories/leave.repository';
import { TimelineRepository, type CreateTimelineEventInput } from '../../repositories/timeline.repository';
import { StudentRepository } from '../../repositories/student.repository';
import { LeaveDomainService, LeaveNotFoundError, LeaveStateTransitionError } from './leave.domain-service';
import type {
  LeaveResponse,
  LeaveListItem,
  LeaveTimelineEvent,
  CreateLeaveRequest,
  ApproveLeaveRequest,
  RejectLeaveRequest,
  CancelLeaveRequest,
} from '@smartgrade/shared/types/leave/LeaveResponse';
import type { LeaveStatus } from '@smartgrade/shared/types/domain/enums/LeaveStatus';

// ============================================================
// 依赖接口（便于测试 mock）
// ============================================================

export interface LeaveCapabilityDeps {
  leaveRepository: LeaveRepository;
  timelineRepository: TimelineRepository;
  studentRepository: StudentRepository;
  domainService: LeaveDomainService;
}

// ============================================================
// LeaveCapabilityService
// ============================================================

export class LeaveCapabilityService {
  constructor(private deps: LeaveCapabilityDeps) {}

  // ============================================================
  // 1. 创建请假 → PENDING
  // ============================================================

  async createLeave(req: CreateLeaveRequest, ctx: AuthorizationContext): Promise<LeaveResponse> {
    const { actor, organization } = ctx;
    const { leaveRepository, timelineRepository, studentRepository, domainService } = this.deps;

    // 1. 查学生信息（用于冗余字段）
    const student = await studentRepository.findById(req.studentId, true);
    if (!student) {
      throw new Error(`学生不存在：${req.studentId}`);
    }

    const initialState = domainService.getInitialState(); // PENDING
    const leaveNo = this._generateLeaveNo();

    // 2. 事务：创建 LeaveRecord + 写 Timeline（强一致）
    const record = await leaveRepository.withTransaction(async (tx) => {
      // 2.1 创建 LeaveRecord
      const created = await leaveRepository.create(
        {
          leaveNo,
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          className: student.className ?? '',
          gradeId: student.gradeId,
          schoolId: student.schoolId,
          leaveType: req.leaveType as any,
          leaveReasonType: req.leaveReasonType as any,
          reason: req.reason,
          startAt: new Date(req.startAt),
          endAt: new Date(req.endAt),
          expectedReturnTime: req.expectedReturnTime ? new Date(req.expectedReturnTime) : null,
          expectedReturnNote: req.expectedReturnNote ?? null,
          status: initialState,
          applicantId: actor.teacherId ?? actor.userId,
          applicantName: actor.teacherId ? '教师' : actor.userId, // 简化：后续从 Teacher 表查
          attachmentIds: [],
        } as Prisma.LeaveRecordCreateInput,
        tx,
      );

      // 2.2 写 Timeline（LEAVE_CREATED）— 必须成功
      await timelineRepository.create(
        {
          eventType: 'LEAVE_CREATED' as any,
          eventSource: 'LEAVE' as any,
          sourceEventId: created.id,
          studentId: student.id,
          operatorId: actor.teacherId ?? actor.userId,
          operatorName: actor.teacherId ? '教师' : actor.userId,
          operatorRole: actor.userType,
          metadata: {
            leaveNo: created.leaveNo,
            leaveType: req.leaveType,
            leaveReasonType: req.leaveReasonType,
            reason: req.reason,
            status: initialState,
          },
          occurredAt: new Date(),
          classId: student.classId,
          gradeId: student.gradeId,
          schoolId: student.schoolId,
          leaveRecordId: created.id,
        } as CreateTimelineEventInput,
        tx,
      );

      // 2.3 更新 Student 时间戳（不改状态，C05 由 StudentStatusResolver 处理）
      await studentRepository.updateStatusTimestamp(student.id, 'STATUS', new Date());

      return created;
    });

    // 3. 返回详情（含 Timeline）
    return this._toResponse(record, []);
  }

  // ============================================================
  // 2. 审批通过 → APPROVED
  // ============================================================

  async approveLeave(id: string, req: ApproveLeaveRequest, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'APPROVED', ctx, {
      getExtra: () => ({
        approverId: ctx.actor.teacherId ?? ctx.actor.userId,
        approverName: ctx.actor.teacherId ? '审批人' : ctx.actor.userId,
        approveRemark: req.approveRemark ?? null,
        approvedAt: new Date(),
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        approverId: ctx.actor.teacherId ?? ctx.actor.userId,
        approveRemark: req.approveRemark,
        from: record.status,
        to: 'APPROVED',
      }),
    });
  }

  // ============================================================
  // 3. 驳回 → REJECTED
  // ============================================================

  async rejectLeave(id: string, req: RejectLeaveRequest, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'REJECTED', ctx, {
      getExtra: () => ({
        approverId: ctx.actor.teacherId ?? ctx.actor.userId,
        approverName: ctx.actor.teacherId ? '审批人' : ctx.actor.userId,
        rejectReason: req.rejectReason,
        rejectedAt: new Date(),
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        rejectReason: req.rejectReason,
        from: record.status,
        to: 'REJECTED',
      }),
    });
  }

  // ============================================================
  // 4. 确认离校 → LEFT
  // ============================================================

  async confirmLeft(id: string, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'LEFT', ctx, {
      getExtra: () => ({
        actualLeftAt: new Date(),
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        studentName: record.studentName,
        from: record.status,
        to: 'LEFT',
      }),
    });
  }

  // ============================================================
  // 5. 确认返校 → RETURNED
  // ============================================================

  async confirmReturned(id: string, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'RETURNED', ctx, {
      getExtra: () => ({
        actualReturnedAt: new Date(),
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        studentName: record.studentName,
        from: record.status,
        to: 'RETURNED',
      }),
    });
  }

  // ============================================================
  // 6. 销假完成 → CLOSED
  // ============================================================

  async closeLeave(id: string, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'CLOSED', ctx, {
      getExtra: () => ({
        closedAt: new Date(),
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        studentName: record.studentName,
        from: record.status,
        to: 'CLOSED',
      }),
    });
  }

  // ============================================================
  // 7. 取消 → CANCELLED
  // ============================================================

  async cancelLeave(id: string, req: CancelLeaveRequest, ctx: AuthorizationContext): Promise<LeaveResponse> {
    return this._transitionStatus(id, 'CANCELLED', ctx, {
      getExtra: () => ({
        cancelReason: req.cancelReason ?? null,
      }),
      getMetadata: (record) => ({
        leaveNo: record.leaveNo,
        cancelReason: req.cancelReason,
        from: record.status,
        to: 'CANCELLED',
      }),
    });
  }

  // ============================================================
  // 8. 查询
  // ============================================================

  async getLeave(id: string, ctx: AuthorizationContext): Promise<LeaveResponse> {
    const record = await this.deps.leaveRepository.findById(id, true);
    if (!record) {
      throw new LeaveNotFoundError(id);
    }

    // 查关联的 Timeline 事件
    const timelines = await this.deps.timelineRepository.findByRelated('LEAVE' as any, id);

    return this._toResponse(record, timelines);
  }

  // ============================================================
  // 私有：通用状态转换（事务 + Timeline 强一致）
  // ============================================================

  private async _transitionStatus(
    id: string,
    targetStatus: LeaveStatus,
    ctx: AuthorizationContext,
    options: {
      getExtra: () => Record<string, any>;
      getMetadata: (record: PrismaLeaveRecord) => Record<string, any>;
    },
  ): Promise<LeaveResponse> {
    const { leaveRepository, timelineRepository, domainService } = this.deps;

    // 1. 查当前记录
    const record = await leaveRepository.findById(id);
    if (!record) {
      throw new LeaveNotFoundError(id);
    }

    // 2. DomainService 校验状态机 + 获取 Timeline 事件类型
    const eventType = domainService.validateTransition(record.status as LeaveStatus, targetStatus);

    // 3. 事务：更新状态 + 写 Timeline（强一致）
    const updated = await leaveRepository.withTransaction(async (tx) => {
      // 3.1 更新 LeaveRecord 状态
      const result = await leaveRepository.updateStatus(
        id,
        targetStatus as any,
        ctx.actor.teacherId ?? ctx.actor.userId,
        options.getExtra() as any,
        tx,
      );

      // 3.2 写 Timeline — 必须成功
      await timelineRepository.create(
        {
          eventType: eventType as any,
          eventSource: 'LEAVE' as any,
          sourceEventId: id,
          studentId: record.studentId,
          operatorId: ctx.actor.teacherId ?? ctx.actor.userId,
          operatorName: ctx.actor.teacherId ? '操作人' : ctx.actor.userId,
          operatorRole: ctx.actor.userType,
          metadata: {
            ...options.getMetadata(record),
            eventType,
          },
          occurredAt: new Date(),
          classId: record.classId,
          gradeId: record.gradeId,
          schoolId: record.schoolId,
          leaveRecordId: id,
        } as CreateTimelineEventInput,
        tx,
      );

      return result;
    });

    // 4. 返回详情
    const timelines = await this.deps.timelineRepository.findByRelated('LEAVE' as any, id);
    return this._toResponse(updated, timelines);
  }

  // ============================================================
  // 私有：DTO 转换
  // ============================================================

  private _toResponse(record: PrismaLeaveRecord, timelines: any[]): LeaveResponse {
    return {
      id: record.id,
      leaveNo: record.leaveNo,
      status: record.status as LeaveStatus,
      studentId: record.studentId,
      studentName: record.studentName,
      classId: record.classId,
      className: record.className,
      leaveType: record.leaveType as any,
      leaveReasonType: record.leaveReasonType as any,
      reason: record.reason,
      startAt: record.startAt.toISOString(),
      endAt: record.endAt.toISOString(),
      expectedReturnTime: record.expectedReturnTime?.toISOString() ?? null,
      actualLeftAt: record.actualLeftAt?.toISOString() ?? null,
      actualReturnedAt: record.actualReturnedAt?.toISOString() ?? null,
      closedAt: record.closedAt?.toISOString() ?? null,
      applicantId: record.applicantId,
      applicantName: record.applicantName,
      approverId: record.approverId ?? null,
      approverName: record.approverName ?? null,
      approveRemark: record.approveRemark ?? null,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      rejectReason: record.rejectReason ?? null,
      cancelReason: record.cancelReason ?? null,
      timeline: timelines.map((t) => this._toTimelineEvent(t)),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private _toTimelineEvent(t: any): LeaveTimelineEvent {
    return {
      id: t.id,
      eventType: t.eventType,
      operatorId: t.operatorId ?? null,
      operatorName: t.operatorName ?? null,
      operatorRole: t.operatorRole ?? null,
      occurredAt: t.occurredAt.toISOString(),
      metadata: t.metadata,
    };
  }

  private _generateLeaveNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LV${dateStr}-${random}`;
  }
}
