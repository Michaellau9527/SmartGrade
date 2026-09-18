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
// C03-01 精细化状态机（叠加于 v1 之上）
// ============================================================

/**
 * Notice 精细化状态（C03-01）
 *
 * 区别于 v1 NoticeStatus (DRAFT / PUBLISHED / ARCHIVED)：
 * C03-01 引入 READ 与 ACKNOWLEDGED 作为中间态，
 * 用于追踪每个收件人的阅读 / 确认状态。
 *
 * 流转：
 *   DRAFT → PUBLISHED → READ → ACKNOWLEDGED → ARCHIVED
 */
export type NoticeLifecycleState =
  | 'DRAFT'         // 草稿
  | 'PUBLISHED'     // 已发布
  | 'READ'          // 已读
  | 'ACKNOWLEDGED'  // 已确认
  | 'ARCHIVED';     // 已归档

/** Notice 状态常量（C03-01 命名别名） */
export const NOTICE_DRAFT = 'DRAFT' as const;
export const NOTICE_PUBLISHED = 'PUBLISHED' as const;
export const NOTICE_READ = 'READ' as const;
export const NOTICE_ACKNOWLEDGED = 'ACKNOWLEDGED' as const;
export const NOTICE_ARCHIVED = 'ARCHIVED' as const;

/** Notice 状态显示文本 */
export const NoticeLifecycleStateText: Record<NoticeLifecycleState, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  READ: '已读',
  ACKNOWLEDGED: '已确认',
  ARCHIVED: '已归档',
};

/**
 * Notice Timeline 事件类型（C03-01 5 事件）
 *
 * 对应状态机的 4 次状态转换 + 1 次初始创建事件。
 */
export type NoticeTimelineEvent =
  | 'NOTICE_CREATED'
  | 'NOTICE_PUBLISHED'
  | 'NOTICE_READ'
  | 'NOTICE_ACKNOWLEDGED'
  | 'NOTICE_ARCHIVED';

/** Notice Timeline 事件常量（C03-01 命名别名） */
export const NOTICE_CREATED_EVENT = 'NOTICE_CREATED' as const;
export const NOTICE_PUBLISHED_EVENT = 'NOTICE_PUBLISHED' as const;
export const NOTICE_READ_EVENT = 'NOTICE_READ' as const;
export const NOTICE_ACKNOWLEDGED_EVENT = 'NOTICE_ACKNOWLEDGED' as const;
export const NOTICE_ARCHIVED_EVENT = 'NOTICE_ARCHIVED' as const;

/** Notice Timeline 事件显示文本 */
export const NoticeTimelineEventText: Record<NoticeTimelineEvent, string> = {
  NOTICE_CREATED: '通知创建',
  NOTICE_PUBLISHED: '通知发布',
  NOTICE_READ: '通知已读',
  NOTICE_ACKNOWLEDGED: '通知确认',
  NOTICE_ARCHIVED: '通知归档',
};

/**
 * C03-01 状态机正向流转定义
 *
 *   DRAFT → PUBLISHED
 *   PUBLISHED → READ
 *   READ → ACKNOWLEDGED
 *   ACKNOWLEDGED → ARCHIVED
 */
const LIFECYCLE_TRANSITIONS: Record<NoticeLifecycleState, NoticeLifecycleState[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['READ'],
  READ: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['ARCHIVED'],
  ARCHIVED: [],
};

/**
 * 状态转换对应的 Timeline 事件
 */
const LIFECYCLE_STATUS_TO_EVENT: Record<string, NoticeTimelineEvent> = {
  'DRAFT→PUBLISHED': 'NOTICE_PUBLISHED',
  'PUBLISHED→READ': 'NOTICE_READ',
  'READ→ACKNOWLEDGED': 'NOTICE_ACKNOWLEDGED',
  'ACKNOWLEDGED→ARCHIVED': 'NOTICE_ARCHIVED',
};

// ============================================================
// 状态机定义（v1 — 保留以兼容旧测试）
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

/**
 * C03-01 精细化状态机非法转换错误
 */
export class NoticeLifecycleTransitionError extends Error {
  constructor(from: NoticeLifecycleState, to: NoticeLifecycleState) {
    super(
      `通知生命周期状态转换非法：${from} → ${to}。合法转换：${
        LIFECYCLE_TRANSITIONS[from].join(' / ') || '无（终态）'
      }`,
    );
    this.name = 'NoticeLifecycleTransitionError';
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

  // ============================================================
  // C03-01 纯领域规则（不产生任何副作用，输入状态 → 输出状态）
  // ============================================================

  /**
   * 发布规则（C03-01）
   *
   * DRAFT → PUBLISHED
   * 其它状态禁止发布。
   *
   * 纯函数：仅做状态机校验，不查库、不写库、不写 Timeline、不发通知。
   */
  publish(currentStatus: NoticeLifecycleState): NoticeLifecycleState {
    return this.lifecycleTransition(currentStatus, 'PUBLISHED');
  }

  /**
   * 阅读规则（C03-01）
   *
   * PUBLISHED → READ
   * 其它状态禁止阅读。
   *
   * 纯函数。
   */
  read(currentStatus: NoticeLifecycleState): NoticeLifecycleState {
    return this.lifecycleTransition(currentStatus, 'READ');
  }

  /**
   * 确认规则（C03-01）
   *
   * READ → ACKNOWLEDGED
   * 其它状态禁止确认。
   *
   * 纯函数。
   */
  acknowledge(currentStatus: NoticeLifecycleState): NoticeLifecycleState {
    return this.lifecycleTransition(currentStatus, 'ACKNOWLEDGED');
  }

  /**
   * 归档规则（C03-01）
   *
   * ACKNOWLEDGED → ARCHIVED
   * 其它状态禁止归档。
   *
   * 纯函数。
   */
  archive(currentStatus: NoticeLifecycleState): NoticeLifecycleState {
    return this.lifecycleTransition(currentStatus, 'ARCHIVED');
  }

  /**
   * C03-01 状态机查询
   */
  getLifecycleInitialState(): NoticeLifecycleState {
    return 'DRAFT';
  }

  isLifecycleTerminal(status: NoticeLifecycleState): boolean {
    return LIFECYCLE_TRANSITIONS[status].length === 0;
  }

  getLifecycleAllowedTransitions(status: NoticeLifecycleState): NoticeLifecycleState[] {
    return LIFECYCLE_TRANSITIONS[status] ?? [];
  }

  /**
   * C03-01 内部：状态转换核心逻辑（纯函数）
   */
  private lifecycleTransition(
    from: NoticeLifecycleState,
    to: NoticeLifecycleState,
  ): NoticeLifecycleState {
    const allowed = LIFECYCLE_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new NoticeLifecycleTransitionError(from, to);
    }
    return to;
  }
}
