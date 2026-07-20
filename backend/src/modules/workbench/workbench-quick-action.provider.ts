/**
 * WorkbenchQuickActionProvider — 快捷操作提供方
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：为 Workbench 提供按 permissionSet 动态过滤的快捷操作列表
 *
 * 设计原则（刘老师要求）：
 * - QuickAction 逻辑从 WorkbenchService 抽出
 * - 以后新增 AIActionProvider / DormActionProvider / EmergencyActionProvider
 *   都不会动 WorkbenchService
 * - Workbench 永远只是组合
 */

import type { QuickAction } from '@smartgrade/shared/types/workbench/WorkbenchResponse';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

/**
 * IQuickActionProvider — 快捷操作提供方接口
 *
 * 后续可扩展多个 Provider（AIAction / DormAction / EmergencyAction），
 * WorkbenchService 只负责组合它们的返回值。
 */
export interface IQuickActionProvider {
  /** 按 permissionSet 过滤返回可用的快捷操作 */
  getQuickActions(permissionSet: Set<PermissionCode>): QuickAction[];
}

/** 全部可选快捷操作（后续按 permissionSet 过滤） */
const ALL_QUICK_ACTIONS: QuickAction[] = [
  { code: 'leave.create', label: '发起请假', requiredPermission: 'leave.create' },
  { code: 'leave.approve', label: '审批请假', requiredPermission: 'leave.approve' },
  { code: 'notice.publish', label: '发布通知', requiredPermission: 'notice.publish' },
  { code: 'task.assign', label: '分配任务', requiredPermission: 'task.assign' },
  { code: 'incident.create', label: '上报异常', requiredPermission: 'incident.create' },
  { code: 'dorm.check', label: '查寝', requiredPermission: 'dorm.check' },
  { code: 'student.read', label: '学生查询', requiredPermission: 'student.read' },
  { code: 'statistics.read', label: '数据统计', requiredPermission: 'statistics.read' },
];

export class WorkbenchQuickActionProvider implements IQuickActionProvider {
  getQuickActions(permissionSet: Set<PermissionCode>): QuickAction[] {
    return ALL_QUICK_ACTIONS.filter((a) =>
      permissionSet.has(a.requiredPermission as PermissionCode)
    );
  }
}
