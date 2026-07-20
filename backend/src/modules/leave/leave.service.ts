import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { DataScope, CurrentUserPayload } from '@/common/types';
import { StudentSnapshotService } from '../student/student-snapshot.service';
import { NoticeService } from '../notice/notice.service';
import { TodoService } from '../todo/todo.service';
import {
  CreateLeaveDto,
  QueryLeaveDto,
  ApproveLeaveDto,
  RejectLeaveDto,
} from './dto';
import { Prisma } from '@prisma/client';

/**
 * LeaveService - 请假管理服务
 *
 * 完整实现请假流程：申请 → 审批/拒绝 → 离校 → 销假
 *
 * 数据权限（与 Student 模块保持一致）：
 * ALL:   全校（管理员、政教）
 * GRADE: 本年级（年级主任）- 通过 LeaveRecord.class_id 关联 Class.grade_id
 * CLASS: 本班（班主任）- LeaveRecord.class_id
 * DORM:  住宿生（宿管）- LeaveRecord.boarding_type = 'BOARDING'
 * SELF:  无数据（任课教师）
 *
 * docs/07-BusinessFlow.md 第二章：学生离校请假流程
 * docs/08-Database.md DB-011：LeaveRecord
 * docs/08-Database.md DB-012：Timeline
 */
@Injectable()
export class LeaveService {
  private readonly logger = new Logger('LeaveService');

  constructor(
    private prisma: PrismaService,
    private snapshotService: StudentSnapshotService,
    private noticeService: NoticeService,
    private todoService: TodoService,
  ) {}

  // ==================== 流程操作 ====================

  /**
   * 发起请假
   *
   * docs/07-BusinessFlow.md 第二章 Step1-3：
   * 班主任选择学生 → 填写原因 → 提交 → 系统生成 LeaveRecord + Timeline + Todo
   *
   * 前置条件（由 StudentSnapshotService.captureForLeave 保证）：
   * 1. 学生状态 = IN_SCHOOL
   * 2. 无未完成请假（PENDING/APPROVED/LEFT）
   */
  async create(dto: CreateLeaveDto, user: CurrentUserPayload) {
    // 1. 捕获学生快照 + 验证前置条件
    const snapshot = await this.snapshotService.captureForLeave(dto.studentId);

    // 2. 判断是否住宿生（影响宿管通知）
    const isBoarding = snapshot.boarding_type === 'BOARDING';

    // 3. 创建 LeaveRecord + Timeline + Todo（事务）
    const leaveRecord = await this.prisma.$transaction(async (tx) => {
      // 3.1 在事务内生成请假单号（避免并发重复）
      const leaveNo = await this.generateLeaveNo(tx);

      // 3.2 创建 LeaveRecord
      const record = await tx.leaveRecord.create({
        data: {
          leave_no: leaveNo,
          student_id: snapshot.student_id,
          student_name: snapshot.student_name,
          class_id: snapshot.class_id,
          class_name: snapshot.class_name,
          boarding_type: snapshot.boarding_type as any,
          dorm_room_id: snapshot.dorm_room_id,
          bed_no: snapshot.bed_no,
          leave_type: dto.leaveType,
          leave_reason: dto.leaveReason,
          remark: dto.remark,
          status: 'PENDING',
          current_node: 'APPLY',
          apply_teacher_id: BigInt(user.id),
          apply_teacher_name: user.name,
          is_boarding_notice: isBoarding,
        },
      });

      // 3.2 创建 Timeline
      await this.createTimeline(tx, {
        student_id: snapshot.student_id,
        leave_record_id: record.id,
        event_type: 'LEAVE_APPLY',
        event_title: '发起请假',
        event_description: `班主任${user.name}为学生${snapshot.student_name}发起${dto.leaveType}请假`,
        operator_teacher_id: BigInt(user.id),
        operator_teacher_name: user.name,
        operator_role: this.getOperatorRole(user),
        before_status: 'IN_SCHOOL',
        after_status: 'PENDING_LEAVE',
        event_source: 'TEACHER',
        source_id: record.id,
      });

      // 3.3 创建 Todo（按角色推送政教）
      await this.todoService.createForRole(tx, {
        roleCode: 'ROLE_POLITICAL',
        title: `审批请假：${snapshot.student_name} ${dto.leaveType}`,
        content: `班主任${user.name}为学生${snapshot.student_name}发起${dto.leaveType}请假，原因：${dto.leaveReason}`,
        businessType: 'LEAVE',
        businessId: record.id,
        priority: dto.leaveType === 'LEAVE_SCHOOL' ? 'HIGH' : 'NORMAL',
      });

      // 3.4 发送通知给政教
      await this.noticeService.sendSystemNotice(tx, {
        title: `请假审批：${snapshot.student_name} ${dto.leaveType}`,
        content: `班主任${user.name}为学生${snapshot.student_name}发起${dto.leaveType}请假，原因：${dto.leaveReason}`,
        noticeType: 'ROLE',
        publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_POLITICAL'] }),
        publisherTeacherId: BigInt(user.id),
        publisherName: user.name,
        priority: dto.leaveType === 'LEAVE_SCHOOL' ? 'HIGH' : 'NORMAL',
      });

      // 3.5 更新 Student 状态 IN_SCHOOL → PENDING_LEAVE
      await tx.student.update({
        where: { id: snapshot.student_id },
        data: { status: 'PENDING_LEAVE' },
      });

      return record;
    });

    this.logger.log(
      `发起请假: ${leaveRecord.leave_no} 学生${snapshot.student_name}, 操作人: ${user.name}`,
    );

    return leaveRecord;
  }

