/**
 * TaskStatus — 任务状态（v1.0 冻结）
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §4.2
 *
 * ⚠️ **唯一允许的自动异常状态**：`OVERDUE`（仅任务，请假不允许）
 *
 * 状态机：
 *   DRAFT → PENDING → IN_PROGRESS → COMPLETED
 *                  ↓
 *                  ├─→ DEFERRED   (延期)
 *                  ├─→ CANCELLED  (取消)
 *                  └─→ OVERDUE    (超时未完成 - 唯一允许的自动状态)
 */
export type TaskStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DEFERRED'
  | 'CANCELLED'
  | 'OVERDUE';      // 唯一允许的自动异常状态

export const TaskStatusText: Record<TaskStatus, string> = {
  DRAFT: '草稿',
  PENDING: '待办',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  DEFERRED: '已延期',
  CANCELLED: '已取消',
  OVERDUE: '已超时',
};

export const TaskStatusColor: Record<TaskStatus, string> = {
  DRAFT: 'default',
  PENDING: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  DEFERRED: 'orange',
  CANCELLED: 'default',
  OVERDUE: 'red',
};
