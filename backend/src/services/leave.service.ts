/**
 * LeaveService — 请假业务服务
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §1
 *
 * 职责：
 * 1. 创建/审批/驳回/取消/离校登记/返校登记/销假 —— 完整 8 状态机
 * 2. **每次状态转换必须产生 Timeline 事件**（v1.3 强制）
 * 3. 状态机合法性由 Service 校验，Repository 不管
 *
 * ⚠️ v1.3 关键：
 * - ❌ 不允许自动判定 OVERDUE / NO_SHOW / EXPIRED（v4.2 冻结）
 * - ✅ expected_return_time 仅供参考，不参与自动判定
 * - ✅ 状态机走法：见 LeaveStatus 注释
 *
 * 状态机：
 *   DRAFT → PENDING → APPROVED → LEFT → RETURNED → CLOSED
 *                  ↓                ↓
 *                REJECTED         CANCELLED
 */

import type { Prisma, LeaveRecord, LeaveStatus, LeaveReasonType } from '@prisma/client';
import type { TimelineEventType } from '@smartgrade/shared/types/domain';
import { leaveRepository } from '../repositories/leave.repository';
import { studentRepository } from '../repositories/student.repository';
import { timelineService } from './timeline.service';

export interface CreateLeaveParams {
  studentId: string;
  leaveType: 'SICK' | 'PERSONAL' | 'OTHER';
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: Date;
  endAt: Date;
  expectedReturnTime?: Date;
  expectedReturnNote?: string;
  applicantId: string;
  applicantName: string;
  attachmentIds?: string[];
}

export interface ApproveLeaveParams {
  leaveId: string;
  approverId: string;
  approverName: string;
  remark?: string;
}

export interface RejectLeaveParams {
  leaveId: string;
  approverId: string;
  approverName: string;
  rejectReason: string;
}

export interface GateScanParams {
  leaveId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: 'GATE_GUARD' | 'TEACHER' | 'DORM_MANAGER' | 'SYSTEM';
  action: 'LEAVE' | 'RETURN';
}

/** 合法状态转换表 */
const VALID_TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  DRAFT:     ['PENDING', 'CANCELLED'],
  PENDING:   ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED:  ['LEFT', 'CANCELLED'],
  REJECTED:  [],                 // 终态
  CANCELLED: [],                 // 终态
  LEFT:      ['RETURNED', 'CANCELLED'],
  RETURNED:  ['CLOSED'],
  CLOSED:    [],                 // 终态
};

/** 状态 → Timeline 事件类型映射 */
const STATUS_TO_EVENT: Partial<Record<LeaveStatus, TimelineEventType>> = {
  DRAFT:    'LEAVE_CREATED',
  PENDING:  'LEAVE_SUBMITTED',
  APPROVED: 'LEAVE_APPROVED',
  REJECTED: 'LEAVE_REJECTED',
  CANCELLED:'LEAVE_CANCELLED',
  LEFT:     'LEAVE_GATE_LEFT',
  RETURNED: 'LEAVE_RETURNED',
  CLOSED:   'LEAVE_CLOSED',
};

export class LeaveService {
  /**
   * 创建请假（草稿或直接提交）
   */
  async createLeave(params: CreateLeaveParams, submit: boolean = true): Promise<LeaveRecord> {
    // 1. 拉学生信息（用于冗余）
    const student = await studentRepository.findById(params.studentId);
    if (!student) {
      throw new Error(`[LeaveService] Student ${params.studentId} 不存在`);
    }

    // 2. 创建 LeaveRecord
    const leave = await leaveRepository.create({
      student: { connect: { id: student.id } },
      class: { connect: { id: student.classId } },
      grade: { connect: { id: student.gradeId } },
      school: { connect: { id: student.schoolId } },
      leaveNo: await this.generateLeaveNo(student.schoolId),
      studentName: student.name,
      className: '',
      leaveType: params.leaveType,
      leaveReasonType: params.leaveReasonType,
      reason: params.reason,
      startAt: params.startAt,
      endAt: params.endAt,
      expectedReturnTime: params.expectedReturnTime ?? null,
      expectedReturnNote: params.expectedReturnNote ?? null,
      status: 'DRAFT',
      applicant: { connect: { id: params.applicantId } },
      applicantName: params.applicantName,
      attachmentIds: params.attachmentIds ?? [],
    } as any);

    // 3. 产生 Timeline 事件
    await timelineService.createEvent({
      eventType: 'LEAVE_CREATED',
      eventSource: 'LEAVE',
      sourceEventId: leave.id,
      studentId: student.id,
      operatorId: params.applicantId,
      operatorName: params.applicantName,
      operatorRole: 'APPLICANT',
      metadata: {
        leaveNo: leave.leaveNo,
        leaveType: params.leaveType,
        leaveReasonType: params.leaveReasonType,
        startAt: params.startAt,
        endAt: params.endAt,
      },
      relatedType: 'LEAVE',
      relatedId: leave.id,
    });

    // 4. 如需直接提交
    if (submit) {
      return this.submitLeave(leave.id, params.applicantId, params.applicantName);
    }

    return leave;
  }

