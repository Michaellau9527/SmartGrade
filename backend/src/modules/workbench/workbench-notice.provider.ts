/**
 * WorkbenchNoticeProvider — 通知数据提供方
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：为 Workbench 提供最近通知数据
 *
 * 演进计划：
 * - 当前（C01）：薄桥接层，直接委托 NoticeRepository 单例
 * - 后续（C03 Student Notice Capability）：替换为真正的 NoticeService
 */

import type { INoticeService } from './workbench.service';
import { noticeRepository } from '../../repositories/notice.repository';

export class WorkbenchNoticeProvider implements INoticeService {
  async getRecentNotices(options: {
    schoolId: string;
    teacherId?: string;
    limit?: number;
  }) {
    const notices = await noticeRepository.findPublishedForSchool(
      options.schoolId,
      { limit: options.limit ?? 5 },
    );

    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      noticeType: n.noticeType ?? 'NOTICE',
      publishedAt: (n.publishedAt as Date).toISOString(),
      isRead: false, // NoticeRead 需要关联查询，当前简化为 false
    }));
  }
}
