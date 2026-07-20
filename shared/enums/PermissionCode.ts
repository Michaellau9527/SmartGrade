/**
 * PermissionCode — 权限能力编码
 *
 * 上游规则：docs/10-Permission.md §16 权限矩阵 + Sprint 2.1 Day 5.1 刘老师 2026-07-20 拍板
 *
 * 设计原则：
 * - 三级命名：domain.action（如 leave.create）
 * - 用 enum 而非字符串常量：IDE 自动提示，避免拼写错误
 * - Sprint 2 只冻结真正要开发的权限，不预留给未来 Sprint 的权限
 * - 权限按业务模块分组，便于扩展
 *
 * 冻结状态：Sprint 2 v1.0 冻结，Sprint 3 按需扩展
 */

export enum PermissionCode {
  // ============================================================
  // 工作台（Workbench）
  // ============================================================
  WORKBENCH_VIEW = 'workbench.view',

  // ============================================================
  // 请假（Leave）— Sprint 2.2 核心模块
  // ============================================================
  LEAVE_CREATE = 'leave.create',
  LEAVE_READ = 'leave.read',
  LEAVE_UPDATE = 'leave.update',
  LEAVE_APPROVE = 'leave.approve',
  LEAVE_CLOSE = 'leave.close',
  LEAVE_CANCEL = 'leave.cancel',

  // ============================================================
  // 通知（Notice）
  // ============================================================
  NOTICE_READ = 'notice.read',
  NOTICE_PUBLISH = 'notice.publish',
  NOTICE_DELETE = 'notice.delete',

  // ============================================================
  // 任务（Task）
  // ============================================================
  TASK_READ = 'task.read',
  TASK_ASSIGN = 'task.assign',
  TASK_COMPLETE = 'task.complete',
  TASK_DELETE = 'task.delete',

  // ============================================================
  // 违纪 / 异常（Incident）
  // ============================================================
  INCIDENT_CREATE = 'incident.create',
  INCIDENT_READ = 'incident.read',
  INCIDENT_HANDLE = 'incident.handle',
  INCIDENT_CLOSE = 'incident.close',

  // ============================================================
  // 宿舍（Dorm）
  // ============================================================
  DORM_READ = 'dorm.read',
  DORM_CHECK = 'dorm.check',
  DORM_REPORT = 'dorm.report',

  // ============================================================
  // 学生（Student）
  // ============================================================
  STUDENT_READ = 'student.read',

  // ============================================================
  // 数据统计（Statistics）
  // ============================================================
  STATISTICS_READ = 'statistics.read',

  // ============================================================
  // 用户资料（User Profile）
  // ============================================================
  USER_PROFILE_READ = 'user.profile.read',
  USER_PROFILE_UPDATE = 'user.profile.update',

  // ============================================================
  // 文件（File）
  // ============================================================
  FILE_READ = 'file.read',
  FILE_PUBLISH = 'file.publish',

  // ============================================================
  // 系统管理（System）— 仅 ROLE_ADMIN
  // ============================================================
  SYSTEM_ADMIN = 'system.admin',
}

/** 权限显示文本 */
export const PermissionCodeText: Record<PermissionCode, string> = {
  [PermissionCode.WORKBENCH_VIEW]: '查看工作台',

  [PermissionCode.LEAVE_CREATE]: '发起请假',
  [PermissionCode.LEAVE_READ]: '查看请假',
  [PermissionCode.LEAVE_UPDATE]: '修改请假',
  [PermissionCode.LEAVE_APPROVE]: '审批请假',
  [PermissionCode.LEAVE_CLOSE]: '销假',
  [PermissionCode.LEAVE_CANCEL]: '取消请假',

  [PermissionCode.NOTICE_READ]: '查看通知',
  [PermissionCode.NOTICE_PUBLISH]: '发布通知',
  [PermissionCode.NOTICE_DELETE]: '删除通知',

  [PermissionCode.TASK_READ]: '查看任务',
  [PermissionCode.TASK_ASSIGN]: '分配任务',
  [PermissionCode.TASK_COMPLETE]: '完成任务',
  [PermissionCode.TASK_DELETE]: '删除任务',

  [PermissionCode.INCIDENT_CREATE]: '上报异常',
  [PermissionCode.INCIDENT_READ]: '查看异常',
  [PermissionCode.INCIDENT_HANDLE]: '处理异常',
  [PermissionCode.INCIDENT_CLOSE]: '关闭异常',

  [PermissionCode.DORM_READ]: '查看宿舍',
  [PermissionCode.DORM_CHECK]: '查寝',
  [PermissionCode.DORM_REPORT]: '宿舍异常上报',

  [PermissionCode.STUDENT_READ]: '查看学生',

  [PermissionCode.STATISTICS_READ]: '查看统计',

  [PermissionCode.USER_PROFILE_READ]: '查看个人资料',
  [PermissionCode.USER_PROFILE_UPDATE]: '修改个人资料',

  [PermissionCode.FILE_READ]: '查看文件',
  [PermissionCode.FILE_PUBLISH]: '发布文件',

  [PermissionCode.SYSTEM_ADMIN]: '系统管理',
};
