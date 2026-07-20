/**
 * WorkbenchResponse — 工作台响应类型（跨端共享）
 *
 * 上游规则：Sprint 2.2 C01 Review 1 — 刘老师拍板
 *
 * 设计原则：
 * - Workbench 围绕"今天"（Today's Work），不是围绕"我的数据"
 * - 所有端（小程序 / Admin / Web）统一引用此类型
 * - Controller 不自己写 interface，统一从这里 import
 *
 * Sprint 2.2 C01-R1 冻结
 */

// ============================================================
// Today — 今天
// ============================================================

/** 今天信息 — Workbench 围绕"今天"设计 */
export interface WorkbenchToday {
  /** 日期 YYYY-MM-DD */
  date: string;

  /** 星期几（英文全称） */
  week: string;

  /** 本学期第几周 */
  semesterWeek: number;

  /** 是否上学日（节假日 / 周末 / 寒暑假判断） */
  isSchoolDay: boolean;
}

// ============================================================
// StudentStatusSummary — 学生状态总览
// ============================================================

/** 学生状态总览（按 DataScope 过滤后） */
export interface StudentStatusSummary {
  /** 管理学生总数 */
  totalStudents: number;

  /** 在校人数 */
  onCampus: number;

  /** 离校人数（含请假已走） */
  outOfSchool: number;

  /** 尚未完成离校/返校闭环的学生数 */
  studentsLeaving: number;

  /** 逾期未返校 */
  overdueReturn: number;

  /** 宿舍异常（仅宿管可见） */
  dormAbnormal: number;
}

// ============================================================
// WorkbenchTodo — 今日待办
// ============================================================

/** 工作台待办条目 */
export interface WorkbenchTodo {
  /** 待办 ID */
  id: string;

  /** 待办标题 */
  title: string;

  /** 待办类型 */
  type: WorkbenchTodoType;

  /** 状态 */
  status: WorkbenchTodoStatus;

  /** 截止时间（ISO 8601） */
  dueAt: string | null;

  /** 关联来源类型 */
  sourceType: WorkbenchTodoSource | null;

  /** 关联来源 ID */
  sourceId: string | null;
}

export type WorkbenchTodoType = 'LEAVE_APPROVE' | 'TASK_COMPLETE' | 'DORM_CHECK' | 'INCIDENT_HANDLE' | 'OTHER';

export type WorkbenchTodoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type WorkbenchTodoSource = 'LEAVE' | 'TASK' | 'DORM' | 'INCIDENT' | 'NOTICE' | 'OTHER';

// ============================================================
// WorkbenchNotice — 最近通知
// ============================================================

/** 工作台通知条目 */
export interface WorkbenchNotice {
  /** 通知 ID */
  id: string;

  /** 通知标题 */
  title: string;

  /** 通知类型 */
  noticeType: WorkbenchNoticeType;

  /** 发布时间（ISO 8601） */
  publishedAt: string;

  /** 是否已读 */
  isRead: boolean;
}

export type WorkbenchNoticeType = 'NOTICE' | 'URGENT' | 'MEETING' | 'HOLIDAY' | 'TEACHING';

// ============================================================
// QuickAction — 快捷操作
// ============================================================

/** 快捷操作按钮（根据 permissionSet 动态生成） */
export interface QuickAction {
  /** 操作编码（对应 PermissionCode） */
  code: string;

  /** 显示标签 */
  label: string;

  /** 需要的权限 */
  requiredPermission: string;
}

// ============================================================
// WorkbenchResponse — 工作台完整响应
// ============================================================

/**
 * GET /workbench 响应
 *
 * 设计围绕"今天"：
 *   - today：日期上下文
 *   - todos：今天待处理
 *   - studentStatusSummary：今天学生状态
 *   - recentNotices：最近通知
 *   - quickActions：可操作按钮
 */
export interface WorkbenchResponse {
  /** 今天 */
  today: WorkbenchToday;

  /** 今日待办 */
  todos: WorkbenchTodo[];

  /** 学生状态总览 */
  studentStatusSummary: StudentStatusSummary;

  /** 最近通知 */
  recentNotices: WorkbenchNotice[];

  /** 快捷操作 */
  quickActions: QuickAction[];
}
