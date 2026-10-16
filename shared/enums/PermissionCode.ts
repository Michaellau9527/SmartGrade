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
  // 班级（Class）— 班级管理
  //
  // 编码形式说明：与上方 teacher:bind-wechat / student:qrcode:issue 同理，
  // 本域采用 `domain:action` 冒号形式，与运行时真相源（数据库 permission 表 +
  // seed.ts + 99_rbac_seed_data.sql）及 controller @RequirePermissions 保持一致。
  // 授权：
  // - ROLE_ADMIN 由 PermissionsGuard 短路放行（全权，不落库 role_permission）
  // - ROLE_GRADE_DIRECTOR 具备全部四项，服务层限定「本年级」数据范围
  // - ROLE_POLITICAL / ROLE_HEADMASTER 仅 class:read（只读，且受数据范围约束）
  // ============================================================
  CLASS_READ = 'class:read',
  CLASS_CREATE = 'class:create',
  CLASS_UPDATE = 'class:update',
  CLASS_DELETE = 'class:delete',

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
  // 教师微信绑定（Teacher WeChat Binding）— P1-13
  //
  // 编码形式说明：本域采用 `domain:action` 冒号形式，而非本文件其余项的
  // `domain.action` 点号形式。原因：运行时权限真相源是数据库 permission
  // 表（auth.service.loadPermissionsByRoles 走 role_permission JOIN permission
  // 查询），该表与 teacher.controller 现均使用冒号形式（teacher:read 等）。
  // P1-13 新增项必须与 DB 编码一致，且不得再制造新的裸字符串常量。
  // 点号/冒号两种形式的历史不一致属权限治理事项，不在 P1-13 范围内统一。
  // ============================================================
  TEACHER_BIND_WECHAT = 'teacher:bind-wechat',
  TEACHER_UNBIND_WECHAT = 'teacher:unbind-wechat',

  // ============================================================
  // 学生身份二维码与离校核验（QR Credential & Gate Verify）— P2-QR 阶段E
  //
  // 编码形式说明：与上方 teacher:bind-wechat 同理，本域采用 `domain:action`
  // 冒号形式，与数据库 permission 表真相源及 seed.ts 保持一致。
  // - student:qrcode:issue  班主任为本班学生签发/补发二维码（数据范围校验在服务层）
  // - student:qrcode:batch  按年级/班级批量签发（仅 ROLE_ADMIN 使用）
  // - verify:scan           门卫扫码核验（不授予 student:read，核验结果脱敏）
  // ============================================================
  STUDENT_QRCODE_ISSUE = 'student:qrcode:issue',
  STUDENT_QRCODE_BATCH = 'student:qrcode:batch',
  VERIFY_SCAN = 'verify:scan',

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

  [PermissionCode.CLASS_READ]: '查看班级',
  [PermissionCode.CLASS_CREATE]: '新增班级',
  [PermissionCode.CLASS_UPDATE]: '修改班级',
  [PermissionCode.CLASS_DELETE]: '删除班级',

  [PermissionCode.STATISTICS_READ]: '查看统计',

  [PermissionCode.USER_PROFILE_READ]: '查看个人资料',
  [PermissionCode.USER_PROFILE_UPDATE]: '修改个人资料',

  [PermissionCode.FILE_READ]: '查看文件',
  [PermissionCode.FILE_PUBLISH]: '发布文件',

  [PermissionCode.TEACHER_BIND_WECHAT]: '绑定教师微信',
  [PermissionCode.TEACHER_UNBIND_WECHAT]: '解绑教师微信',

  [PermissionCode.STUDENT_QRCODE_ISSUE]: '补发学生二维码',
  [PermissionCode.STUDENT_QRCODE_BATCH]: '批量签发学生二维码',
  [PermissionCode.VERIFY_SCAN]: '扫码核验',

  [PermissionCode.SYSTEM_ADMIN]: '系统管理',
};
