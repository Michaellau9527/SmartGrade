/**
 * NoticeDomainService — 通知业务规则
 *
 * 上游规则：Sprint 2.2 C03 §5.1 六层流水线 — 刘老师拍板
 *
 * 职责："通知的业务规则是什么"
 * - 状态机校验（合法转换判断）
 * - 业务规则判断（如：只有 DRAFT 可以发布）
 *
 * 不允许：
 * - ❌ 直接查 Prisma
 * - ❌ 改 Student 状态
 * - ❌ 写 Timeline
 */

import type { NoticeStatus } from '@smartgrade/shared/types/domain/enums/NoticeStatus';

// ============================================================
// 状态机定义
// ============================================================

/**
 * Notice 状态机（C03 冻结）
 *
 * 正向流转：
 *   DRAFT → PUBLISHED
 *
 * 终态：
 *   PUBLISHED（发布后不可撤回，只能归档）
 *   ARCHIVED
 */
const VALID_TRANSITIONS: Record<NoticeStatus, NoticeStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

/**
 * 状态转换对应的 Timeline 事件类型
 */
const STATUS_TO_EVENT: Record<string, string> = {
  'DRAFT→PUBLISHED': 'NOTICE_PUBLISHED',
  'PUBLISHED→ARCHIVED': 'NOTICE_ARCHIVED',
};

// ============================================================
// 错误类型
// ============================================================

export class NoticeStateTransitionError extends Error {
  constructor(from: NoticeStatus, to: NoticeStatus) {
    super(`通知状态转换非法：${from} → ${to}。合法转换：${VALID_TRANSITIONS[from].join(' / ') || '无（终态）'}`);
    this.name = 'NoticeStateTransitionError';
  }
}

export class NoticeNotFoundError extends Error {
  constructor(id: string) {
    super(`通知不存在：${id}`);
    this.name = 'NoticeNotFoundError';
  }
}

// ============================================================
// NoticeDomainService
// ============================================================

export class NoticeDomainService {
  /**
   * 校验状态转换是否合法
   */
  validateTransition(from: NoticeStatus, to: NoticeStatus): string {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new NoticeStateTransitionError(from, to);
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
   */
  getInitialState(): NoticeStatus {
    return 'DRAFT';
  }

  /**
   * 判断是否为终态
   */
  isTerminal(status: NoticeStatus): boolean {
    return VALID_TRANSITIONS[status].length === 0;
  }

  /**
   * 获取从当前状态可以转换到的目标状态列表
   */
  getAllowedTransitions(status: NoticeStatus): NoticeStatus[] {
    return VALID_TRANSITIONS[status] ?? [];
  }

  /**
   * 校验阅读者是否可以 Acknowledge
   *
   * 规则：只有 requireConfirm=true 的通知才需要 Acknowledge
   */
  canAcknowledge(requireConfirm: boolean, alreadyConfirmed: boolean): boolean {
    if (!requireConfirm) return false;
    if (alreadyConfirmed) return false;
    return true;
  }
}
