/**
 * LeaveDomainService — 请假业务规则
 *
 * 上游规则：Sprint 2.2 C02 §5.1 六层流水线 — 刘老师拍板
 *
 * 职责："请假的业务规则是什么"
 * - 状态机校验（合法转换判断）
 * - 业务规则判断（如：申请人必须是 TEACHER）
 *
 * 不允许：
 * - ❌ 直接查 Prisma
 * - ❌ 改 Student 状态
 * - ❌ 写 Timeline
 * - ❌ 编排多步骤（那是 CapabilityService 的事）
 */

import type { LeaveStatus } from '@smartgrade/shared/types/domain/enums/LeaveStatus';

// ============================================================
// 状态机定义
// ============================================================

/**
 * Leave 状态机（C02 冻结）
 *
 * 正向流转：
 *   PENDING → APPROVED → LEFT → RETURNED → CLOSED
 *
 * 异常分支：
 *   PENDING → REJECTED
 *   PENDING → CANCELLED
 *
 * 不使用 DRAFT（创建即提交）
 */
const VALID_TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['LEFT'],
  LEFT: ['RETURNED'],
  RETURNED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
  DRAFT: ['PENDING'], // 保留但不使用（创建即 PENDING）
};

/**
 * 状态转换对应的 Timeline 事件类型
 */
const STATUS_TO_EVENT: Record<string, string> = {
  'PENDING→APPROVED': 'LEAVE_APPROVED',
  'PENDING→REJECTED': 'LEAVE_REJECTED',
  'PENDING→CANCELLED': 'LEAVE_CANCELLED',
  'APPROVED→LEFT': 'LEAVE_GATE_LEFT',
  'LEFT→RETURNED': 'LEAVE_RETURNED',
  'RETURNED→CLOSED': 'LEAVE_CLOSED',
};

// ============================================================
// 错误类型
// ============================================================

export class LeaveStateTransitionError extends Error {
  constructor(from: LeaveStatus, to: LeaveStatus) {
    super(`请假状态转换非法：${from} → ${to}。合法转换：${VALID_TRANSITIONS[from].join(' / ') || '无（终态）'}`);
    this.name = 'LeaveStateTransitionError';
  }
}

export class LeaveNotFoundError extends Error {
  constructor(id: string) {
    super(`请假记录不存在：${id}`);
    this.name = 'LeaveNotFoundError';
  }
}

// ============================================================
// LeaveDomainService
// ============================================================

export class LeaveDomainService {
  /**
   * 校验状态转换是否合法
   *
   * 如果合法，返回对应的 TimelineEventType。
   * 如果非法，抛出 LeaveStateTransitionError。
   */
  validateTransition(from: LeaveStatus, to: LeaveStatus): string {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new LeaveStateTransitionError(from, to);
    }

    const key = `${from}→${to}`;
    const eventType = STATUS_TO_EVENT[key];
    if (!eventType) {
      throw new Error(`状态转换 ${key} 合法但未映射 Timeline 事件类型`);
    }

    return eventType;
  }

  /**
   * 获取初始状态
   *
   * C02 冻结：创建即 PENDING（不使用 DRAFT）
   */
  getInitialState(): LeaveStatus {
    return 'PENDING';
  }

  /**
   * 判断是否为终态
   */
  isTerminal(status: LeaveStatus): boolean {
    return VALID_TRANSITIONS[status].length === 0;
  }

  /**
   * 获取从当前状态可以转换到的目标状态列表
   */
  getAllowedTransitions(status: LeaveStatus): LeaveStatus[] {
    return VALID_TRANSITIONS[status] ?? [];
  }
}
