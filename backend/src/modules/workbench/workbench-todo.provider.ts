/**
 * WorkbenchTodoProvider — 待办数据提供方
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：为 Workbench 提供教师今日待办数据
 *
 * 演进计划：
 * - 当前（C01）：薄桥接层，直接委托 TaskRepository 单例
 * - 后续（C04 Student Task Capability）：替换为真正的 TodoService
 */

import type { ITodoService } from './workbench.service';
import { taskRepository } from '../../repositories/task.repository';

export class WorkbenchTodoProvider implements ITodoService {
  async getPendingTodos(teacherId: string) {
    const tasks = await taskRepository.findMyTasks(teacherId, {
      status: ['PENDING', 'IN_PROGRESS'],
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.dueAt?.toISOString() ?? null,
      sourceType: t.source ?? 'OTHER',
      sourceId: t.sourceId ?? '',
    }));
  }
}
