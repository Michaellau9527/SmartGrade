/**
 * WorkbenchService — 今日工作（C01 完整版）
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：聚合 4 个 Provider → WorkbenchResponse
 * - 不直接查 Prisma（通过 Provider 接口）
 * - 不直接改 StudentStatus（只读）
 * - 不新增数据库字段
 * - 不新增 Permission
 * - 不包含 QuickAction 过滤逻辑（由 QuickActionProvider 负责）
 *
 * 聚合设计（刘老师要求）：
 *   WorkbenchService（纯聚合器，永远只是组合）
 *     ├── TodoProvider（今日待办）
 *     ├── StudentStatusProvider（学生状态统计）
 *     ├── NoticeProvider（最近通知）
 *     └── QuickActionProvider（快捷操作，基于 permissionSet）
 *
 * 以后新增 AIActionProvider / DormActionProvider / EmergencyActionProvider
 * 都不会动 WorkbenchService。
 */

import type { AuthorizationContext } from '../authorization/types';
import type {
  WorkbenchResponse,
  WorkbenchToday,
  StudentStatusSummary,
  WorkbenchTodo,
  WorkbenchNotice,
} from '@smartgrade/shared/types/workbench/WorkbenchResponse';
import type { IQuickActionProvider } from './workbench-quick-action.provider';

// ============================================================
// Today 计算
// ============================================================

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function computeToday(date?: Date): WorkbenchToday {
  const now = date ?? new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const day = now.getDay();

  const isSchoolDay = day >= 1 && day <= 5;

  // 简化：学期第一周从 9 月 1 日开始
  const semesterStart = new Date(yyyy, 8, 1);
  const diffMs = now.getTime() - semesterStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const semesterWeek = Math.max(1, Math.ceil((diffDays + 1) / 7));

  return { date: `${yyyy}-${mm}-${dd}`, week: WEEK_DAYS[day], semesterWeek, isSchoolDay };
}

// ============================================================
// Provider 依赖接口（聚合器模式 — 刘老师要求）
//
// WorkbenchService 依赖 Provider 接口，不直接依赖 Repository。
// 后续各 Capability 有自己的 Service 时，直接替换 Provider 实现即可。
// ============================================================

/**
 * ITodoProvider — 待办数据提供方
 *
 * 对外语义：教师视角的"今日待办"
 * 当前实现：TaskRepository.findMyTasks
 * 后续演进：C04 Student Task Capability 完成后，替换为真正的 TodoService
 */
export interface ITodoService {
  /** 获取教师今日待办列表 */
  getPendingTodos(teacherId: string): Promise<{
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    sourceType: string;
    sourceId: string;
  }[]>;
}

/**
 * IStudentStatusProvider — 学生状态统计提供方
 *
 * 对外语义：按 DataScope 统计学生状态
 * 当前实现：StudentRepository.count
 * 后续演进：C05 Student Status Capability 完成后，替换为真正的 StudentStatusService
 */
export interface IStudentStatusService {
  /** 按条件统计学生数 */
  countByScope(options: {
    schoolId?: string;
    gradeId?: string;
    classId?: string;
    currentStatus?: string;
    currentLocation?: string;
    boardingType?: string;
  }): Promise<number>;
}

/**
 * INoticeProvider — 通知数据提供方
 *
 * 对外语义：按学校查最近通知
 * 当前实现：NoticeRepository.findPublishedForSchool
 * 后续演进：C03 Student Notice Capability 完成后，替换为真正的 NoticeService
 */
export interface INoticeService {
  /** 查询最近通知列表 */
  getRecentNotices(options: {
    schoolId: string;
    teacherId?: string;
    limit?: number;
  }): Promise<{
    id: string;
    title: string;
    noticeType: string;
    publishedAt: string;
    isRead: boolean;
  }[]>;
}

/** WorkbenchService 的聚合依赖集合（4 个 Provider） */
export interface WorkbenchServices {
  todoService: ITodoService;
  studentStatusService: IStudentStatusService;
  noticeService: INoticeService;
  quickActionProvider: IQuickActionProvider;
}

// ============================================================
// WorkbenchService
// ============================================================

export class WorkbenchService {
  constructor(readonly services: WorkbenchServices) {}

