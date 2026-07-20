/**
 * TimelineEventType — 时间轴事件类型（21 事件 - v1.2 冻结）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §10.3
 *
 * 21 事件 = LeaveTimeline (10) + DormTimeline (3) + NoticeTimeline (2) +
 *          IncidentTimeline (2) + Student (4)
 *
 * ⚠️ 永久冻结：21 事件。
 * 允许扩展子类型（如 LEAVE_GATE_LEFT_BY_GUARD / LEAVE_GATE_LEFT_BY_TEACHER），
 * 不允许新增顶层类型。
 */
export type TimelineEventType =
  // ===== LeaveTimeline 10 事件 =====
  | 'LEAVE_CREATED'
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'LEAVE_GATE_LEFT'
  | 'LEAVE_RETURNED'
  | 'LEAVE_CLOSED'
  | 'LEAVE_EDITED'
  | 'LEAVE_RESUBMITTED'
  // ===== DormTimeline 3 事件 =====
  | 'DORM_ABSENT'
  | 'DORM_LATE'
  | 'DORM_CHECKED_IN'
  // ===== NoticeTimeline 2 事件 =====
  | 'NOTICE_SENT'
  | 'NOTICE_READ'
  // ===== IncidentTimeline 2 事件（违纪） =====
  | 'INCIDENT_RECORDED'
  | 'INCIDENT_HANDLED'
  // ===== Student 4 事件 =====
  | 'STUDENT_ENROLLED'
  | 'STUDENT_GRADUATED'
  | 'STUDENT_TRANSFERRED'
  | 'STUDENT_STATUS_CHANGED';

/** 事件显示文本 */
export const TimelineEventTypeText: Record<TimelineEventType, string> = {
  LEAVE_CREATED: '请假创建',
  LEAVE_SUBMITTED: '请假提交',
  LEAVE_APPROVED: '请假批准',
  LEAVE_REJECTED: '请假驳回',
  LEAVE_CANCELLED: '请假取消',
  LEAVE_GATE_LEFT: '离校登记',
  LEAVE_RETURNED: '返校确认',
  LEAVE_CLOSED: '销假',
  LEAVE_EDITED: '请假修改',
  LEAVE_RESUBMITTED: '请假重提',
  DORM_ABSENT: '缺寝',
  DORM_LATE: '晚归',
  DORM_CHECKED_IN: '归寝',
  NOTICE_SENT: '通知发送',
  NOTICE_READ: '通知已读',
  INCIDENT_RECORDED: '违纪登记',
  INCIDENT_HANDLED: '违纪处理',
  STUDENT_ENROLLED: '入学',
  STUDENT_GRADUATED: '毕业',
  STUDENT_TRANSFERRED: '转学',
  STUDENT_STATUS_CHANGED: '状态变化',
};

/** 事件来源分组 */
export const TimelineEventGroup: Record<string, TimelineEventType[]> = {
  LEAVE: [
    'LEAVE_CREATED', 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
    'LEAVE_CANCELLED', 'LEAVE_GATE_LEFT', 'LEAVE_RETURNED', 'LEAVE_CLOSED',
    'LEAVE_EDITED', 'LEAVE_RESUBMITTED',
  ],
  DORM: ['DORM_ABSENT', 'DORM_LATE', 'DORM_CHECKED_IN'],
  NOTICE: ['NOTICE_SENT', 'NOTICE_READ'],
  INCIDENT: ['INCIDENT_RECORDED', 'INCIDENT_HANDLED'],
  STUDENT: ['STUDENT_ENROLLED', 'STUDENT_GRADUATED', 'STUDENT_TRANSFERRED', 'STUDENT_STATUS_CHANGED'],
};
