import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CurrentUserPayload } from '@/common/types';
import { QueryTodoDto } from './dto';

@Injectable()
export class TodoService {
  private readonly logger = new Logger('TodoService');

  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryTodoDto, user: CurrentUserPayload) {
    const where = this.buildFilter(user);

    if (query.status) {
      where.status = query.status as any;
    } else {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (query.businessType) {
      where.source = query.businessType;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [list, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              teacherNo: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const todo = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            teacherNo: true,
            phone: true,
          },
        },
      },
    });

    if (!todo) {
      throw new NotFoundException('待办记录不存在');
    }

    this.checkOwnerAccess(todo.assigneeId, user);

    return todo;
  }

  async complete(id: string, user: CurrentUserPayload) {
    const todo = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException('待办记录不存在');
    }

    if (todo.status === 'COMPLETED') {
      throw new BadRequestException('待办已完成，无法重复操作');
    }
    if (todo.status === 'CANCELLED') {
      throw new BadRequestException('待办已取消，无法操作');
    }

    this.checkOwnerAccess(todo.assigneeId, user);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`完成待办: ${todo.taskNo} ${todo.title}, 操作人: ${user.name}`);

    return updated;
  }

  async batchComplete(ids: string[], user: CurrentUserPayload) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请选择至少一条待办');
    }

    const ownerFilter = this.isAdmin(user)
      ? {}
      : { assigneeId: String(user.id) };

    const result = await this.prisma.task.updateMany({
      where: {
        id: { in: ids },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        ...ownerFilter,
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`批量完成待办: ${result.count} 条, 操作人: ${user.name}`);

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async getStatistics(user: CurrentUserPayload) {
    const where = this.buildFilter(user);

    const [todoCount, processingCount, doneCount, cancelledCount] = await Promise.all([
      this.prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
      todo: todoCount,
      processing: processingCount,
      done: doneCount,
      cancelled: cancelledCount,
      total: todoCount + processingCount + doneCount + cancelledCount,
    };
  }

  private buildFilter(user: CurrentUserPayload): any {
    if (this.isAdmin(user)) {
      return {};
    }

    return { assigneeId: String(user.id) };
  }

  private checkOwnerAccess(todoAssigneeId: string, user: CurrentUserPayload): void {
    if (this.isAdmin(user)) {
      return;
    }

    if (todoAssigneeId !== String(user.id)) {
      throw new ForbiddenException('无权操作该待办');
    }
  }

  async createForRole(
    tx: any,
    data: {
      roleCode: string;
      title: string;
      content?: string;
      businessType: string;
      businessId: string;
      priority?: string;
    },
  ): Promise<number> {
    let teacherRoles: any[] = [];
    try {
      teacherRoles = await tx.teacherRole.findMany({
        where: {
          role: { roleCode: data.roleCode },
          teacher: { status: 'ACTIVE', deletedAt: null },
        },
        select: { teacherId: true },
      });
    } catch {
      return 0;
    }

    const teacherIds = [...new Set(teacherRoles.map((tr: any) => tr.teacherId))];

    if (teacherIds.length === 0) return 0;

    const now = new Date();

    await tx.task.createMany({
      data: teacherIds.map((teacherId) => ({
        taskNo: `D${now.toISOString().slice(0, 19).replace(/[-T:]/g, '')}${Math.floor(Math.random() * 10000)}`,
        title: data.title,
        content: data.content || null,
        assigneeId: teacherId,
        assigneeName: '',
        source: data.businessType,
        sourceId: data.businessId,
        creatorId: teacherId,
        creatorName: '',
        schoolId: '',
        dueAt: now,
        priority: data.priority || 'NORMAL',
        status: 'PENDING',
      })),
      skipDuplicates: true,
    });

    this.logger.log(`按角色创建待办: ${data.roleCode} → ${teacherIds.length} 条`);

    return teacherIds.length;
  }

  private isAdmin(user: CurrentUserPayload): boolean {
    return user.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_POLITICAL');
  }
}