  /**
   * 获取工作台数据
   *
   * 聚合逻辑：
   * 1. today — 计算日期信息
   * 2. studentStatusSummary — 按 DataScope 统计学生状态
   * 3. todos — 按教师查待办任务
   * 4. recentNotices — 按学校查最近通知
   * 5. quickActions — 委托 QuickActionProvider 按 permissionSet 过滤
   */
  async getWorkbench(ctx: AuthorizationContext): Promise<WorkbenchResponse> {
    const today = computeToday();
    const { dataScope, permissionSet, organization } = ctx.authorization;

    const [todos, recentNotices] = await Promise.all([
      this._getTodos(ctx),
      this._getRecentNotices(organization),
    ]);

    const studentStatusSummary = await this._getStudentStatusSummary(dataScope, organization);

    const quickActions = this.services.quickActionProvider.getQuickActions(permissionSet);

    return { today, todos, studentStatusSummary, recentNotices, quickActions };
  }

  // ============================================================
  // 私有方法：聚合各 Provider 结果
  // ============================================================

  private async _getTodos(ctx: AuthorizationContext): Promise<WorkbenchTodo[]> {
    const { actor } = ctx;
    if (actor.userType !== 'TEACHER' || !actor.teacherId) return [];

    const tasks = await this.services.todoService.getPendingTodos(actor.teacherId);

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: this._mapTaskType(t),
      status: t.status as WorkbenchTodo['status'],
      dueAt: t.dueAt,
      sourceType: t.sourceType as WorkbenchTodo['sourceType'],
      sourceId: t.sourceId,
    }));
  }

  private async _getRecentNotices(org: { schoolId: string }): Promise<WorkbenchNotice[]> {
    if (!org.schoolId) return [];

    const notices = await this.services.noticeService.getRecentNotices({ schoolId: org.schoolId, limit: 5 });

    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      noticeType: n.noticeType as WorkbenchNotice['noticeType'],
      publishedAt: n.publishedAt,
      isRead: n.isRead,
    }));
  }

  private async _getStudentStatusSummary(
    scope: { classIds: string[]; gradeIds: string[]; isSchoolWide: boolean; isParentScoped: boolean },
    org: { schoolId: string }
  ): Promise<StudentStatusSummary> {
    if (scope.isParentScoped || !org.schoolId) {
      return { totalStudents: 0, onCampus: 0, outOfSchool: 0, studentsLeaving: 0, overdueReturn: 0, dormAbnormal: 0 };
    }

    // 按条件并行统计 4 个维度
    const [totalStudents, onCampus, outOfSchool, studentsLeaving] = await Promise.all([
      this._countByScope(scope, org, {}),
      this._countByScope(scope, org, { currentStatus: 'ON_CAMPUS' }),
      this._countByScope(scope, org, { currentStatus: 'OUT_OF_SCHOOL' }),
      this._countByScope(scope, org, { currentStatus: 'OUT_OF_SCHOOL', boardingType: 'BOARDING' }),
    ]);

    return {
      totalStudents,
      onCampus,
      outOfSchool,
      studentsLeaving,
      overdueReturn: 0,       // 后续 Sprint 3 实现
      dormAbnormal: 0,        // 后续 Sprint 3 实现
    };
  }

  private _countByScope(
    scope: { classIds: string[]; gradeIds: string[]; isSchoolWide: boolean },
    org: { schoolId: string },
    filter: { currentStatus?: string; currentLocation?: string; boardingType?: string }
  ): Promise<number> {
    if (scope.isSchoolWide) {
      return this.services.studentStatusService.countByScope({ schoolId: org.schoolId, ...filter });
    }

    if (scope.classIds.length > 0) {
      return this.services.studentStatusService.countByScope({ schoolId: org.schoolId, classId: scope.classIds[0], ...filter });
    }

    return Promise.resolve(0);
  }

  private _mapTaskType(task: { sourceType: string; status: string }): WorkbenchTodo['type'] {
    if (task.sourceType === 'LEAVE') return 'LEAVE_APPROVE';
    if (task.sourceType === 'DORM') return 'DORM_CHECK';
    if (task.sourceType === 'INCIDENT') return 'INCIDENT_HANDLE';
    return 'OTHER';
  }
}
