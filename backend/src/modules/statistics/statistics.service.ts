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
      this.prisma.student.count({ where: { deleted_at: null } }),

      // 在校学生
      this.prisma.student.count({ where: { status: 'IN_SCHOOL', deleted_at: null } }),

      // 离校学生
      this.prisma.student.count({
        where: { status: { in: ['PENDING_LEAVE', 'LEFT_SCHOOL'] }, deleted_at: null },
      }),

      // 待审批请假
      this.prisma.leaveRecord.count({
        where: { status: 'PENDING', deleted_at: null },
      }),

      // 今日请假
      this.prisma.leaveRecord.count({
        where: { created_at: { gte: todayStart }, deleted_at: null },
      }),

      // 未读通知
      this.prisma.noticeRead.count({
        where: { teacher_id: BigInt(user.id), is_read: false },
      }),

      // 待处理待办
      this.prisma.todo.count({
        where: {
          teacher_id: BigInt(user.id),
          status: { in: ['TODO', 'PROCESSING'] },
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
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        leave_no: true,
        student_name: true,
        leave_type: true,
        status: true,
        created_at: true,
      },
    });
  }

  /**
   * 最近通知（最多 5 条未读）
   */
  async getRecentNotices(user: CurrentUserPayload) {
    const unreadIds = await this.prisma.noticeRead.findMany({
      where: { teacher_id: BigInt(user.id), is_read: false },
      select: { notice_id: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    if (unreadIds.length === 0) return [];

    const notices = await this.prisma.notice.findMany({
      where: {
        id: { in: unreadIds.map((r) => r.notice_id) },
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        priority: true,
        created_at: true,
        publisher_name: true,
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
        where: { class_id: BigInt(user.dataScope.classId || 0) },
        select: { id: true },
      });
      if (studentIds.length === 0) return [];
      where.student_id = { in: studentIds.map((s) => s.id) };
    }

    return this.prisma.timeline.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        event_type: true,
        event_title: true,
        student: { select: { name: true } },
        operator_teacher_name: true,
        created_at: true,
      },
    });
  }
}
