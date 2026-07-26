import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload } from '@/common/types';

/**
 * StatisticsService - Dashboard 数据聚合
 *
 * 为后台首页提供：
 * - 概览卡片数据（学生数/离校数/待审批/待办/未读通知）
 * - 最近请假列表
 * - 最近通知列表
 * - 最近时间轴
 */
@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Dashboard 概览 — 首页卡片数据
   */
  async getOverview(user: CurrentUserPayload) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      inSchool,
      leftSchool,
      pendingLeave,
      todayLeaves,
      unreadNotices,
      todoCount,
    ] = await Promise.all([
      // 学生总数
      this.prisma.student.count({ where: { deletedAt: null } }),

      // 在校学生
      this.prisma.student.count({ where: { currentStatus: 'ON_CAMPUS', deletedAt: null } }),

      // 离校学生
      this.prisma.student.count({
        where: { currentStatus: { in: ['OUT_OF_SCHOOL'] }, deletedAt: null },
      }),

      // 待审批请假
      this.prisma.leaveRecord.count({
        where: { status: 'PENDING', deletedAt: null },
      }),

      // 今日请假
      this.prisma.leaveRecord.count({
        where: { createdAt: { gte: todayStart }, deletedAt: null },
      }),

      // 未读通知
      this.prisma.noticeRead.count({
        where: { teacherId: String(user.id), isRead: false },
      }),

      // 待处理待办
      this.prisma.task.count({
        where: {
          assigneeId: String(user.id),
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
    ]);

    return {
      totalStudents,
      inSchool,
      leftSchool: leftSchool || 0,
      pendingLeave,
      todayLeaves,
      unreadNotices,
      todoCount,
    };
  }

  /**
   * 最近请假（最多 5 条）
   */
  async getRecentLeaves(user: CurrentUserPayload) {
    return this.prisma.leaveRecord.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        leaveNo: true,
        studentName: true,
        leaveType: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /**
   * 最近通知（最多 5 条未读）
   */
  async getRecentNotices(user: CurrentUserPayload) {
    const unreadIds = await this.prisma.noticeRead.findMany({
      where: { teacherId: String(user.id), isRead: false },
      select: { noticeId: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (unreadIds.length === 0) return [];

    const notices = await this.prisma.notice.findMany({
      where: {
        id: { in: unreadIds.map((r) => r.noticeId) },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        publisherName: true,
      },
    });

    return notices;
  }

  /**
   * 最近时间轴（最多 10 条）
   */
  async getRecentTimeline(user: CurrentUserPayload) {
    const isAdmin = user.roles.some(
      (role) => role === 'ROLE_ADMIN' || role === 'ROLE_POLITICAL',
    );

    const where: any = {};
    if (!isAdmin) {
      const studentIds = await this.prisma.student.findMany({
        where: { classId: user.dataScope.classId ? String(user.dataScope.classId) : '' },
        select: { id: true },
      });
      if (studentIds.length === 0) return [];
      where.studentId = { in: studentIds.map((s) => s.id) };
    }

    return this.prisma.timelineEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        eventType: true,
        metadata: true,
        student: { select: { name: true } },
        operatorName: true,
        occurredAt: true,
      },
    });
  }
}
