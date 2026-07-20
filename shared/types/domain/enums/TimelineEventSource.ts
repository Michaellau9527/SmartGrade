/**
 * TimelineEventSource — 事件来源
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §10.4
 */

export type TimelineEventSource =
  | 'LEAVE'
  | 'DORM'
  | 'NOTICE'
  | 'INCIDENT'
  | 'STUDENT';

export const TimelineEventSourceText: Record<TimelineEventSource, string> = {
  LEAVE: '请假',
  DORM: '宿舍',
  NOTICE: '通知',
  INCIDENT: '违纪',
  STUDENT: '学生自身',
};
