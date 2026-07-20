/** 通知状态 */
export type NoticeStatus =
  | 'DRAFT'        // 草稿
  | 'PUBLISHED'    // 已发布
  | 'ARCHIVED';    // 已归档

export const NoticeStatusText: Record<NoticeStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};
