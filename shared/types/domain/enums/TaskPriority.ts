/** 任务优先级 */
export type TaskPriority =
  | 'URGENT'
  | 'HIGH'
  | 'NORMAL'
  | 'LOW';

export const TaskPriorityText: Record<TaskPriority, string> = {
  URGENT: '紧急',
  HIGH: '高',
  NORMAL: '普通',
  LOW: '低',
};

export const TaskPriorityColor: Record<TaskPriority, string> = {
  URGENT: 'red',
  HIGH: 'orange',
  NORMAL: 'blue',
  LOW: 'default',
};
