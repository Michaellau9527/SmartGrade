/**
 * WorkbenchController — 工作台接口（Sprint 2.2 C01 简化版）
 *
 * 职责：
 * - 从 JWT 拿 teacherId，确认身份（CurrentUser）
 * - 通过 PrismaService 一次性查：学校/年级/班级归属 + 角色/权限 + 学生状态 + 待办 + 通知
 * - 直接组装 WorkbenchResponse 返回
 *
 * 为什么这么写（刘老师原则）：
 * - C01 工作台是纯读聚合，不写任何业务数据
 * - 之前 Provider 模式依赖单例 Repository（另起 PrismaClient 池），部署环境容易连接失败
 * - 简化：所有查询统一走 Nest 注入的 PrismaService，一个事务上下文 + 一个连接池
 * - 后续 C03/C04/C05 各 Capability 有自己的 Service 后，再把每块查询替换为调用对应 Service
 *
 * 角色来源：
 * - 直接使用 JWT 中由 teacher_role 表计算出的真实角色（见 JwtStrategy）
 * - 无任何角色时，仅按真实业务关系兜底（年级主任 / 班主任 / 任课教师），不含工号硬编码
 */

import { Controller, Get, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import { PrismaService } from '@/common/prisma';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { getPermissions } from '../../authorization/role-permission.map';
import type {
  WorkbenchResponse,
  WorkbenchToday,
  StudentStatusSummary,
  WorkbenchTodo,
  WorkbenchTodoSource,
  WorkbenchNotice,
  QuickAction,
} from '@smartgrade/shared/types/workbench/WorkbenchResponse';

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const ALL_QUICK_ACTIONS: QuickAction[] = [
  { code: 'leave.create',      label: '发起请假', requiredPermission: 'leave.create' },
  { code: 'leave.approve',     label: '审批请假', requiredPermission: 'leave.approve' },
  { code: 'notice.publish',    label: '发布通知', requiredPermission: 'notice.publish' },
  { code: 'task.assign',       label: '分配任务', requiredPermission: 'task.assign' },
  { code: 'incident.create',   label: '上报异常', requiredPermission: 'incident.create' },
  { code: 'dorm.check',        label: '查寝',     requiredPermission: 'dorm.check' },
  { code: 'student.read',      label: '学生查询', requiredPermission: 'student.read' },
  { code: 'statistics.read',   label: '数据统计', requiredPermission: 'statistics.read' },
];

/**
 * 工作台「全校可见」判定（P1-1 收口）
 *
 * 规则：全校可见仅限系统管理员 / 政教。
 * - 年级主任 → 本年级范围
 * - 班主任 → 本班范围
 * - 宿管 → 既有宿管权限（非全校）
 * - 任课教师 / 其他角色 → 按真实班级/年级关系，无关系则 deny by default
 *
 * ⚠️ 严禁「无班级关系 + 无年级关系 = 全校权限」：普通教师不得因没有关系而获得全校数据。
 * 抽成纯函数便于 ts-node 单测（见 test/workbench-scope.idor.ts）。
 */
export function computeWorkbenchSchoolWide(roleCodes: RoleCode[]): boolean {
  return (
    roleCodes.includes(RoleCode.ROLE_ADMIN) ||
    roleCodes.includes(RoleCode.ROLE_POLITICAL)
  );
}

@ApiTags('工作台')
@ApiBearerAuth()
@Controller('workbench')
export class WorkbenchController {
  private readonly logger = new Logger('WorkbenchController');

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取工作台数据' })
  async getWorkbench(@CurrentUser() user: CurrentUserPayload): Promise<WorkbenchResponse> {
    const teacherId = String((user as any).teacherId || (user as any).id);
    if (!teacherId) throw new UnauthorizedException('未识别的用户身份');

    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new UnauthorizedException('教师不存在');

    // 1. 组织归属：TeacherClassRelation + grade.director
    const classRels = await this.prisma.teacherClassRelation.findMany({
      where: { teacherId, endDate: null },
      select: { role: true, class: { select: { id: true, gradeId: true, schoolId: true } } },
    });
    const directedGrades = await this.prisma.grade.findMany({
      where: { directorId: teacherId },
      select: { id: true, schoolId: true },
    });
    const classIds = [...new Set(classRels.filter((r) => r.class).map((r) => r.class!.id))];
    const gradeIds = [
      ...new Set([
        ...classRels.filter((r) => r.class).map((r) => r.class!.gradeId),
        ...directedGrades.map((g) => g.id),
      ]),
    ];
    const schoolIds = [
      ...classRels.filter((r) => r.class).map((r) => r.class!.schoolId),
      ...directedGrades.map((g) => g.schoolId),
    ];
    const schoolId = schoolIds[0] ?? '';

    // 2. 角色：直接使用 JWT 中由 teacher_role 表计算出的真实角色（见 JwtStrategy）
    //    不再自行查库，杜绝 SQL 注入；无角色时按真实业务关系兜底（不含工号硬编码）
    let roleCodes: RoleCode[] = [...(user.roles as RoleCode[])];
    if (roleCodes.length === 0) {
      roleCodes = this._deriveRolesFromRelations(classRels, directedGrades.length > 0);
    }

    const roleSet = new Set(roleCodes);
    const permissionSet = new Set<string>();
    roleCodes.forEach((r) => {
      try { getPermissions(r).forEach((p) => permissionSet.add(p)); } catch {}
    });

    // P1-1：全校可见仅限 ADMIN / POLITICAL，不再因「无班级/年级关系」兜底成全校
    const isSchoolWide = computeWorkbenchSchoolWide(roleCodes);

    this.logger.log(
      `[Workbench] ${teacher.teacherNo}(${teacher.name}) roles=${roleCodes.join(',')} ` +
        `schoolWide=${isSchoolWide} classes=${classIds.length} grades=${gradeIds.length} school=${schoolId}`,
    );

    // 3. 学生状态统计（按数据范围）
    const studentStatus = await this._countStudentStatus(schoolId, {
      isSchoolWide,
      classIds,
      gradeIds,
    });

    // 4. 待办：按 teacherId 查
    const todos = await this._getTodos(teacherId);

    // 5. 通知：按学校查最近 5 条
    const notices = await this._getNotices(schoolId);

    // 6. 快捷操作：按权限过滤
    const quickActions = ALL_QUICK_ACTIONS.filter((a) => permissionSet.has(a.requiredPermission));

    return {
      today: _computeToday(),
      todos,
      studentStatusSummary: studentStatus,
      recentNotices: notices,
      quickActions,
    };
  }

  // ============================================================
  // 私有查询方法
  // ============================================================

  /** 按数据范围统计学生状态 */
  private async _countStudentStatus(
    schoolId: string,
    scope: { isSchoolWide: boolean; classIds: string[]; gradeIds: string[] },
  ): Promise<StudentStatusSummary> {
    if (!schoolId) {
      return { totalStudents: 0, onCampus: 0, outOfSchool: 0, studentsLeaving: 0, overdueReturn: 0, dormAbnormal: 0 };
    }
    const where = this._buildStudentWhere(schoolId, scope);

    const [total, onCampus, outOfSchool, boardingOut] = await Promise.all([
      this.prisma.student.count({ where: { ...where, deletedAt: null } }),
      this.prisma.student.count({ where: { ...where, deletedAt: null, currentStatus: 'ON_CAMPUS' } }),
      this.prisma.student.count({ where: { ...where, deletedAt: null, currentStatus: 'OUT_OF_SCHOOL' } }),
      // 未闭环：离校+住宿生（简化规则）
      this.prisma.student.count({
        where: { ...where, deletedAt: null, currentStatus: 'OUT_OF_SCHOOL', boardingType: 'BOARDING' },
      }),
    ]);

    return {
      totalStudents: total,
      onCampus,
      outOfSchool,
      studentsLeaving: boardingOut,
      overdueReturn: 0,
      dormAbnormal: 0,
    };
  }

  /** 构建学生查询条件（按 scope） */
  private _buildStudentWhere(
    schoolId: string,
    scope: { isSchoolWide: boolean; classIds: string[]; gradeIds: string[] },
  ) {
    if (scope.isSchoolWide) return { schoolId };
    if (scope.classIds.length > 0) return { schoolId, classId: { in: scope.classIds } };
    if (scope.gradeIds.length > 0) return { schoolId, gradeId: { in: scope.gradeIds } };
    // P1-1 deny by default：非全校且没有任何班级/年级范围时，不匹配任何学生
    // （原 `return { schoolId }` 会把「无关系教师」错误地暴露成全校数据）
    return { schoolId, id: { in: [] } };
  }

  /** 查教师今日待办（Task 表：assigneeId = teacherId，status PENDING/IN_PROGRESS） */
  private async _getTodos(teacherId: string): Promise<WorkbenchTodo[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: teacherId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deletedAt: null,
      },
      orderBy: [{ dueAt: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    });

    return tasks.map((t) => {
      const source = t.source as unknown as string;
      return {
        id: t.id,
        title: t.title,
        type: source === 'LEAVE' ? 'LEAVE_APPROVE'
             : source === 'DORM' ? 'DORM_CHECK'
             : source === 'INCIDENT' ? 'INCIDENT_HANDLE' : 'OTHER',
        status: t.status as WorkbenchTodo['status'],
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        sourceType: t.source as unknown as WorkbenchTodoSource | null ?? 'OTHER',
        sourceId: t.sourceId ?? '',
      };
    });
  }

  /** 查学校最近通知（PUBLISHED，已发布） */
  private async _getNotices(schoolId: string): Promise<WorkbenchNotice[]> {
    if (!schoolId) return [];
    const notices = await this.prisma.notice.findMany({
      where: { schoolId, status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      noticeType: (n.noticeType as WorkbenchNotice['noticeType']) ?? 'NOTICE',
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : n.createdAt.toISOString(),
      isRead: false,
    }));
  }

  /** 按真实业务关系兜底分配角色（不含工号硬编码） */
  private _deriveRolesFromRelations(
    classRels: { role: string }[],
    isGradeDirector: boolean,
  ): RoleCode[] {
    if (isGradeDirector) return [RoleCode.ROLE_GRADE_DIRECTOR];
    const hasHead = classRels.some((r) => r.role === 'HEAD_TEACHER');
    if (hasHead) return [RoleCode.ROLE_HEADMASTER];
    return [RoleCode.ROLE_SUBJECT_TEACHER];
  }
}

// ============================================================
// 工具：Today 计算
// ============================================================

function _computeToday(): WorkbenchToday {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const day = now.getDay();
  const isSchoolDay = day >= 1 && day <= 5;

  const semesterStart = new Date(yyyy, 8, 1);
  const diffDays = Math.floor(
    (now.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const semesterWeek = Math.max(1, Math.ceil((diffDays + 1) / 7));

  return {
    date: `${yyyy}-${mm}-${dd}`,
    week: WEEK_DAYS[day],
    semesterWeek,
    isSchoolDay,
  };
}
