import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { DataScope, CurrentUserPayload } from '@/common/types';
import { QueryTimelineDto } from './dto';

/**
 * TimelineService - 时间轴查询服务
 *
 * 纯查询模块：Timeline 的写入由 Leave/Notice/Dorm 等业务模块在各自事务中完成。
 * 本服务只提供读取接口。
 *
 * docs/08-Database.md DB-012：
 *   - Event Sourcing：只新增、禁止修改、禁止删除、永久保存
 *   - 无 updated_at、无 deleted_at
 *
 * 数据权限（需通过 student 关联查询）：
 * ALL:   全部（管理员、政教）
 * GRADE: 本年级学生的事件（student → class → grade）
 * CLASS: 本班学生的事件（student → class）
 * DORM:  住宿生事件（student → boarding_type）
 * SELF:  无数据（任课教师）
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger('TimelineService');

  constructor(private prisma: PrismaService) {}

  /**
   * 时间轴列表
   *
   * 查询结构：
   *   Timeline
   *     ├── student
   *     │     └── class
   *     │            └── grade
   *     └── operatorTeacher (leave_record 关联)
   */
  async findAll(query: QueryTimelineDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);

    // 合并查询条件
    if (query.studentId) {
      where.student_id = BigInt(query.studentId);
    }
    if (query.teacherId) {
      where.operator_teacher_id = BigInt(query.teacherId);
    }
    if (query.eventType) {
      where.event_type = query.eventType as any;
    }
    if (query.startDate || query.endDate) {
      where.created_at = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        (where.created_at as any).gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        (where.created_at as any).lte = end;
      }
    }
    if (query.sourceId) {
      where.source_id = BigInt(query.sourceId);
    }

    const [list, total] = await Promise.all([
      this.prisma.timeline.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { created_at: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              student_no: true,
              name: true,
              gender: true,
              status: true,
              class: {
                select: {
                  id: true,
                  class_name: true,
                  grade: {
                    select: { id: true, grade_name: true, grade_code: true },
                  },
                },
              },
              dorm_room: {
                include: {
                  building: { select: { id: true, building_name: true } },
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              teacher_no: true,
            },
          },
          leave_record: {
            select: {
              id: true,
              leave_no: true,
              leave_type: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.timeline.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 时间轴详情
   *
   * 返回：Timeline + Student + Class + Grade + 操作教师 + 关联请假记录
   */
  async findOne(id: number, user: CurrentUserPayload) {
    const timeline = await this.prisma.timeline.findUnique({
      where: { id: BigInt(id) },
      include: {
        student: {
          select: {
            id: true,
            student_no: true,
            name: true,
            gender: true,
            status: true,
            phone: true,
            class: {
              select: {
                id: true,
                class_name: true,
                grade: {
                  select: { id: true, grade_name: true, grade_code: true },
                },
              },
            },
            dorm_room: {
              include: {
                building: { select: { id: true, building_name: true } },
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            teacher_no: true,
            phone: true,
          },
        },
        leave_record: {
          include: {
            student: {
              select: { id: true, student_no: true, name: true },
            },
          },
        },
      },
    });

    if (!timeline) {
      throw new NotFoundException('时间轴记录不存在');
    }

    // 数据权限校验：通过 student 关联检查
    const student = (timeline as any).student;
    this.checkDataScopeAccess(
      student.class_id,
      'unknown',
      student,
      user.dataScope,
    );

    return timeline;
  }

  /**
   * 时间轴统计
   *
   * docs/09-API.md 第十章：GET /api/v1/timelines/statistics
   *
   * 统计维度：
   * 1. 按事件类型（全部数据）
   * 2. 按时间范围（今日/本周/本月）
   */
  async getStatistics(user: CurrentUserPayload) {
    const baseWhere = await this.buildDataScopeFilter(user.dataScope);

    // 按事件类型统计（全部）
    const eventTypeStats = await this.prisma.timeline.groupBy({
      by: ['event_type'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const byEventType: Record<string, number> = {};
    for (const stat of eventTypeStats) {
      byEventType[stat.event_type] = stat._count.id;
    }

    // 按时间范围统计
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay() || 7; // 周日=7
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
      this.prisma.timeline.count({
        where: { ...baseWhere, created_at: { gte: todayStart } },
      }),
      this.prisma.timeline.count({
        where: { ...baseWhere, created_at: { gte: weekStart } },
      }),
      this.prisma.timeline.count({
        where: { ...baseWhere, created_at: { gte: monthStart } },
      }),
      this.prisma.timeline.count({ where: baseWhere }),
    ]);

    return {
      byEventType,
      byTime: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        total: totalCount,
      },
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 构建数据权限过滤条件
   *
   * Timeline 无冗余 class_id/boarding_type，必须通过 student 关联查询
   *
   * ALL:   无过滤
   * GRADE: WHERE student.class.grade_id = gradeId
   * CLASS: WHERE student.class_id = classId
   * DORM:  WHERE student.boarding_type = 'BOARDING'
   * SELF:  WHERE id = 0（空结果）
   */
  private async buildDataScopeFilter(dataScope: DataScope): Promise<any> {
    const baseFilter: any = {};

    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：无过滤
        break;

      case 'GRADE':
        // 年级主任：本年级学生的事件
        if (dataScope.gradeId) {
          baseFilter.student = {
            class: { grade_id: BigInt(dataScope.gradeId) },
          };
        } else {
          baseFilter.id = 0;
        }
        break;

      case 'CLASS':
        // 班主任：本班学生的事件
        if (dataScope.classId) {
          baseFilter.student = {
            class_id: BigInt(dataScope.classId),
          };
        } else {
          baseFilter.id = 0;
        }
        break;

      case 'DORM':
        // 宿管：住宿生事件
        baseFilter.student = {
          boarding_type: 'BOARDING',
        };
        break;

      case 'SELF':
        // 任课教师：无数据
        baseFilter.id = 0;
        break;
    }

    return baseFilter;
  }

  /**
   * 校验数据权限（单条记录，通过 student 关联）
   */
  private checkDataScopeAccess(
    studentClassId: bigint,
    _studentBoardingType: string,
    student: any,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        // 需验证 student.class.grade_id === dataScope.gradeId
        // student 已通过 include 加载 class 关联
        if (student.class && dataScope.gradeId) {
          const gradeId = Number(student.class.grade_id);
          if (gradeId !== dataScope.gradeId) {
            throw new ForbiddenException('无权访问该时间轴记录');
          }
        }
        return;
      case 'CLASS':
        if (dataScope.classId && Number(studentClassId) !== dataScope.classId) {
          throw new ForbiddenException('无权访问该时间轴记录');
        }
        return;
      case 'DORM':
        // 通过 student 关联验证住宿类型
        if (!student || student.boarding_type !== 'BOARDING') {
          throw new ForbiddenException('无权访问走读学生的时间轴记录');
        }
        return;
      case 'SELF':
        throw new ForbiddenException('无权访问时间轴记录（暂无授课班级）');
    }
  }
}
