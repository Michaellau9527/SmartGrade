/**
 * Notice — 通知
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §3
 *
 * ⚠️ 强分离原则：
 * - Notice：仅告知，弱提醒
 * - Todo：必须完成，强提醒
 * 二者**完全独立**。
 */

import type { NoticeType } from './enums/NoticeType';
import type { NoticeStatus } from './enums/NoticeStatus';
import type { NotificationTargetType } from './enums/NotificationTargetType';

export interface Notice {
  /** 主键 UUID */
  id: string;

  /** 通知编号 */
  notice_no: string;

  /** 标题 */
  title: string;

  /** 内容（支持 Markdown） */
  content: string;

  /** 内容格式 */
  content_format: 'PLAIN' | 'MARKDOWN' | 'HTML';

  /** 通知类型 */
  notice_type: NoticeType;

  /** 推送目标列表 */
  targets: NotificationTarget[];

  /** 是否强制已读 */
  require_confirm: boolean;

  /** 已读截止时间（强制已读时必填） */
  confirm_deadline?: string;

  /** 发布人 ID */
  publisher_id: string;

  /** 发布人姓名 */
  publisher_name: string;

  /** 状态 */
  status: NoticeStatus;

  /** 发布时间 */
  published_at?: string;

  /** 归档时间 */
  archived_at?: string;

  /** 阅读统计（冗余，异步更新） */
  read_stats: NoticeReadStats;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** 通知推送目标 */
export interface NotificationTarget {
  target_type: NotificationTargetType;
  target_id?: string;        // ALL_TEACHERS 时为空
  target_label?: string;     // 冗余展示名
}

/** 通知阅读统计 */
export interface NoticeReadStats {
  total: number;
  read: number;
  unread: number;
  read_rate: number;         // 0-1
}

/** Mock 示例 */
export const NOTICE_MOCK: Notice = {
  id: 'notice_001',
  notice_no: 'NT20260718-0001',
  title: '关于本周五安全教育会议的通知',
  content: '请各班于本周五下午4点在会议室集合...',
  content_format: 'MARKDOWN',
  notice_type: 'NOTICE' as NoticeType,
  targets: [
    { target_type: 'GRADE' as NotificationTargetType, target_id: 'grade_001', target_label: '高一年级' },
  ],
  require_confirm: true,
  confirm_deadline: '2026-09-15T16:00:00+08:00',
  publisher_id: 'tch_001',
  publisher_name: '王主任',
  status: 'PUBLISHED' as NoticeStatus,
  published_at: '2026-09-13T09:00:00+08:00',
  read_stats: {
    total: 48,
    read: 32,
    unread: 16,
    read_rate: 0.667,
  },
  created_at: '2026-09-13T08:30:00+08:00',
  updated_at: '2026-09-13T09:00:00+08:00',
};
