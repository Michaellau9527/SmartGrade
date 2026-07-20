/**
 * TaskRepository — 任务仓储
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.3 §4
 *
 * ⚠️ 强分离：Task ≠ Notice
 * ⚠️ **唯一允许的自动异常状态**：OVERDUE（仅任务，请假不允许）
 */

import type { Prisma, Task, TaskStatus, TaskPriority } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface FindTasksOptions {
  schoolId?: string;
  assigneeId?: string;
  creatorId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  dueBefore?: Date;
  dueAfter?: Date;
  source?: string;
  limit?: number;
  offset?: number;
}

export class TaskRepository extends BaseRepository {
  async findById(id: string): Promise<Task | null> {
    return this.db.task.findUnique({
      where: { id },
      include: { assignee: true, creator: true },
    });
  }

  /**
   * 接收人待办列表（工作台用）
   */
  async findMyTasks(assigneeId: string, options: Omit<FindTasksOptions, 'assigneeId'> = {}): Promise<Task[]> {
    return this.db.task.findMany({
      where: {
        assigneeId,
        ...(options.status && {
          status: Array.isArray(options.status) ? { in: options.status } : options.status,
        }),
        ...(options.priority && { priority: options.priority }),
        ...(options.dueBefore && { dueAt: { lte: options.dueBefore } }),
        ...(options.dueAfter && { dueAt: { gte: options.dueAfter } }),
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
      take: options.limit ?? 50,
    });
  }

  /**
   * 超时任务扫描（v1.0 §4.4 唯一允许的自动转换）
   *
   * ⚠️ 关键约束：仅任务可以自动 OVERDUE。请假不允许。
   */
  async findOverdueTasks(now: Date = new Date()): Promise<Task[]> {
    return this.db.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueAt: { lt: now },
        deletedAt: null,
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  /**
   * 年级任务看板（年级主任用）
   */
  async findTasksByCreator(creatorId: string, options: Omit<FindTasksOptions, 'creatorId'> = {}): Promise<Task[]> {
    return this.db.task.findMany({
      where: {
        creatorId,
        ...(options.status && {
          status: Array.isArray(options.status) ? { in: options.status } : options.status,
        }),
      },
      include: { assignee: true },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      take: options.limit ?? 100,
    });
  }

  /**
   * 任务完成率统计
   */
  async statsForTeacher(teacherId: string, month: string): Promise<{
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
    onTimeRate: number;
  }> {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const tasks = await this.db.task.findMany({
      where: {
        assigneeId: teacherId,
        createdAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      select: { status: true, dueAt: true, completedAt: true },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdue = tasks.filter((t) => t.status === 'OVERDUE').length;
    const onTime = tasks.filter((t) => t.status === 'COMPLETED' && t.completedAt && t.completedAt <= t.dueAt).length;

    return {
      total,
      completed,
      overdue,
      completionRate: total === 0 ? 0 : completed / total,
      onTimeRate: completed === 0 ? 0 : onTime / completed,
    };
  }

  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    return this.db.task.create({ data });
  }

  async update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    return this.db.task.update({ where: { id }, data });
  }

  async complete(id: string, remark?: string): Promise<Task> {
    return this.db.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(remark && { completionRemark: remark }),
      },
    });
  }

  /**
   * 自动标记超时（系统级定时任务调用）
   *
   * ⚠️ 这是 v1.0 业务规则允许的**唯一**自动异常状态转换。
   * 严禁对其他业务使用同样的模式。
   */
  async markOverdue(taskId: string): Promise<Task> {
    return this.db.task.update({
      where: { id: taskId },
      data: { status: 'OVERDUE' },
    });
  }

  async recordReminder(id: string): Promise<Task> {
    return this.db.task.update({
      where: { id },
      data: {
        reminderCount: { increment: 1 },
        lastRemindedAt: new Date(),
      },
    });
  }
}

export const taskRepository = new TaskRepository();