  /**
   * 提交（草稿 → 待审批）
   */
  async submitLeave(leaveId: string, operatorId: string, operatorName: string): Promise<LeaveRecord> {
    const updated = await this.transition(leaveId, 'PENDING', operatorId, undefined, {
      approverId: null,
    });
    await this.emitTimeline(updated, 'LEAVE_SUBMITTED', operatorId, operatorName);
    return updated;
  }

  /**
   * 审批
   */
  async approveLeave(params: ApproveLeaveParams): Promise<LeaveRecord> {
    const updated = await this.transition(params.leaveId, 'APPROVED', params.approverId, {
      approverId: params.approverId,
      approverName: params.approverName,
      approveRemark: params.remark ?? null,
      approvedAt: new Date(),
    });
    await this.emitTimeline(updated, 'LEAVE_APPROVED', params.approverId, params.approverName, {
      approverName: params.approverName,
      remark: params.remark,
    });
    return updated;
  }

  /**
   * 驳回
   */
  async rejectLeave(params: RejectLeaveParams): Promise<LeaveRecord> {
    const updated = await this.transition(params.leaveId, 'REJECTED', params.approverId, {
      approverId: params.approverId,
      approverName: params.approverName,
      rejectReason: params.rejectReason,
      rejectedAt: new Date(),
    });
    await this.emitTimeline(updated, 'LEAVE_REJECTED', params.approverId, params.approverName, {
      approverName: params.approverName,
      rejectReason: params.rejectReason,
    });
    return updated;
  }

  /**
   * 取消
   */
  async cancelLeave(leaveId: string, operatorId: string, operatorName: string, reason: string): Promise<LeaveRecord> {
    const updated = await this.transition(leaveId, 'CANCELLED', operatorId, {
      cancelReason: reason,
    });
    await this.emitTimeline(updated, 'LEAVE_CANCELLED', operatorId, operatorName, { reason });
    return updated;
  }

  /**
   * 门卫扫码（核心入口）
   *
   * ⚠️ v1.3 强制：
   * - LEFT 触发学生状态 → OUT_OF_SCHOOL + OFF_CAMPUS（通过 Resolver）
   * - RETURN 触发学生状态 → ON_CAMPUS + CLASSROOM（通过 Resolver）
   */
  async gateScan(params: GateScanParams): Promise<LeaveRecord> {
    const target: LeaveStatus = params.action === 'LEAVE' ? 'LEFT' : 'RETURNED';

    const updated = await this.transition(params.leaveId, target, params.operatorId, {
      ...(params.action === 'LEAVE' ? { actualLeftAt: new Date() } : { actualReturnedAt: new Date() }),
    });

    // 关键：门卫扫码 = 离校/返校事件 = 触发 Resolver 改 Student 状态
    const eventType: TimelineEventType = params.action === 'LEAVE' ? 'LEAVE_GATE_LEFT' : 'LEAVE_RETURNED';
    await timelineService.createEvent({
      eventType,
      eventSource: 'LEAVE',
      sourceEventId: updated.id,
      studentId: updated.studentId,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      operatorRole: params.operatorRole,
      metadata: {
        leaveNo: updated.leaveNo,
        action: params.action,
      },
      relatedType: 'LEAVE',
      relatedId: updated.id,
    });

    return updated;
  }

  /**
   * 销假
   */
  async closeLeave(leaveId: string, operatorId: string, operatorName: string): Promise<LeaveRecord> {
    const updated = await this.transition(leaveId, 'CLOSED', operatorId, {
      closedAt: new Date(),
    });
    await this.emitTimeline(updated, 'LEAVE_CLOSED', operatorId, operatorName);
    return updated;
  }

  // ============================================================
  // 内部
  // ============================================================

  /**
   * 状态机转换（带合法性校验）
   */
  private async transition(
    leaveId: string,
    target: LeaveStatus,
    operatorId: string,
    extra?: Prisma.LeaveRecordUncheckedUpdateInput,
    additionalFields?: Record<string, any>
  ): Promise<LeaveRecord> {
    const leave = await leaveRepository.findById(leaveId);
    if (!leave) throw new Error(`[LeaveService] Leave ${leaveId} 不存在`);

    const current = leave.status as LeaveStatus;
    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      throw new Error(
        `[LeaveService] 非法状态转换：${current} → ${target}。` +
        `合法目标：${allowed.join(', ') || '（终态）'}`
      );
    }

    return leaveRepository.updateStatus(leaveId, target, operatorId, { ...extra, ...additionalFields });
  }

  /**
   * 产生 Timeline 事件（通用版）
   */
  private async emitTimeline(
    leave: LeaveRecord,
    eventType: TimelineEventType,
    operatorId: string,
    operatorName: string,
    extraMetadata?: Record<string, any>
  ) {
    return timelineService.createEvent({
      eventType,
      eventSource: 'LEAVE',
      sourceEventId: leave.id,
      studentId: leave.studentId,
      operatorId,
      operatorName,
      operatorRole: 'TEACHER',
      metadata: {
        leaveNo: leave.leaveNo,
        status: leave.status,
        ...extraMetadata,
      },
      relatedType: 'LEAVE',
      relatedId: leave.id,
    });
  }

  /**
   * 生成请假单号（简单实现：yyyyMMdd + 4位随机）
   *
   * Sprint 4 接 Sequence 表后再改成严格序号。
   */
  private async generateLeaveNo(_schoolId: string): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `LV${dateStr}${random}`;
  }
}

export const leaveService = new LeaveService();
