import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { DataScope, CurrentUserPayload } from '@/common/types';
import { QueryTimelineDto } from './dto';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger('TimelineService');

  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryTimelineDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);

    if (query.studentId) {
      where.studentId = query.studentId;
    }
    if (query.teacherId) {
      where.operatorId = query.teacherId;
    }
    if (query.eventType) {
      where.eventType = query.eventType as any;
    }
    if (query.startDate || query.endDate) {
      where.occurredAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        (where.occurredAt as any).gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        (where.occurredAt as any).lte = end;
      }
    }
    if (query.sourceId) {
      where.sourceEventId = query.sourceId;
    }

    const [list, total] = await Promise.all([
      this.prisma.timelineEvent.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { occurredAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentNo: true,
              name: true,
              gender: true,
              currentStatus: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  grade: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
              dorm: {
                include: {
                  building: { select: { id: true, name: true } },
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              teacherNo: true,
            },
          },
          leaveRecord: {
            select: {
              id: true,
              leaveNo: true,
              leaveType: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.timelineEvent.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const timeline = await this.prisma.timelineEvent.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            gender: true,
            currentStatus: true,
            phone: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
            dorm: {
              include: {
                building: { select: { id: true, name: true } },
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            teacherNo: true,
            phone: true,
          },
        },
        leaveRecord: {
          include: {
            student: {
              select: { id: true, studentNo: true, name: true },
            },
          },
        },
      },
    });

    if (!timeline) {
      throw new NotFoundException('时间轴记录不存在');
    }

    const student = (timeline as any).student;
    this.checkDataScopeAccess(
      student.classId,
      'unknown',
      student,
      user.dataScope,
    );

    return timeline;
  }

  async getStatistics(user: CurrentUserPayload) {
    const baseWhere = await this.buildDataScopeFilter(user.dataScope);

    const eventTypeStats = await this.prisma.timelineEvent.groupBy({
      by: ['eventType'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const byEventType: Record<string, number> = {};
    for (const stat of eventTypeStats) {
      byEventType[stat.eventType] = stat._count.id;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
      this.prisma.timelineEvent.count({
        where: { ...baseWhere, occurredAt: { gte: todayStart } },
      }),
      this.prisma.timelineEvent.count({
        where: { ...baseWhere, occurredAt: { gte: weekStart } },
      }),
      this.prisma.timelineEvent.count({
        where: { ...baseWhere, occurredAt: { gte: monthStart } },
      }),
      this.prisma.timelineEvent.count({ where: baseWhere }),
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

  private async buildDataScopeFilter(dataScope: DataScope): Promise<any> {
    const baseFilter: any = {};

    switch (dataScope.type) {
      case 'ALL':
        break;

      case 'GRADE':
        if (dataScope.gradeId) {
          baseFilter.student = {
            class: { gradeId: String(dataScope.gradeId) },
          };
        } else {
          baseFilter.id = 'none';
        }
        break;

      case 'CLASS':
        if (dataScope.classId) {
          baseFilter.student = {
            classId: String(dataScope.classId),
          };
        } else {
          baseFilter.id = 'none';
        }
        break;

      case 'DORM':
        baseFilter.student = {
          boardingType: 'BOARDING',
        };
        break;

      case 'SELF':
        baseFilter.id = 'none';
        break;
    }

    return baseFilter;
  }

  private checkDataScopeAccess(
    studentClassId: string,
    _studentBoardingType: string,
    student: any,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        if (student.class && dataScope.gradeId) {
          const gradeId = student.class.gradeId;
          if (gradeId !== String(dataScope.gradeId)) {
            throw new ForbiddenException('无权访问该时间轴记录');
          }
        }
        return;
      case 'CLASS':
        if (dataScope.classId && studentClassId !== String(dataScope.classId)) {
          throw new ForbiddenException('无权访问该时间轴记录');
        }
        return;
      case 'DORM':
        if (!student || student.boardingType !== 'BOARDING') {
          throw new ForbiddenException('无权访问走读学生的时间轴记录');
        }
        return;
      case 'SELF':
        throw new ForbiddenException('无权访问时间轴记录（暂无授课班级）');
    }
  }
}
