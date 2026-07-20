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

/**
 * TodoService - 待办管理服务
 *
 * 纯查询 + 完成模块：Todo 的创建由 Leave/Notice/Dorm 等业务模块完成。
 *
 * 数据权限（角色混合过滤，不使用 DataScope）：
 * - ADMIN / POLITICAL：无过滤，查看全部待办
 * - GRADE_DIRECTOR / HEADMASTER / DORM_MANAGER：WHERE teacher_id = currentUser.id
 * - SUBJECT_TEACHER：无权限（Guard 拦截）
 *
 * docs/08-Database.md DB-017
 * docs/09-API.md 第九章
 */
@Injectable()
export class TodoService {
  private readonly logger = new Logger('TodoService');

  constructor(private prisma: PrismaService) {}

  /**
   * 待办列表
   *
   * 默认只显示 TODO 和 PROCESSING 状态
   * 支持按 status/businessType/priority 筛选
   */
  async findAll(query: QueryTodoDto, user: CurrentUserPayload) {
    const where = this.buildFilter(user);

    // 状态过滤（默认 TODO + PROCESSING）
    if (query.status) {
      where.status = query.status as any;
    } else {
      where.status = { in: ['TODO', 'PROCESSING'] };
    }

    // 业务类型过滤
    if (query.businessType) {
      where.business_type = query.businessType;
    }

    // 优先级过滤
    if (query.priority) {
      where.priority = query.priority;
    }

    const [list, total] = await Promise.all([
      this.prisma.todo.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' },
        ],
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              teacher_no: true,
            },
          },
        },
      }),
      this.prisma.todo.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 待办详情
   */
  async findOne(id: number, user: CurrentUserPayload) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: BigInt(id) },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            teacher_no: true,
            phone: true,
          },
        },
      },
    });

    if (!todo) {
      throw new NotFoundException('待办记录不存在');
    }

    // 非管理员只能查看自己的待办
    this.checkOwnerAccess(todo.teacher_id, user);

    return todo;
  }

  /**
   * 完成待办
   *
   * 状态校验：仅 TODO / PROCESSING 可完成
   * DONE / CANCELLED 为终态，禁止操作
   *
   * 写入 finished_at
   */
  async complete(id: number, user: CurrentUserPayload) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: BigInt(id) },
    });

    if (!todo) {
      throw new NotFoundException('待办记录不存在');
    }

    // 状态校验
    if (todo.status === 'DONE') {
      throw new BadRequestException('待办已完成，无法重复操作');
    }
    if (todo.status === 'CANCELLED') {
      throw new BadRequestException('待办已取消，无法操作');
    }

    // 非管理员只能完成自己的待办
    this.checkOwnerAccess(todo.teacher_id, user);

    const updated = await this.prisma.todo.update({
      where: { id: BigInt(id) },
      data: {
        status: 'DONE',
        finished_at: new Date(),
      },
    });

    this.logger.log(`完成待办: ${todo.todo_no} ${todo.title}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 批量完成待办
   *
   * 使用 updateMany + where status IN (TODO, PROCESSING) 保证安全
   * 只更新属于当前用户的待办（非管理员）
   */
  async batchComplete(ids: number[], user: CurrentUserPayload) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请选择至少一条待办');
    }

    const bigIntIds = ids.map((id) => BigInt(id));

    // 非管理员限制只能操作自己的待办
    const ownerFilter = this.isAdmin(user)
      ? {}
      : { teacher_id: BigInt(user.id) };

    const result = await this.prisma.todo.updateMany({
      where: {
        id: { in: bigIntIds },
        status: { in: ['TODO', 'PROCESSING'] },
        ...ownerFilter,
      },
      data: {
        status: 'DONE',
        finished_at: new Date(),
      },
    });

    this.logger.log(`批量完成待办: ${result.count} 条, 操作人: ${user.name}`);

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  /**
   * 待办统计
   *
   * 统计当前用户可见待办的各状态数量
   */
  async getStatistics(user: CurrentUserPayload) {
    const where = this.buildFilter(user);

    const [todoCount, processingCount, doneCount, cancelledCount] = await Promise.all([
      this.prisma.todo.count({ where: { ...where, status: 'TODO' } }),
      this.prisma.todo.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.todo.count({ where: { ...where, status: 'DONE' } }),
      this.prisma.todo.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
      todo: todoCount,
      processing: processingCount,
      done: doneCount,
      cancelled: cancelledCount,
      total: todoCount + processingCount + doneCount + cancelledCount,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 构建过滤条件
   *
   * ADMIN / POLITICAL：无过滤
   * 其他角色：WHERE teacher_id = currentUser.id
   */
  private buildFilter(user: CurrentUserPayload): any {
    if (this.isAdmin(user)) {
      return {};
    }

    return { teacher_id: BigInt(user.id) };
  }

  /**
   * 校验所有者权限
   *
   * ADMIN / POLITICAL 可操作任意待办
   * 其他角色只能操作 teacher_id = 自己的待办
   */
  private checkOwnerAccess(todoTeacherId: bigint, user: CurrentUserPayload): void {
    if (this.isAdmin(user)) {
      return;
    }

    if (Number(todoTeacherId) !== user.id) {
      throw new ForbiddenException('无权操作该待办');
    }
  }

  /**
   * 按角色批量创建待办（内部方法，供 Leave/Dorm 等业务模块调用）
   *
   * 自动解析目标角色的教师列表，为每个教师创建一条 Todo。
   * 在调用方事务内执行，保证事务一致性。
   *
   * 用法示例（Leave 模块）：
   *   await this.todoService.createForRole(tx, {
   *     roleCode: 'ROLE_POLITICAL',
   *     title: '审批请假：张明',
   *     content: '班主任李老师为学生张明发起离校请假',
   *     businessType: 'LEAVE',
   *     businessId: leaveRecord.id,
   *     priority: 'HIGH',
   *   });
   */
  async createForRole(
    tx: any,
    data: {
      roleCode: string;
      title: string;
      content?: string;
      businessType: string;
      businessId: bigint;
      priority?: string;
    },
  ): Promise<number> {
    // 查询目标角色的教师列表
    const teacherRoles = await tx.teacherRole.findMany({
      where: {
        role: { role_code: data.roleCode },
        teacher: { status: true, deleted_at: null },
      },
      select: { teacher_id: true },
    });

    const teacherIds = [...new Set(teacherRoles.map((tr: any) => tr.teacher_id))];

    if (teacherIds.length === 0) return 0;

    const now = new Date();

    await tx.todo.createMany({
      data: teacherIds.map((teacherId) => ({
        todo_no: `D${now.toISOString().slice(0, 19).replace(/[-T:]/g, '')}${Math.floor(Math.random() * 10000)}`,
        title: data.title,
        content: data.content || null,
        teacher_id: teacherId,
        business_type: data.businessType,
        business_id: data.businessId,
        priority: data.priority || 'NORMAL',
        status: 'TODO',
      })),
      skipDuplicates: true,
    });

    this.logger.log(`按角色创建待办: ${data.roleCode} → ${teacherIds.length} 条`);

    return teacherIds.length;
  }

  /**
   * 判断是否为管理员角色（可查看/操作全部待办）
   */
  private isAdmin(user: CurrentUserPayload): boolean {
    return user.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_POLITICAL');
  }
}
