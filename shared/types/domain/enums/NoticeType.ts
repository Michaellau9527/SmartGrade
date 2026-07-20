/** 通知类型 */
export type NoticeType =
  /** 普通通知 */
  | 'NOTICE'
  /** 紧急通知 */
  | 'URGENT'
  /** 会议通知 */
  | 'MEETING'
  /** 放假通知 */
  | 'HOLIDAY'
  /** 教研通知 */
  | 'TEACHING';

export const NoticeTypeText: Record<NoticeType, string> = {
  NOTICE: '普通通知',
  URGENT: '紧急通知',
  MEETING: '会议通知',
  HOLIDAY: '放假通知',
  TEACHING: '教研通知',
};
