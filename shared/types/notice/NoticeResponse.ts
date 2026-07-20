/**
 * NoticeResponse — 通知响应类型（跨端共享）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 设计原则：
 * - 围绕"通知生命周期"设计，不是 CRUD
 * - Notice 不是文章，而是一次通知事件
 * - 所有端（小程序 / Admin / Web）统一引用此类型
 * - Controller 不自己写 interface，统一从这里 import
 *
 * Sprint 2.2 C03 冻结
 */

import type { NoticeStatus } from '../domain/enums/NoticeStatus';
import type { NoticeType } from '../domain/enums/NoticeType';

// ============================================================
// NoticeResponse — 通知详情
// ============================================================

/** GET /notices/:id 响应 */
export interface NoticeResponse {
  /** 通知 ID */
  id: string;

  /** 通知编号 */
  noticeNo: string;

  /** 标题 */
  title: string;

  /** 内容 */
  content: string;

  /** 内容格式 */
  contentFormat: string;

  /** 通知类型 */
  noticeType: NoticeType;

  /** 目标受众 */
  targets: NoticeTarget[];

  /** 是否需要确认 */
  requireConfirm: boolean;

  /** 确认截止时间 */
  confirmDeadline: string | null;

  /** 状态 */
  status: NoticeStatus;

  // ===== 发布人 =====

  /** 发布人 ID */
  publisherId: string;
  /** 发布人姓名 */
  publisherName: string;

  // ===== 时间 =====

  /** 发布时间 */
  publishedAt: string | null;
  /** 归档时间 */
  archivedAt: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;

  // ===== 阅读状态（当前用户视角） =====

  /** 是否已读 */
  isRead: boolean;
  /** 阅读时间 */
  readAt: string | null;
  /** 是否已确认 */
  isAcknowledged: boolean;
  /** 确认时间 */
  confirmedAt: string | null;

  // ===== Timeline =====

  /** 该通知关联的 Timeline 事件 */
  timeline: NoticeTimelineEvent[];
}

// ============================================================
// NoticeTarget — 通知目标受众
// ============================================================

export interface NoticeTarget {
  /** 目标类型：GRADE / CLASS / SCHOOL / PARENT / STUDENT */
  targetType: string;
  /** 目标 ID */
  targetId: string;
  /** 目标名称 */
  targetLabel: string;
}

// ============================================================
// NoticeListItem — 通知列表项
// ============================================================

/** GET /notices 列表项 */
export interface NoticeListItem {
  id: string;
  noticeNo: string;
  title: string;
  noticeType: NoticeType;
  status: NoticeStatus;
  publisherName: string;
  publishedAt: string | null;
  requireConfirm: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
}

// ============================================================
// NoticeTimelineEvent — 通知关联的 Timeline 事件
// ============================================================

export interface NoticeTimelineEvent {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  eventType: string;
  /** 操作人 ID */
  operatorId: string | null;
  /** 操作人姓名 */
  operatorName: string | null;
  /** 发生时间 */
  occurredAt: string;
  /** 事件元数据 */
  metadata: Record<string, any>;
}

// ============================================================
// DTO 类型（请求体）
// ============================================================

/** POST /notices — 创建通知草稿 */
export interface CreateNoticeRequest {
  title: string;
  content: string;
  contentFormat?: string;
  noticeType: NoticeType;
  targets: NoticeTarget[];
  requireConfirm?: boolean;
  confirmDeadline?: string;
}

/** POST /notices/:id/publish — 发布通知 */
export interface PublishNoticeRequest {
  /** 发布时可空，直接发布 */
}

/** POST /notices/:id/read — 标记已读 */
export interface ReadNoticeRequest {
  /** 标记已读，无需请求体 */
}

/** POST /notices/:id/acknowledge — 确认阅读 */
export interface AcknowledgeNoticeRequest {
  /** 确认阅读，无需请求体 */
}