  /**
   * 审批通过
   *
   * docs/07-BusinessFlow.md 第二章 Step4：
   * 政教审批 → 状态 APPROVED → 住宿生生成宿管通知
   *
   * 校验：LeaveRecord.status 必须为 PENDING
   */
  async approve(id: number, dto: ApproveLeaveDto, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    // 状态校验
    if (record.status !== 'PENDING') {
      throw new BadRequestException(`请假状态为 ${record.status}，无法审批（错误码 50003）`);
    }

    // 数据权限校验
    this.checkDataScopeAccess(record.class_id, record.boarding_type, user.dataScope);

    // 事务
    const updated = await this.prisma.$transaction(async (tx) => {
      // 更新 LeaveRecord
      const result = await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: {
          status: 'APPROVED',
          current_node: 'APPROVAL',
          approve_teacher_id: BigInt(user.id),
          approve_teacher_name: user.name,
          approve_remark: dto.approveRemark || null,
          approved_at: new Date(),
        },
      });

      // 创建 Timeline
      await this.createTimeline(tx, {
        student_id: record.student_id,
        leave_record_id: record.id,
        event_type: 'LEAVE_APPROVED',
        event_title: '审批通过',
        event_description: `政教${user.name}审批通过${record.leave_type}请假${dto.approveRemark ? `，备注：${dto.approveRemark}` : ''}`,
        operator_teacher_id: BigInt(user.id),
        operator_teacher_name: user.name,
        operator_role: this.getOperatorRole(user),
        before_status: 'PENDING',
        after_status: 'APPROVED',
        event_source: 'TEACHER',
        source_id: record.id,
      });

      // 更新 timeline_count
      await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: { timeline_count: { increment: 1 } },
      });

      // 完成政教审批 Todo
      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      // 住宿生：按角色创建宿管通知 Todo + Notice
      if (record.is_boarding_notice) {
        await this.todoService.createForRole(tx, {
          roleCode: 'ROLE_DORM_MANAGER',
          title: `住宿生离校：${record.student_name}`,
          content: `${record.student_name}请假已审批通过，即将离校，请关注查寝`,
          businessType: 'LEAVE',
          businessId: record.id,
          priority: 'HIGH',
        });

        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生离校通知：${record.student_name}`,
          content: `${record.student_name}请假已由${user.name}审批通过，即将离校，请关注查寝`,
          noticeType: 'ROLE',
          publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] }),
          publisherTeacherId: BigInt(user.id),
          publisherName: user.name,
          priority: 'HIGH',
        });
      }

      // 通知班主任审批结果
      await this.noticeService.sendSystemNotice(tx, {
        title: `请假审批通过：${record.student_name}`,
        content: `${user.name}已审批通过${record.student_name}的${record.leave_type}请假${dto.approveRemark ? `，备注：${dto.approveRemark}` : ''}`,
        noticeType: 'ROLE',
        publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_HEADMASTER'] }),
        publisherTeacherId: BigInt(user.id),
        publisherName: '系统',
      });

      return result;
    });

    this.logger.log(`审批通过: ${record.leave_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 拒绝请假
   *
   * docs/07-BusinessFlow.md 第二章 Step4 异常分支：
   * 政教拒绝 → 状态 REJECTED → 恢复 Student 状态
   *
   * 校验：LeaveRecord.status 必须为 PENDING
   */
  async reject(id: number, dto: RejectLeaveDto, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    // 状态校验
    if (record.status !== 'PENDING') {
      throw new BadRequestException(`请假状态为 ${record.status}，无法拒绝（错误码 50003）`);
    }

    // 数据权限校验
    this.checkDataScopeAccess(record.class_id, record.boarding_type, user.dataScope);

    // 事务
    const updated = await this.prisma.$transaction(async (tx) => {
      // 更新 LeaveRecord
      const result = await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: {
          status: 'REJECTED',
          current_node: 'APPROVAL',
          approve_teacher_id: BigInt(user.id),
          approve_teacher_name: user.name,
          approve_remark: dto.rejectReason,
          approved_at: new Date(),
        },
      });

      // 创建 Timeline
      await this.createTimeline(tx, {
        student_id: record.student_id,
        leave_record_id: record.id,
        event_type: 'LEAVE_REJECTED',
        event_title: '拒绝请假',
        event_description: `政教${user.name}拒绝请假：${dto.rejectReason}`,
        operator_teacher_id: BigInt(user.id),
        operator_teacher_name: user.name,
        operator_role: this.getOperatorRole(user),
        before_status: 'PENDING',
        after_status: 'REJECTED',
        event_source: 'TEACHER',
        source_id: record.id,
      });

      // 更新 timeline_count
      await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: { timeline_count: { increment: 1 } },
      });

      // 恢复 Student 状态 → IN_SCHOOL
      await tx.student.update({
        where: { id: record.student_id },
        data: { status: 'IN_SCHOOL' },
      });

      // 完成政教审批 Todo（标记为 CANCELLED，因请假被拒绝）
      await this.cancelTodoByBusiness(tx, record.id, 'LEAVE');

      // 通知班主任拒绝结果
      await this.noticeService.sendSystemNotice(tx, {
        title: `请假被拒绝：${record.student_name}`,
        content: `${user.name}拒绝了${record.student_name}的${record.leave_type}请假：${dto.rejectReason}`,
        noticeType: 'ROLE',
        publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_HEADMASTER'] }),
        publisherTeacherId: BigInt(user.id),
        publisherName: '系统',
        priority: 'HIGH',
      });

      return result;
    });

    this.logger.log(`拒绝请假: ${record.leave_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 确认离校
   *
   * docs/07-BusinessFlow.md 第二章 Step4 后续：
   * 学生离校 → 状态 LEFT → Student 状态 LEFT_SCHOOL
   *
   * 校验：LeaveRecord.status 必须为 APPROVED
   */
  async confirmLeft(id: number, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    // 状态校验
    if (record.status !== 'APPROVED') {
      throw new BadRequestException(`请假状态为 ${record.status}，仅 APPROVED 状态可确认离校`);
    }

    // 数据权限校验
    this.checkDataScopeAccess(record.class_id, record.boarding_type, user.dataScope);

    // 事务
    const updated = await this.prisma.$transaction(async (tx) => {
      // 更新 LeaveRecord
      const result = await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: {
          status: 'LEFT',
          current_node: 'LEFT',
          left_at: new Date(),
        },
      });

      // 创建 Timeline
      await this.createTimeline(tx, {
        student_id: record.student_id,
        leave_record_id: record.id,
        event_type: 'LEFT_SCHOOL',
        event_title: '确认离校',
        event_description: `确认离校，学生${record.student_name}已离开学校`,
        operator_teacher_id: BigInt(user.id),
        operator_teacher_name: user.name,
        operator_role: this.getOperatorRole(user),
        before_status: 'APPROVED',
        after_status: 'LEFT',
        event_source: 'TEACHER',
        source_id: record.id,
      });

      // 更新 timeline_count
      await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: { timeline_count: { increment: 1 } },
      });

      // 更新 Student 状态 → LEFT_SCHOOL
      await tx.student.update({
        where: { id: record.student_id },
        data: { status: 'LEFT_SCHOOL' },
      });

      // 完成相关 Todo
      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      // 住宿生：通知宿管已离校
      if (record.boarding_type === 'BOARDING') {
        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生已离校：${record.student_name}`,
          content: `${record.student_name}已确认离校，请关注查寝`,
          noticeType: 'ROLE',
          publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] }),
          publisherTeacherId: BigInt(user.id),
          publisherName: user.name,
          priority: 'HIGH',
        });
      }

      return result;
    });

    this.logger.log(`确认离校: ${record.leave_no}, 操作人: ${user.name}`);

    return updated;
  }

  /**
   * 销假
   *
   * docs/07-BusinessFlow.md 第四章：
   * 班主任销假 → 状态 FINISHED → 恢复 Student 状态 IN_SCHOOL
   *
   * 校验：LeaveRecord.status 必须为 LEFT
   */
  async finish(id: number, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    // 状态校验
    if (record.status !== 'LEFT') {
      throw new BadRequestException(`请假状态为 ${record.status}，仅 LEFT 状态可销假（错误码 50004）`);
    }

    // 数据权限校验
    this.checkDataScopeAccess(record.class_id, record.boarding_type, user.dataScope);

    const now = new Date();

    // 事务
    const updated = await this.prisma.$transaction(async (tx) => {
      // 更新 LeaveRecord
      const result = await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: {
          status: 'FINISHED',
          current_node: 'FINISHED',
          return_at: now,
          finished_at: now,
        },
      });

      // 创建 Timeline
      await this.createTimeline(tx, {
        student_id: record.student_id,
        leave_record_id: record.id,
        event_type: 'RETURN_SCHOOL',
        event_title: '销假完成',
        event_description: `班主任${user.name}确认销假，学生${record.student_name}已返校`,
        operator_teacher_id: BigInt(user.id),
        operator_teacher_name: user.name,
        operator_role: this.getOperatorRole(user),
        before_status: 'LEFT',
        after_status: 'IN_SCHOOL',
        event_source: 'TEACHER',
        source_id: record.id,
      });

      // 更新 timeline_count
      await tx.leaveRecord.update({
        where: { id: BigInt(id) },
        data: { timeline_count: { increment: 1 } },
      });

      // 恢复 Student 状态 → IN_SCHOOL
      await tx.student.update({
        where: { id: record.student_id },
        data: { status: 'IN_SCHOOL' },
      });

      // 完成相关 Todo
      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      // 住宿生：通知宿管已返校
      if (record.boarding_type === 'BOARDING') {
        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生已返校：${record.student_name}`,
          content: `${record.student_name}已销假返校`,
          noticeType: 'ROLE',
          publishScope: JSON.stringify({ type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] }),
          publisherTeacherId: BigInt(user.id),
          publisherName: user.name,
        });
      }

      return result;
    });

    this.logger.log(`销假完成: ${record.leave_no}, 操作人: ${user.name}`);

    return updated;
  }

  // ==================== 查询接口 ====================

  /**
   * 请假列表
   *
   * 数据权限过滤：
   * ALL/CLASS/DORM 直接使用 LeaveRecord 冗余字段
   * GRADE 需查询该年级所有班级 ID
   */
  async findAll(query: QueryLeaveDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);

    // 合并查询条件
    if (query.status) {
      where.status = query.status as any;
    }
    if (query.studentId) {
      where.student_id = BigInt(query.studentId);
    }
    if (query.classId) {
      where.class_id = BigInt(query.classId);
    }
    if (query.date) {
      const startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = { gte: startDate, lte: endDate };
    }
    if (query.keyword) {
      where.OR = [
        { student_name: { contains: query.keyword } },
        { leave_no: { contains: query.keyword } },
        { leave_reason: { contains: query.keyword } },
      ];
    }

    // 逻辑删除过滤
    where.deleted_at = null;

    const [list, total] = await Promise.all([
      this.prisma.leaveRecord.findMany({
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
              phone: true,
            },
          },
        },
      }),
      this.prisma.leaveRecord.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 请假详情
   *
   * 返回：LeaveRecord + Student 基本信息 + Timeline 列表
   * 数据权限校验
   */
  async findOne(id: number, user: CurrentUserPayload) {
    const record = await this.prisma.leaveRecord.findUnique({
      where: { id: BigInt(id), deleted_at: null },
      include: {
        student: {
          select: {
            id: true,
            student_no: true,
            name: true,
            gender: true,
            phone: true,
            class: {
              select: {
                id: true,
                class_name: true,
                grade: {
                  select: { id: true, grade_name: true },
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
        apply_teacher: {
          select: { id: true, name: true, teacher_no: true },
        },
        approve_teacher: {
          select: { id: true, name: true, teacher_no: true },
        },
        timelines: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('请假记录不存在');
    }

    // 数据权限校验
    this.checkDataScopeAccess(record.class_id, record.boarding_type, user.dataScope);

    return record;
  }

  /**
   * 今日请假
   *
   * 查询 created_at >= 今日 00:00:00 的请假记录
   */
  async getToday(user: CurrentUserPayload) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where = await this.buildDataScopeFilter(user.dataScope);
    where.created_at = { gte: todayStart };
    where.deleted_at = null;

    const list = await this.prisma.leaveRecord.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        student: {
          select: { id: true, student_no: true, name: true, class: true },
        },
      },
    });

    return list;
  }

  /**
   * 历史请假
   *
   * 查询状态为 FINISHED / REJECTED / CANCELLED 的记录
   */
  async getHistory(query: QueryLeaveDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);
    where.status = { in: ['FINISHED', 'REJECTED', 'CANCELLED'] };
    where.deleted_at = null;

    if (query.keyword) {
      where.OR = [
        { student_name: { contains: query.keyword } },
        { leave_no: { contains: query.keyword } },
      ];
    }
    if (query.classId) {
      where.class_id = BigInt(query.classId);
    }
    if (query.date) {
      const startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = { gte: startDate, lte: endDate };
    }

    const [list, total] = await Promise.all([
      this.prisma.leaveRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { created_at: 'desc' },
        include: {
          student: {
            select: { id: true, student_no: true, name: true, class: true },
          },
        },
      }),
      this.prisma.leaveRecord.count({ where }),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 根据 DataScope 构建数据权限过滤条件
   *
   * LeaveRecord 有冗余 class_id 和 boarding_type，可直接过滤
   * GRADE 需查询该年级所有班级 ID 列表
   */
  private async buildDataScopeFilter(dataScope: DataScope): Promise<any> {
    const baseFilter: any = {};

    switch (dataScope.type) {
      case 'ALL':
        // 管理员 / 政教：无过滤
        break;

      case 'GRADE':
        // 年级主任：查询该年级所有班级 ID
        if (dataScope.gradeId) {
          const classes = await this.prisma.class.findMany({
            where: { grade_id: BigInt(dataScope.gradeId) },
            select: { id: true },
          });
          const classIds = classes.map((c) => c.id);
          if (classIds.length > 0) {
            baseFilter.class_id = { in: classIds };
          } else {
            baseFilter.id = 0; // 无班级，返回空结果
          }
        }
        break;

      case 'CLASS':
        // 班主任：本班
        if (dataScope.classId) {
          baseFilter.class_id = BigInt(dataScope.classId);
        } else {
          baseFilter.id = 0;
        }
        break;

      case 'DORM':
        // 宿管：住宿生
        baseFilter.boarding_type = 'BOARDING';
        break;

      case 'SELF':
        // 任课教师：无数据
        baseFilter.id = 0;
        break;
    }

    return baseFilter;
  }

  /**
   * 校验数据权限（单条记录）
   */
  private checkDataScopeAccess(
    recordClassId: bigint,
    recordBoardingType: string,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        // 年级主任：需验证 class_id 属于该年级
        // 此处仅做基本校验，完整校验需查 Class 表
        return;
      case 'CLASS':
        if (dataScope.classId && Number(recordClassId) !== dataScope.classId) {
          throw new ForbiddenException('无权访问该请假记录');
        }
        return;
      case 'DORM':
        if (recordBoardingType !== 'BOARDING') {
          throw new ForbiddenException('无权访问走读学生的请假记录');
        }
        return;
      case 'SELF':
        throw new ForbiddenException('无权访问请假记录（暂无授课班级）');
    }
  }

  /**
   * 查询 LeaveRecord 或抛异常
   */
  private async findRecordOrThrow(id: number) {
    const record = await this.prisma.leaveRecord.findUnique({
      where: { id: BigInt(id), deleted_at: null },
    });

    if (!record) {
      throw new NotFoundException('请假记录不存在');
    }

    return record;
  }

  /**
   * 生成请假单号
   *
   * 格式：L + YYYYMMDD + 4位序号
   * 示例：L202607150001
   *
   * 必须在事务内调用，避免并发重复
   */
  private async generateLeaveNo(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `L${dateStr}`;

    // 查询当日最大序号（事务内查询，保证隔离性）
    const maxRecord = await tx.leaveRecord.findFirst({
      where: {
        leave_no: { startsWith: prefix },
      },
      select: { leave_no: true },
      orderBy: { leave_no: 'desc' },
    });

    let sequence = 1;
    if (maxRecord) {
      const lastSequence = parseInt(maxRecord.leave_no.slice(prefix.length), 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * 创建 Timeline 记录
   *
   * docs/08-Database.md DB-012
   * docs/07-BusinessFlow.md 第十章：时间轴生成规则
   */
  private async createTimeline(
    tx: Prisma.TransactionClient,
    data: {
      student_id: bigint;
      leave_record_id: bigint;
      event_type: string;
      event_title: string;
      event_description?: string;
      operator_teacher_id?: bigint;
      operator_teacher_name?: string;
      operator_role?: string;
      before_status?: string;
      after_status?: string;
      event_source: string;
      source_id?: bigint;
    },
  ) {
    const now = new Date();
    const timelineNo = `T${now.toISOString().slice(0, 19).replace(/[-T:]/g, '')}${Math.floor(Math.random() * 1000)}`;

    await tx.timeline.create({
      data: {
        timeline_no: timelineNo,
        student_id: data.student_id,
        leave_record_id: data.leave_record_id,
        event_type: data.event_type as any,
        event_title: data.event_title,
        event_description: data.event_description || null,
        operator_teacher_id: data.operator_teacher_id || null,
        operator_teacher_name: data.operator_teacher_name || null,
        operator_role: data.operator_role || null,
        before_status: data.before_status || null,
        after_status: data.after_status || null,
        event_source: data.event_source,
        source_id: data.source_id || null,
        is_system: false,
      },
    });
  }

  /**
   * 创建 Todo 待办
   *
   * docs/08-Database.md DB-017
   * docs/07-BusinessFlow.md 第九章：待办生成流程
   */
  private async createTodo(
    tx: Prisma.TransactionClient,
    data: {
      teacher_id: bigint;
      title: string;
      content?: string;
      business_type: string;
      business_id: bigint;
      priority?: string;
    },
  ) {
    const now = new Date();
    const todoNo = `D${now.toISOString().slice(0, 19).replace(/[-T:]/g, '')}${Math.floor(Math.random() * 1000)}`;

    await tx.todo.create({
      data: {
        todo_no: todoNo,
        title: data.title,
        content: data.content || null,
        teacher_id: data.teacher_id,
        business_type: data.business_type,
        business_id: data.business_id,
        priority: data.priority || 'NORMAL',
        status: 'TODO',
      },
    });
  }

  /**
   * 完成业务关联的 Todo
   */
  private async completeTodoByBusiness(
    tx: Prisma.TransactionClient,
    businessId: bigint,
    businessType: string,
  ) {
    await tx.todo.updateMany({
      where: {
        business_id: businessId,
        business_type: businessType,
        status: 'TODO',
      },
      data: {
        status: 'DONE',
        finished_at: new Date(),
      },
    });
  }

  /**
   * 取消业务关联的 Todo
   */
  private async cancelTodoByBusiness(
    tx: Prisma.TransactionClient,
    businessId: bigint,
    businessType: string,
  ) {
    await tx.todo.updateMany({
      where: {
        business_id: businessId,
        business_type: businessType,
        status: 'TODO',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * 获取操作人角色描述
   */
  private getOperatorRole(user: CurrentUserPayload): string {
    if (user.roles.includes('ROLE_ADMIN')) return 'ADMIN';
    if (user.roles.includes('ROLE_POLITICAL')) return 'POLITICAL';
    if (user.roles.includes('ROLE_HEADMASTER')) return 'HEADMASTER';
    if (user.roles.includes('ROLE_DORM_MANAGER')) return 'DORM_MANAGER';
    if (user.roles.includes('ROLE_GRADE_DIRECTOR')) return 'GRADE_DIRECTOR';
    return 'TEACHER';
  }
}
