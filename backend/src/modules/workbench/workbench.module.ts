/**
 * WorkbenchModule — 工作台模块
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 模块结构：
 *   WorkbenchModule
 *     ├── WorkbenchController  (GET /workbench)
 *     ├── WorkbenchService     (纯聚合器，永远只是组合)
 *     └── Providers            (为 Workbench 提供数据)
 *         ├── WorkbenchTodoProvider          → ITodoService
 *         ├── WorkbenchStudentStatusProvider → IStudentStatusService
 *         ├── WorkbenchNoticeProvider        → INoticeService
 *         └── WorkbenchQuickActionProvider   → IQuickActionProvider
 *
 * 演进计划：
 * - C01（当前）：Provider 模式，薄桥接层
 * - C03/C04/C05：各 Capability 完成后，Provider 替换为真正的 Service
 * - 以后新增 AIActionProvider / DormActionProvider / EmergencyActionProvider
 *   都不会动 WorkbenchService
 */

import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchTodoProvider } from './workbench-todo.provider';
import { WorkbenchStudentStatusProvider } from './workbench-student-status.provider';
import { WorkbenchNoticeProvider } from './workbench-notice.provider';
import { WorkbenchQuickActionProvider } from './workbench-quick-action.provider';
import {
  TODO_SERVICE,
  STUDENT_STATUS_SERVICE,
  NOTICE_SERVICE,
  QUICK_ACTION_PROVIDER,
} from './workbench.tokens';
import type {
  ITodoService,
  IStudentStatusService,
  INoticeService,
  IQuickActionProvider,
} from './workbench.tokens';

@Module({
  controllers: [WorkbenchController],
  providers: [
    // Provider 层：Repository 单例 → Provider 接口
    {
      provide: TODO_SERVICE,
      useClass: WorkbenchTodoProvider,
    },
    {
      provide: STUDENT_STATUS_SERVICE,
      useClass: WorkbenchStudentStatusProvider,
    },
    {
      provide: NOTICE_SERVICE,
      useClass: WorkbenchNoticeProvider,
    },
    {
      provide: QUICK_ACTION_PROVIDER,
      useClass: WorkbenchQuickActionProvider,
    },
    // 聚合器：通过 useFactory 注入 WorkbenchServices（4 个 Provider）
    {
      provide: WorkbenchService,
      useFactory: (
        todoService: ITodoService,
        studentStatusService: IStudentStatusService,
        noticeService: INoticeService,
        quickActionProvider: IQuickActionProvider,
      ) => new WorkbenchService({ todoService, studentStatusService, noticeService, quickActionProvider }),
      inject: [TODO_SERVICE, STUDENT_STATUS_SERVICE, NOTICE_SERVICE, QUICK_ACTION_PROVIDER],
    },
  ],
  exports: [WorkbenchService],
})
export class WorkbenchModule {}
