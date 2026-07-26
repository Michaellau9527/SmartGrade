import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload } from '@/common/types';
import { CreateNoticeDto, QueryNoticeDto, UpdateNoticeDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NoticeService {
  private readonly logger = new Logger('NoticeService');

  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryNoticeDto, user: CurrentUserPayload) {
    const isAdmin = this.isAdmin(user);

    let where: any = { deletedAt: null };

    if (isAdmin) {
      const publishedNoticeIds = await this.prisma.noticeRead.findMany({
        where: { teacherId: String(user.id) },
        select: { noticeId: true },
      });
      const receivedIds = publishedNoticeIds.map((r) => r.noticeId);
      where.OR = [
        { publisherId: String(user.id) },
        ...(receivedIds.length > 0 ? [{ id: { in: receivedIds } }] : []),
      ];
    } else {
      const receivedNoticeIds = await this.prisma.noticeRead.findMany({
        where: { teacherId: String(user.id) },
        select: { noticeId: true },
      });
      const receivedIds = receivedNoticeIds.map((r) => r.noticeId);
      if (receivedIds.length > 0) {
        where.id = { in: receivedIds };
      } else {
        where.id = 'none';
      }
    }

    if (query.unread) {
      const unreadIds = await this.prisma.noticeRead.findMany({
        where: {
          teacherId: String(user.id),
          isRead: false,
        },
        select: { noticeId: true },
      });
      const unreadNoticeIds = unreadIds.map((r) => r.noticeId);
      where.id = { in: unreadNoticeIds };
    }

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.noticeType) {
      where.noticeType = query.noticeType as any;
    }

    if (!query.status) {
      where.status = { in: ['PUBLISHED', 'ARCHIVED'] };
    }

    const [list, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [
          { createdAt: 'desc' },
        ],
        include: {
          publisher: {
            select: { id: true, name: true, teacherNo: true },
          },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    const noticeIds = list.map((n) => n.id);
    const reads = await this.prisma.noticeRead.findMany({
      where: {
        noticeId: { in: noticeIds },
        teacherId: String(user.id),
      },
      select: { noticeId: true, isRead: true, readAt: true, confirmAt: true },
    });
    const readMap = new Map(reads.map((r) => [r.noticeId, r]));

    const listWithReadStatus = list.map((notice) => {
      const read = readMap.get(notice.id);
      return {
        ...notice,
        isRead: read?.isRead ?? false,
        readAt: read?.readAt ?? null,
        confirmAt: read?.confirmAt ?? null,
      };
    });

    return {
      list: listWithReadStatus,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findUnread(user: CurrentUserPayload) {
    const unreadReads = await this.prisma.noticeRead.findMany({
      where: {
        teacherId: String(user.id),
        isRead: false,
      },
      select: { noticeId: true },
    });

    const unreadIds = unreadReads.map((r) => r.noticeId);
    if (unreadIds.length === 0) return [];

    const list = await this.prisma.notice.findMany({
      where: {
        id: { in: unreadIds },
        deletedAt: null,
        status: 'PUBLISHED',
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        publisher: {
          select: { id: true, name: true, teacherNo: true },
        },
      },
    });

    return list;
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: id, deletedAt: null },
      include: {
        publisher: {
          select: { id: true, name: true, teacherNo: true, phone: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('通知不存在');
    }

    this.markAsRead(notice.id, user.id).catch(() => {});

    return notice;
  }

  async create(dto: CreateNoticeDto, user: CurrentUserPayload) {
    let scope: any;
    try {
      scope = JSON.parse(dto.publishScope);
    } catch {
      throw new BadRequestException('publishScope 不是有效的 JSON 格式');
    }

    if (!scope.type) {
      throw new BadRequestException('publishScope 缺少 type 字段');
    }

    const now = new Date();
    const noticeNo = `N${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const notice = await tx.notice.create({
        data: {
          noticeNo: noticeNo,
          title: dto.title,
          content: dto.content,
          contentFormat: 'PLAIN',
          noticeType: dto.noticeType as any,
          publisherId: String(user.id),
          publisherName: user.name,
          targets: scope,
          requireConfirm: dto.needConfirm ?? false,
          confirmDeadline: dto.expiredAt ? new Date(dto.expiredAt) : null,
          status: 'PUBLISHED',
          publishedAt: now,
          schoolId: '',
        },
      });

      const targetTeacherIds = await this.resolveTargetTeachers(scope);

      if (targetTeacherIds.length > 0) {
        await tx.noticeRead.createMany({
          data: targetTeacherIds.map((teacherId) => ({
            noticeId: notice.id,
            teacherId: teacherId,
            isRead: false,
          })),
          skipDuplicates: true,
        });
      }

      return notice;
    });

    this.logger.log(`发布通知: ${result.noticeNo} 标题: ${dto.title}, 操作人: ${user.name}`);

    return result;
  }

  async update(id: string, dto: UpdateNoticeDto, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'DRAFT') {
      throw new BadRequestException(`通知状态为 ${notice.status}，仅草稿状态可修改`);
    }

    this.checkPublisherAccess(notice.publisherId, user);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.expiredAt !== undefined) data.confirmDeadline = new Date(dto.expiredAt);

    return this.prisma.notice.update({
      where: { id: id },
      data,
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (!this.isAdmin(user)) {
      throw new ForbiddenException('仅管理员可删除通知');
    }

    await this.prisma.notice.update({
      where: { id: id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`删除通知: ${notice.noticeNo}, 操作人: ${user.name}`);

    return { success: true };
  }

  async withdraw(id: string, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'PUBLISHED') {
      throw new BadRequestException(`通知状态为 ${notice.status}，仅已发布状态可撤回`);
    }

    this.checkPublisherAccess(notice.publisherId, user);

    const updated = await this.prisma.notice.update({
      where: { id: id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });

    this.logger.log(`撤回通知: ${notice.noticeNo}, 操作人: ${user.name}`);

    return updated;
  }

  async getReads(id: string, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    const reads = await this.prisma.noticeRead.findMany({
      where: { noticeId: id },
      include: {
        teacher: {
          select: { id: true, name: true, teacherNo: true },
        },
      },
      orderBy: [{ isRead: 'asc' }, { readAt: 'asc' }],
    });

    const total = reads.length;
    const readCount = reads.filter((r) => r.isRead).length;
    const confirmedCount = reads.filter((r) => r.confirmAt !== null).length;

    return {
      noticeId: notice.id,
      noticeNo: notice.noticeNo,
      title: notice.title,
      total_receivers: total,
      read_count: readCount,
      unread_count: total - readCount,
      confirmed_count: confirmedCount,
      read_rate: total > 0 ? Math.round((readCount / total) * 100) : 0,
      reads,
    };
  }

  async confirm(id: string, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'PUBLISHED') {
      throw new BadRequestException('仅已发布状态的通知可确认阅读');
    }

    const read = await this.prisma.noticeRead.findUnique({
      where: {
        noticeId_teacherId: {
          noticeId: id,
          teacherId: String(user.id),
        },
      },
    });

    if (!read) {
      throw new NotFoundException('未找到该通知的阅读记录');
    }

    const updated = await this.prisma.noticeRead.update({
      where: { id: read.id },
      data: {
        isRead: true,
        readAt: read.readAt ?? new Date(),
        confirmAt: new Date(),
      },
    });

    this.logger.log(`确认阅读通知: ${notice.noticeNo}, 操作人: ${user.name}`);

    return { success: true, confirmed_at: updated.confirmAt };
  }

  private async findNoticeOrThrow(id: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: id, deletedAt: null },
    });

    if (!notice) {
      throw new NotFoundException('通知不存在');
    }

    return notice;
  }

  private async markAsRead(noticeId: string, userId: number) {
    try {
      await this.prisma.noticeRead.updateMany({
        where: {
          noticeId: noticeId,
          teacherId: String(userId),
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch {
    }
  }

  private async resolveTargetTeachers(scope: any): Promise<string[]> {
    switch (scope.type) {
      case 'ALL': {
        const teachers = await this.prisma.teacher.findMany({
          where: { status: 'ACTIVE', deletedAt: null },
          select: { id: true },
        });
        return teachers.map((t) => t.id);
      }

      case 'ROLE': {
        const roleCodes = scope.roles as string[];
        if (!roleCodes || roleCodes.length === 0) return [];

        try {
          const teacherRoles = await (this.prisma as any).teacherRole.findMany({
            where: {
              role: { roleCode: { in: roleCodes } },
            },
            select: { teacherId: true },
          });
          const ids = [...new Set<string>(teacherRoles.map((tr: any) => tr.teacherId as string))];
          return ids;
        } catch {
          return [];
        }
      }

      case 'TAG': {
        const tagIds = scope.tags as string[];
        if (!tagIds || tagIds.length === 0) return [];

        try {
          const teacherTags = await (this.prisma as any).teacherTag.findMany({
            where: { tagId: { in: tagIds } },
            select: { teacherId: true },
          });
          const ids = [...new Set<string>(teacherTags.map((tt: any) => tt.teacherId as string))];
          return ids;
        } catch {
          return [];
        }
      }

      case 'ORGANIZATION': {
        const department = scope.department as string;
        if (!department) return [];

        try {
          const teachers = await (this.prisma as any).teacher.findMany({
            where: { department, status: 'ACTIVE', deletedAt: null },
            select: { id: true },
          });
          return teachers.map((t: any) => t.id);
        } catch {
          return [];
        }
      }

      default:
        return [];
    }
  }

  async sendSystemNotice(
    tx: Prisma.TransactionClient,
    data: {
      title: string;
      content: string;
      noticeType: any;
      targets: any;
      publisherId: string;
      publisherName: string;
    },
  ): Promise<any> {
    let scope: any;
    try {
      scope = typeof data.targets === 'string' ? JSON.parse(data.targets) : data.targets;
    } catch {
      scope = { type: 'ALL' };
    }

    const now = new Date();
    const noticeNo = `S${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const notice = await tx.notice.create({
      data: {
        noticeNo: noticeNo,
        title: data.title,
        content: data.content,
        noticeType: data.noticeType,
        publisherId: data.publisherId,
        publisherName: data.publisherName,
        targets: scope,
        requireConfirm: false,
        status: 'PUBLISHED',
        publishedAt: now,
        schoolId: '',
      },
    });

    const targetTeacherIds = scope.type
      ? await this.resolveTargetTeachers(scope)
      : await this.resolveTargetTeachers({ type: 'ALL' });

    if (targetTeacherIds.length > 0) {
      await tx.noticeRead.createMany({
        data: targetTeacherIds.map((teacherId) => ({
          noticeId: notice.id,
          teacherId: teacherId,
          isRead: false,
        })),
        skipDuplicates: true,
      });
    }

    this.logger.log(`系统通知: ${noticeNo} 标题: ${data.title}`);

    return notice;
  }

  private checkPublisherAccess(publisherId: string, user: CurrentUserPayload): void {
    if (this.isAdmin(user)) return;
    if (publisherId !== String(user.id)) {
      throw new ForbiddenException('仅通知发布者可操作');
    }
  }

  private isAdmin(user: CurrentUserPayload): boolean {
    return user.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_POLITICAL');
  }
}
