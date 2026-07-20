/**
 * StudentStatusLocationResolver — 业务实现版
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §2.5 + §8.1.1
 *
 * 职责：根据 TimelineEvent 推导出 Student 的新 current_status / current_location。
 *
 * ⚠️ v1.3 关键定位：
 * - shared/types/domain/StudentStatusLocationResolver.ts 是**判断工具**（读侧 / 已存在学生判断）
 * - 本文件是**写入侧**（事件 → 新状态）—— Day 3 新建
 *
 * 调用链（v1.3 强制）：
 *   TimelineService.createEvent()
 *     → 本 Resolver.resolve(eventType, metadata)
 *       → 计算新 status / location
 *         → StudentRepository.updateStatusTimestamp() + StudentRepository.update() 写新值
 *
 * ❌ 禁止业务 Service / Controller 绕过本 Resolver 直接 setCurrentStatus。
 */

import { prisma } from '../db/prisma.client';
import type {
  TimelineEventType,
  StudentStatus,
  StudentLocation,
} from '@smartgrade/shared/types/domain';

/** Resolver 推导结果：应当应用的状态/位置 */
export interface ResolvedStatusUpdate {
  /** 新在校状态（null = 不变） */
  newStatus: StudentStatus | null;
  /** 新物理位置（null = 不变） */
  newLocation: StudentLocation | null;
  /** 是否触发了时间戳更新 */
  touched: 'STATUS' | 'LOCATION' | 'BOTH' | 'NONE';
  /** 推导原因（用于日志/调试） */
  reason: string;
}

/**
 * 事件 → 状态变更 映射表
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §2.5.3 触发矩阵
 *
 * 规则说明：
 * - LEAVE_GATE_LEFT（请假离校）→ 状态 OUT_OF_SCHOOL，位置 OFF_CAMPUS
 * - LEAVE_RETURNED（返校）→ 状态 ON_CAMPUS，位置 CLASSROOM（默认）
 * - DORM_CHECKED_IN（归寝）→ 位置 DORM
 * - DORM_ABSENT（缺寝）→ 触发 INCIDENT，不改 status/location
 * - NOTICE_SENT / NOTICE_READ → 不改 status/location
 * - STUDENT_GRADUATED → 状态 GRADUATED
 * - STUDENT_TRANSFERRED → 状态 TRANSFERRED
 * - STUDENT_ENROLLED → 状态 ON_CAMPUS，位置 UNKNOWN
 */
const EVENT_TO_STATUS_MAP: Record<
  TimelineEventType,
  { status: StudentStatus | null; location: StudentLocation | null; reason: string }
> = {
  // ===== LeaveTimeline =====
  LEAVE_CREATED:         { status: null, location: null, reason: '请假创建（仅记录）' },
  LEAVE_SUBMITTED:       { status: null, location: null, reason: '请假提交（仅记录）' },
  LEAVE_APPROVED:        { status: null, location: null, reason: '请假批准（仅记录）' },
  LEAVE_REJECTED:        { status: null, location: null, reason: '请假驳回（仅记录）' },
  LEAVE_CANCELLED:       { status: null, location: null, reason: '请假取消（仅记录）' },
  LEAVE_GATE_LEFT:       { status: 'OUT_OF_SCHOOL', location: 'OFF_CAMPUS', reason: '请假离校' },
  LEAVE_RETURNED:        { status: 'ON_CAMPUS', location: 'CLASSROOM', reason: '请假返校' },
  LEAVE_CLOSED:          { status: null, location: null, reason: '销假（仅记录）' },
  LEAVE_EDITED:          { status: null, location: null, reason: '请假修改（仅记录）' },
  LEAVE_RESUBMITTED:     { status: null, location: null, reason: '请假重提（仅记录）' },

  // ===== DormTimeline =====
  DORM_ABSENT:           { status: null, location: null, reason: '缺寝（需异常处理，不直接改）' },
  DORM_LATE:             { status: null, location: null, reason: '晚归（仅记录）' },
  DORM_CHECKED_IN:       { status: null, location: 'DORM', reason: '归寝' },

  // ===== NoticeTimeline =====
  NOTICE_SENT:           { status: null, location: null, reason: '通知发送（不影响状态）' },
  NOTICE_READ:           { status: null, location: null, reason: '通知已读（不影响状态）' },

  // ===== IncidentTimeline =====
  INCIDENT_RECORDED:     { status: null, location: null, reason: '违纪登记（不影响状态）' },
  INCIDENT_HANDLED:      { status: null, location: null, reason: '违纪处理（不影响状态）' },

  // ===== Student =====
  STUDENT_ENROLLED:      { status: 'ON_CAMPUS', location: 'UNKNOWN', reason: '新生入学' },
  STUDENT_GRADUATED:     { status: 'GRADUATED', location: null, reason: '毕业' },
  STUDENT_TRANSFERRED:   { status: 'TRANSFERRED', location: null, reason: '转学' },
  STUDENT_STATUS_CHANGED:{ status: null, location: null, reason: '通用状态变更（由 metadata 指定）' },
};

/**
 * 根据事件类型推导新状态
 *
 * ⚠️ 注意：本方法**不**写入数据库，只计算结果。
 * 真正的写库由调用方（TimelineService）在事务中完成。
 */
export function resolveFromEvent(
  eventType: TimelineEventType,
  metadata?: Record<string, any>
): ResolvedStatusUpdate {
  const mapping = EVENT_TO_STATUS_MAP[eventType];

  if (!mapping) {
    return { newStatus: null, newLocation: null, touched: 'NONE', reason: `未识别事件 ${eventType}` };
  }

  // STUDENT_STATUS_CHANGED 允许 metadata 覆盖
  let status = mapping.status;
  let location = mapping.location;

  if (eventType === 'STUDENT_STATUS_CHANGED' && metadata) {
    if (metadata.newStatus) status = metadata.newStatus as StudentStatus;
    if (metadata.newLocation) location = metadata.newLocation as StudentLocation;
  }

  // 计算 touched
  let touched: ResolvedStatusUpdate['touched'] = 'NONE';
  if (status !== null && location !== null) touched = 'BOTH';
  else if (status !== null) touched = 'STATUS';
  else if (location !== null) touched = 'LOCATION';

  return {
    newStatus: status,
    newLocation: location,
    touched,
    reason: mapping.reason,
  };
}

/**
 * 应用 Resolver 结果到 Student
 *
 * ⚠️ v1.3 强制：本方法是**唯一**写入 Student.current_status / current_location 的路径。
 * 不允许 Service / Controller / Repository 直接调用 setCurrentStatus。
 */
export async function applyStatusUpdate(
  studentId: string,
  resolved: ResolvedStatusUpdate,
  occurredAt: Date
): Promise<void> {
  if (resolved.touched === 'NONE') return;

  // 1. 更新时间戳（永远）
  await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(resolved.touched === 'STATUS' || resolved.touched === 'BOTH' ? { statusUpdatedAt: occurredAt } : {}),
      ...(resolved.touched === 'LOCATION' || resolved.touched === 'BOTH' ? { locationUpdatedAt: occurredAt } : {}),
      ...(resolved.newStatus ? { currentStatus: resolved.newStatus } : {}),
      ...(resolved.newLocation ? { currentLocation: resolved.newLocation } : {}),
    },
  });
}
