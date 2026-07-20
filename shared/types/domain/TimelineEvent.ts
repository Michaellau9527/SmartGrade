/**
 * TimelineEvent — 时间轴事件
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §8.1（R-013 单一来源）+ §10.7
 *
 * ⚠️ 核心设计（v1.2 冻结）：
 * 1. Timeline 是**唯一历史来源**，不允许查询多个业务表后拼接
 * 2. Timeline **不允许修改 / 不允许删除**（R-014 永久留痕）
 * 3. StudentTimeline 是**聚合视图**（查询时聚合），不独立存储
 *
 * StudentTimelineEventType = LeaveTimeline (10) + DormTimeline (3) + NoticeTimeline (2) +
 *                          IncidentTimeline (2) + Student (4) = 21 事件
 */

import type { TimelineEventType } from './enums/TimelineEventType';
import type { TimelineEventSource } from './enums/TimelineEventSource';

export interface TimelineEvent {
  /** 主键 UUID */
  id: string;

  /** 事件类型（21 事件枚举） */
  event_type: TimelineEventType;

  /** 事件来源（5 来源：LEAVE / DORM / NOTICE / INCIDENT / STUDENT） */
  event_source: TimelineEventSource;

  /** 源业务记录 ID（FK 原表） */
  source_event_id: string;

  /** 关联学生 ID（必填，聚合根） */
  student_id: string;

  /** 业务载荷 */
  payload: Record<string, any>;

  /** 操作人 ID（可选，系统事件为空） */
  operator_id?: string;

  /** 操作人姓名（冗余） */
  operator_name?: string;

  /** 业务发生时间 */
  occurred_at: string;

  /** 系统记录时间 */
  recorded_at: string;

  /** 冗余：班级 ID（便于按班级查询） */
  class_id?: string;

  /** 冗余：年级 ID */
  grade_id?: string;

  /** 冗余：学校 ID */
  school_id?: string;

  /** 是否系统事件（true = 系统自动 / false = 人工） */
  is_system: boolean;
}

/** Mock 示例 */
export const TIMELINE_EVENT_MOCK: TimelineEvent = {
  id: 'tl_001',
  event_type: 'LEAVE_GATE_LEFT' as TimelineEventType,
  event_source: 'LEAVE' as TimelineEventSource,
  source_event_id: 'leave_001',
  student_id: 'stu_001',
  payload: {
    leave_id: 'leave_001',
    gate_id: 'gate_main',
    scanned_at: '2026-09-10T10:00:00+08:00',
  },
  operator_id: 'guard_001',
  operator_name: '张师傅',
  occurred_at: '2026-09-10T10:00:00+08:00',
  recorded_at: '2026-09-10T10:00:01+08:00',
  class_id: 'cls_001',
  grade_id: 'grade_001',
  school_id: 'sch_001',
  is_system: false,
};

/**
 * StudentTimeline 聚合查询结果
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §10.6
 */
export interface StudentTimelineResponse {
  student_id: string;
  events: TimelineEvent[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * StudentTimeline 月度统计
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §10.6
 */
export interface StudentTimelineStats {
  student_id: string;
  month: string;                   // 2026-09
  leave_count: number;
  dorm_absent_count: number;
  incident_count: number;
  notice_read_rate: number;
}
