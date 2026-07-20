/**
 * Task — 待办
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §4
 *
 * ⚠️ 强分离原则：Task ≠ Notice
 * - Task：必须完成，强提醒
 * - Notice：仅告知，弱提醒
 *
 * ⚠️ **唯一允许的自动异常状态**：`OVERDUE`（仅任务，请假不允许）
 */

import type { TaskStatus } from './enums/TaskStatus';
import type { TaskPriority } from './enums/TaskPriority';
import type { TaskSource } from './enums/TaskSource';

export interface Task {
  /** 主键 UUID */
  id: string;

  /** 待办编号 */
  task_no: string;

  /** 标题 */
  title: string;

  /** 详情（可选） */
  content?: string;

  /** 状态 */
  status: TaskStatus;

  /** 优先级 */
  priority: TaskPriority;

  /** 来源 */
  source: TaskSource;

  /** 关联业务记录 ID（如 Leave.id / Notice.id） */
  source_id?: string;

  /** 接收人 ID（执行人） */
  assignee_id: string;

  /** 接收人姓名（冗余） */
  assignee_name: string;

  /** 创建人 ID */
  creator_id: string;

  /** 创建人姓名（冗余） */
  creator_name: string;

  /** 截止时间 */
  due_at: string;

  /** 完成时间 */
  completed_at?: string;

  /** 完成备注 */
  completion_remark?: string;

  /** 催办次数 */
  reminder_count: number;

  /** 最后催办时间 */
  last_reminded_at?: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/** Mock 示例 */
export const TASK_MOCK: Task = {
  id: 'task_001',
  task_no: 'TK20260718-0001',
  title: '完成暑假安全教育统计',
  content: '请各班于7月20日前完成统计',
  status: 'PENDING' as TaskStatus,
  priority: 'HIGH' as TaskPriority,
  source: 'GRADE_DIRECTOR' as TaskSource,
  assignee_id: 'tch_002',
  assignee_name: '刘老师',
  creator_id: 'tch_001',
  creator_name: '王主任',
  due_at: '2026-07-20T18:00:00+08:00',
  reminder_count: 0,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
