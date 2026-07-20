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

/**
 * NoticeService - 通知管理服务
 *
 * docs/07-BusinessFlow.md 第七章：通知发布流程
 * docs/08-Database.md DB-013 Notice / DB-014 NoticeRead
 *
 * 核心机制：
 * - 发布通知时批量生成 NoticeRead（每个目标教师一条）
 * - 查询通知通过 NoticeRead 关联过滤（普通教师只看自己收到的）
 * - 管理员/发布者可查看自己发布的全部通知
 * - 查看详情时自动标记已读
 */
@Injectable()
export class NoticeService {
  private readonly logger = new Logger('NoticeService');

  constructor(private prisma: PrismaService) {}

  /**
   * 通知列表
   *
   * 普通教师：通过 NoticeRead.teacher_id 查询已收到的通知
   * 管理员：查看自己发布的全部通知 + 已收到的通知
   *
   * 支持按 status/noticeType/priority/unread 筛选
   */
  async findAll(query: QueryNoticeDto, user: CurrentUserPayload) {
    const isAdmin = this.isAdmin(user);

    let where: any = { deleted_at: null };

    if (isAdmin) {
      // 管理员：自己发布的 + 自己收到的
      const publishedNoticeIds = await this.prisma.noticeRead.findMany({
        where: { teacher_id: BigInt(user.id) },
        select: { notice_id: true },
      });
      const receivedIds = publishedNoticeIds.map((r) => r.notice_id);
      where.OR = [
        { publisher_teacher_id: BigInt(user.id) },
        ...(receivedIds.length > 0 ? [{ id: { in: receivedIds } }] : []),
      ];
    } else {
      // 普通教师：只看自己收到的通知
      const receivedNoticeIds = await this.prisma.noticeRead.findMany({
        where: { teacher_id: BigInt(user.id) },
        select: { notice_id: true },
      });
      const receivedIds = receivedNoticeIds.map((r) => r.notice_id);
      if (receivedIds.length > 0) {
        where.id = { in: receivedIds };
      } else {
        where.id = 0; // 空结果
      }
    }

    // 未读筛选
    if (query.unread) {
      const unreadIds = await this.prisma.noticeRead.findMany({
        where: {
          teacher_id: BigInt(user.id),
          is_read: false,
        },
        select: { notice_id: true },
      });
      const unreadNoticeIds = unreadIds.map((r) => r.notice_id);
      where.id = { in: unreadNoticeIds };
    }

    // 状态筛选
    if (query.status) {
      where.status = query.status as any;
    }

    // 类型筛选
    if (query.noticeType) {
      where.notice_type = query.noticeType as any;
    }

    // 优先级筛选
    if (query.priority) {
      where.priority = query.priority;
    }

    // 只显示已发布和已撤回（草稿不显示在列表中）
    if (!query.status) {
      where.status = { in: ['PUBLISHED', 'WITHDRAWN'] };
    }

    const [list, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' },
        ],
        include: {
          publisher: {
            select: { id: true, name: true, teacher_no: true },
          },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    // 附加当前用户的阅读状态
    const noticeIds = list.map((n) => n.id);
    const reads = await this.prisma.noticeRead.findMany({
      where: {
        notice_id: { in: noticeIds },
        teacher_id: BigInt(user.id),
      },
      select: { notice_id: true, is_read: true, read_at: true, confirm_at: true },
    });
    const readMap = new Map(reads.map((r) => [Number(r.notice_id), r]));

    const listWithReadStatus = list.map((notice) => {
      const read = readMap.get(Number(notice.id));
      return {
        ...notice,
        is_read: read?.is_read ?? false,
        read_at: read?.read_at ?? null,
        confirm_at: read?.confirm_at ?? null,
      };
    });

    return {
      list: listWithReadStatus,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 获取未读通知
   *
   * teacher_id = 当前用户 AND is_read = false
   */
  async findUnread(user: CurrentUserPayload) {
    const unreadReads = await this.prisma.noticeRead.findMany({
      where: {
        teacher_id: BigInt(user.id),
        is_read: false,
      },
      select: { notice_id: true },
    });

    const unreadIds = unreadReads.map((r) => r.notice_id);
    if (unreadIds.length === 0) return [];

    const list = await this.prisma.notice.findMany({
      where: {
        id: { in: unreadIds },
        deleted_at: null,
        status: 'PUBLISHED',
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
      include: {
        publisher: {
          select: { id: true, name: true, teacher_no: true },
        },
      },
    });

    return list;
  }

  /**
   * 通知详情
   *
   * 自动标记已读：is_read = true, read_at = now
   */
  async findOne(id: number, user: CurrentUserPayload) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: BigInt(id), deleted_at: null },
      include: {
        publisher: {
          select: { id: true, name: true, teacher_no: true, phone: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('通知不存在');
    }

    // 自动标记已读（后台异步更新，不阻塞返回）
    this.markAsRead(notice.id, user.id).catch(() => {});

    return notice;
  }

  /**
   * 发布通知
   *
   * 流程：
   * 1. 创建 Notice（status = PUBLISHED）
   * 2. 解析 publish_scope
   * 3. 查询目标教师
   * 4. 批量生成 NoticeRead
   */
  async create(dto: CreateNoticeDto, user: CurrentUserPayload) {
    // 验证 publish_scope JSON 格式
    let scope: any;
    try {
      scope = JSON.parse(dto.publishScope);
    } catch {
      throw new BadRequestException('publish_scope 不是有效的 JSON 格式');
    }

    if (!scope.type) {
      throw new BadRequestException('publish_scope 缺少 type 字段');
    }

    const now = new Date();
    const noticeNo = `N${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 创建 Notice
      const notice = await tx.notice.create({
        data: {
          notice_no: noticeNo,
          title: dto.title,
          content: dto.content,
          notice_type: dto.noticeType as any,
          publisher_teacher_id: BigInt(user.id),
          publisher_name: user.name,
          publish_scope: dto.publishScope,
          priority: dto.priority || 'NORMAL',
          need_confirm: dto.needConfirm ?? false,
          status: 'PUBLISHED',
          publish_at: now,
          expired_at: dto.expiredAt ? new Date(dto.expiredAt) : null,
        },
      });

      // 2. 查询目标教师
      const targetTeacherIds = await this.resolveTargetTeachers(scope);

      // 3. 批量生成 NoticeRead
      if (targetTeacherIds.length > 0) {
        await tx.noticeRead.createMany({
          data: targetTeacherIds.map((teacherId) => ({
            notice_id: notice.id,
            teacher_id: teacherId,
            is_read: false,
          })),
          skipDuplicates: true,
        });
      }

      return notice;
    });

    this.logger.log(`发布通知: ${result.notice_no} 标题: ${dto.title}, 操作人: ${user.name}`);

    return result;
  }

  /**
   * 修改通知
   *
   * 仅 DRAFT 状态可修改（发布后不可修改内容）
   */
  async update(id: number, dto: UpdateNoticeDto, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'DRAFT') {
      throw new BadRequestException(`通知状态为 ${notice.status}，仅草稿状态可修改`);
    }

    // 仅发布者或管理员可修改
    this.checkPublisherAccess(notice.publisher_teacher_id, user);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.expiredAt !== undefined) data.expired_at = new Date(dto.expiredAt);

    return this.prisma.notice.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  /**
   * 删除通知
   *
   * 仅管理员可删除
   */
  async remove(id: number, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (!this.isAdmin(user)) {
      throw new ForbiddenException('仅管理员可删除通知');
    }

    await this.prisma.notice.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`删除通知: ${notice.notice_no}, 操作人: ${user.name}`);

    return { success: true };
  }

  /**
   * 撤回通知
   *
   * PUBLISHED → WITHDRAWN
   */
  async withdraw(id: number, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'PUBLISHED') {
      throw new BadRequestException(`通知状态为 ${notice.status}，仅已发布状态可撤回`);
    }

    this.checkPublisherAccess(notice.publisher_teacher_id, user);

    const updated = await this.prisma.notice.update({
      where: { id: BigInt(id) },
      data: { status: 'WITHDRAWN' },
    });

    this.logger.log(`撤回通知: ${notice.notice_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 获取通知阅读情况
   *
   * 查询某通知所有 NoticeRead 记录
   */
  async getReads(id: number, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    const reads = await this.prisma.noticeRead.findMany({
      where: { notice_id: BigInt(id) },
      include: {
        teacher: {
          select: { id: true, name: true, teacher_no: true, department: true },
        },
      },
      orderBy: [{ is_read: 'asc' }, { read_at: 'asc' }],
    });

    // 统计
    const total = reads.length;
    const readCount = reads.filter((r) => r.is_read).length;
    const confirmedCount = reads.filter((r) => r.confirm_at !== null).length;

    return {
      notice_id: notice.id,
      notice_no: notice.notice_no,
      title: notice.title,
      total_receivers: total,
      read_count: readCount,
      unread_count: total - readCount,
      confirmed_count: confirmedCount,
      read_rate: total > 0 ? Math.round((readCount / total) * 100) : 0,
      reads,
    };
  }

  /**
   * 确认阅读
   *
   * 更新 NoticeRead.confirm_at
   */
  async confirm(id: number, user: CurrentUserPayload) {
    const notice = await this.findNoticeOrThrow(id);

    if (notice.status !== 'PUBLISHED') {
      throw new BadRequestException('仅已发布状态的通知可确认阅读');
    }

    const read = await this.prisma.noticeRead.findUnique({
      where: {
        notice_id_teacher_id: {
          notice_id: BigInt(id),
          teacher_id: BigInt(user.id),
        },
      },
    });

    if (!read) {
      throw new NotFoundException('未找到该通知的阅读记录');
    }

    const updated = await this.prisma.noticeRead.update({
      where: { id: read.id },
      data: {
        is_read: true,
        read_at: read.read_at ?? new Date(),
        confirm_at: new Date(),
      },
    });

    this.logger.log(`确认阅读通知: ${notice.notice_no}, 操作人: ${user.name}`);

    return { success: true, confirmed_at: updated.confirm_at };
  }

  // ==================== 私有方法 ====================

  /**
   * 查询通知或抛异常
   */
  private async findNoticeOrThrow(id: number) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: BigInt(id), deleted_at: null },
    });

    if (!notice) {
      throw new NotFoundException('通知不存在');
    }

    return notice;
  }

  /**
   * 自动标记已读（后台执行，不阻塞）
   */
  private async markAsRead(noticeId: bigint, userId: number) {
    try {
      await this.prisma.noticeRead.updateMany({
        where: {
          notice_id: noticeId,
          teacher_id: BigInt(userId),
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    } catch {
      // 静默失败，不影响主流程
    }
  }

  /**
   * 解析发送范围，返回目标教师 ID 列表
   *
   * publish_scope 格式：
   * { "type": "ALL" }                              → 全体教师
   * { "type": "ROLE", "roles": ["HEADMASTER"] }     → 指定角色
   * { "type": "TAG", "tags": [1, 2] }               → 指定标签
   * { "type": "ORGANIZATION", "department": "..." }  → 指定组织/部门
   */
  private async resolveTargetTeachers(scope: any): Promise<bigint[]> {
    switch (scope.type) {
      case 'ALL': {
        // 全体教师
        const teachers = await this.prisma.teacher.findMany({
          where: { status: true, deleted_at: null },
          select: { id: true },
        });
        return teachers.map((t) => t.id);
      }

      case 'ROLE': {
        // 指定角色
        const roleCodes = scope.roles as string[];
        if (!roleCodes || roleCodes.length === 0) return [];

        const teacherRoles = await this.prisma.teacherRole.findMany({
          where: {
            role: { role_code: { in: roleCodes } },
          },
          select: { teacher_id: true },
        });
        // 去重
        const ids = [...new Set(teacherRoles.map((tr) => tr.teacher_id))];
        return ids;
      }

      case 'TAG': {
        // 指定标签
        const tagIds = scope.tags as number[];
        if (!tagIds || tagIds.length === 0) return [];

        const teacherTags = await this.prisma.teacherTag.findMany({
          where: { tag_id: { in: tagIds.map((id) => BigInt(id)) } },
          select: { teacher_id: true },
        });
        const ids = [...new Set(teacherTags.map((tt) => tt.teacher_id))];
        return ids;
      }

      case 'ORGANIZATION': {
        // 指定部门
        const department = scope.department as string;
        if (!department) return [];

        const teachers = await this.prisma.teacher.findMany({
          where: { department, status: true, deleted_at: null },
          select: { id: true },
        });
        return teachers.map((t) => t.id);
      }

      default:
        return [];
    }
  }

  /**
   * 发送系统自动通知（内部方法，供 Leave/Todo 等业务模块调用）
   *
   * 在调用方事务内执行，保证事务一致性。
   * 内部复用 resolveTargetTeachers() 解析目标教师，支持 ALL/ROLE/TAG/ORGANIZATION。
   *
   * 用法示例（Leave 模块）：
   *   await this.noticeService.sendSystemNotice(tx, {
   *     title: '请假审批：张明',
   *     content: '班主任李老师为学生张明发起离校请假',
   *     noticeType: 'ROLE',
   *     publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_POLITICAL'] }),
   *     publisherTeacherId: BigInt(user.id),
   *     publisherName: '系统',
   *     priority: 'HIGH',
   *   });
   */
  async sendSystemNotice(
    tx: Prisma.TransactionClient,
    data: {
      title: string;
      content: string;
      noticeType: string;
      publishScope: string;
      publisherTeacherId: bigint;
      publisherName: string;
      priority?: string;
    },
  ): Promise<any> {
    let scope: any;
    try {
      scope = JSON.parse(data.publishScope);
    } catch {
      scope = { type: 'ALL' };
    }

    const now = new Date();
    const noticeNo = `S${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const notice = await tx.notice.create({
      data: {
        notice_no: noticeNo,
        title: data.title,
        content: data.content,
        notice_type: data.noticeType as any,
        publisher_teacher_id: data.publisherTeacherId,
        publisher_name: data.publisherName,
        publish_scope: data.publishScope,
        priority: data.priority || 'NORMAL',
        need_confirm: false,
        status: 'PUBLISHED',
        publish_at: now,
      },
    });

    // 复用 resolveTargetTeachers 解析目标教师
    const targetTeacherIds = scope.type
      ? await this.resolveTargetTeachers(scope)
      : await this.resolveTargetTeachers({ type: 'ALL' });

    if (targetTeacherIds.length > 0) {
      await tx.noticeRead.createMany({
        data: targetTeacherIds.map((teacherId) => ({
          notice_id: notice.id,
          teacher_id: teacherId,
          is_read: false,
        })),
        skipDuplicates: true,
      });
    }

    this.logger.log(`系统通知: ${noticeNo} 标题: ${data.title}`);

    return notice;
  }

  /**
   * 校验发布者权限
   *
   * ADMIN 跳过，其他角色需是通知发布者本人
   */
  private checkPublisherAccess(publisherTeacherId: bigint, user: CurrentUserPayload): void {
    if (this.isAdmin(user)) return;
    if (Number(publisherTeacherId) !== user.id) {
      throw new ForbiddenException('仅通知发布者可操作');
    }
  }

  /**
   * 判断是否为管理员角色
   */
  private isAdmin(user: CurrentUserPayload): boolean {
    return user.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_POLITICAL');
  }
}
