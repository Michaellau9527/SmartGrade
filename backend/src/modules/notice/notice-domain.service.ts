/**
 * NoticeDomainService — 通知状态机（C03 Skeleton）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 职责：定义通知状态机接口（Skeleton 阶段无实现）
 */

/** 通知状态（C03 Skeleton） */
export enum NoticeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ARCHIVED = 'ARCHIVED',
}

/** 通知 Timeline 事件类型（C03 Skeleton） */
export enum NoticeTimelineEventType {
  NOTICE_PUBLISHED = 'NOTICE_PUBLISHED',
  NOTICE_DELIVERED = 'NOTICE_DELIVERED',
  NOTICE_READ = 'NOTICE_READ',
  NOTICE_ACKNOWLEDGED = 'NOTICE_ACKNOWLEDGED',
  NOTICE_ARCHIVED = 'NOTICE_ARCHIVED',
}

export class NoticeDomainService {
  publish(): NoticeStatus {
    throw new Error('TODO');
  }

  read(): NoticeStatus {
    throw new Error('TODO');
  }

  acknowledge(): NoticeStatus {
    throw new Error('TODO');
  }

  archive(): NoticeStatus {
    throw new Error('TODO');
  }
}
