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

@Injectable()
export class LeaveService {
  private readonly logger = new Logger('LeaveService');

  constructor(
    private prisma: PrismaService,
    private snapshotService: StudentSnapshotService,
    private noticeService: NoticeService,
    private todoService: TodoService,
  ) {}

  async create(dto: CreateLeaveDto, user: CurrentUserPayload) {
    const snapshot = await this.snapshotService.captureForLeave(dto.studentId);

    const isBoarding = snapshot.boardingType === 'BOARDING';

    const leaveRecord = await this.prisma.$transaction(async (tx) => {
      const leaveNo = await this.generateLeaveNo(tx);

      const record = await tx.leaveRecord.create({
        data: {
          leaveNo: leaveNo,
          studentId: snapshot.studentId,
          studentName: snapshot.studentName,
          classId: snapshot.classId,
          className: snapshot.className,
          gradeId: '',
          schoolId: '',
          leaveType: dto.leaveType as any,
          leaveReasonType: 'OTHER' as any,
          reason: dto.leaveReason,
          startAt: new Date(),
          endAt: new Date(),
          expectedReturnTime: null,
          expectedReturnNote: null,
          status: 'DRAFT' as any,
          applicantId: String(user.id),
          applicantName: user.name,
          attachmentIds: [],
        },
      });

      await this.createTimeline(tx, {
        studentId: snapshot.studentId,
        leaveRecordId: record.id,
        eventType: 'LEAVE_APPLY' as any,
        operatorId: String(user.id),
        operatorName: user.name,
        operatorRole: this.getOperatorRole(user),
        eventSource: 'TEACHER' as any,
        sourceEventId: record.id,
        metadata: {
          eventTitle: '发起请假',
          eventDescription: `班主任${user.name}为学生${snapshot.studentName}发起${dto.leaveType}请假`,
          beforeStatus: 'IN_SCHOOL',
          afterStatus: 'PENDING_LEAVE',
        },
      });

      await this.todoService.createForRole(tx, {
        roleCode: 'ROLE_POLITICAL',
        title: `审批请假：${snapshot.studentName} ${dto.leaveType}`,
        content: `班主任${user.name}为学生${snapshot.studentName}发起${dto.leaveType}请假，原因：${dto.leaveReason}`,
        businessType: 'LEAVE',
        businessId: record.id,
        priority: dto.leaveType === 'LEAVE_SCHOOL' ? 'HIGH' : 'NORMAL',
      });

      await this.noticeService.sendSystemNotice(tx, {
        title: `请假审批：${snapshot.studentName} ${dto.leaveType}`,
        content: `班主任${user.name}为学生${snapshot.studentName}发起${dto.leaveType}请假，原因：${dto.leaveReason}`,
        noticeType: 'ROLE' as any,
        targets: { type: 'ROLE', roles: ['ROLE_POLITICAL'] },
        publisherId: String(user.id),
        publisherName: user.name,
      });

      await tx.student.update({
        where: { id: snapshot.studentId },
        data: { currentStatus: 'PENDING_LEAVE' as any },
      });

      return record;
    });

    this.logger.log(
      `发起请假: ${leaveRecord.leaveNo} 学生${snapshot.studentName}, 操作人: ${user.name}`,
    );

    return leaveRecord;
  }

  async approve(id: string, dto: ApproveLeaveDto, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    if (record.status !== 'DRAFT') {
      throw new BadRequestException(`请假状态为 ${record.status}，无法审批（错误码 50003）`);
    }

    this.checkDataScopeAccess(record.classId, '', user.dataScope);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRecord.update({
        where: { id: id },
        data: {
          status: 'APPROVED' as any,
          approverId: String(user.id),
          approverName: user.name,
          approveRemark: dto.approveRemark || null,
          approvedAt: new Date(),
        },
      });

      await this.createTimeline(tx, {
        studentId: record.studentId,
        leaveRecordId: record.id,
        eventType: 'LEAVE_APPROVED' as any,
        operatorId: String(user.id),
        operatorName: user.name,
        operatorRole: this.getOperatorRole(user),
        eventSource: 'TEACHER' as any,
        sourceEventId: record.id,
        metadata: {
          eventTitle: '审批通过',
          eventDescription: `政教${user.name}审批通过${record.leaveType}请假${dto.approveRemark ? `，备注：${dto.approveRemark}` : ''}`,
          beforeStatus: 'DRAFT',
          afterStatus: 'APPROVED',
        },
      });

      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      if (isBoarding) {
        await this.todoService.createForRole(tx, {
          roleCode: 'ROLE_DORM_MANAGER',
          title: `住宿生离校：${record.studentName}`,
          content: `${record.studentName}请假已审批通过，即将离校，请关注查寝`,
          businessType: 'LEAVE',
          businessId: record.id,
          priority: 'HIGH',
        });

        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生离校通知：${record.studentName}`,
          content: `${record.studentName}请假已由${user.name}审批通过，即将离校，请关注查寝`,
          noticeType: 'ROLE' as any,
          targets: { type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] },
          publisherId: String(user.id),
          publisherName: user.name,
        });
      }

      await this.noticeService.sendSystemNotice(tx, {
        title: `请假审批通过：${record.studentName}`,
        content: `${user.name}已审批通过${record.studentName}的${record.leaveType}请假${dto.approveRemark ? `，备注：${dto.approveRemark}` : ''}`,
        noticeType: 'ROLE' as any,
        targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
        publisherId: String(user.id),
        publisherName: '系统',
      });

      return result;
    });

    this.logger.log(`审批通过: ${record.leaveNo}, 操作人: ${user.name}`);

    return updated;
  }

  async reject(id: string, dto: RejectLeaveDto, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    if (record.status !== 'DRAFT') {
      throw new BadRequestException(`请假状态为 ${record.status}，无法拒绝（错误码 50003）`);
    }

    this.checkDataScopeAccess(record.classId, '', user.dataScope);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRecord.update({
        where: { id: id },
        data: {
          status: 'REJECTED' as any,
          approverId: String(user.id),
          approverName: user.name,
          rejectReason: dto.rejectReason,
          rejectedAt: new Date(),
        },
      });

      await this.createTimeline(tx, {
        studentId: record.studentId,
        leaveRecordId: record.id,
        eventType: 'LEAVE_REJECTED' as any,
        operatorId: String(user.id),
        operatorName: user.name,
        operatorRole: this.getOperatorRole(user),
        eventSource: 'TEACHER' as any,
        sourceEventId: record.id,
        metadata: {
          eventTitle: '拒绝请假',
          eventDescription: `政教${user.name}拒绝请假：${dto.rejectReason}`,
          beforeStatus: 'DRAFT',
          afterStatus: 'REJECTED',
        },
      });

      await tx.student.update({
        where: { id: record.studentId },
        data: { currentStatus: 'ON_CAMPUS' as any },
      });

      await this.cancelTodoByBusiness(tx, record.id, 'LEAVE');

      await this.noticeService.sendSystemNotice(tx, {
        title: `请假被拒绝：${record.studentName}`,
        content: `${user.name}拒绝了${record.studentName}的${record.leaveType}请假：${dto.rejectReason}`,
        noticeType: 'ROLE' as any,
        targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
        publisherId: String(user.id),
        publisherName: '系统',
      });

      return result;
    });

    this.logger.log(`拒绝请假: ${record.leaveNo}, 操作人: ${user.name}`);

    return updated;
  }

  async confirmLeft(id: string, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    if (record.status !== 'APPROVED') {
      throw new BadRequestException(`请假状态为 ${record.status}，仅 APPROVED 状态可确认离校`);
    }

    this.checkDataScopeAccess(record.classId, '', user.dataScope);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRecord.update({
        where: { id: id },
        data: {
          status: 'LEFT' as any,
          actualLeftAt: new Date(),
        },
      });

      await this.createTimeline(tx, {
        studentId: record.studentId,
        leaveRecordId: record.id,
        eventType: 'LEFT_SCHOOL' as any,
        operatorId: String(user.id),
        operatorName: user.name,
        operatorRole: this.getOperatorRole(user),
        eventSource: 'TEACHER' as any,
        sourceEventId: record.id,
        metadata: {
          eventTitle: '确认离校',
          eventDescription: `确认离校，学生${record.studentName}已离开学校`,
          beforeStatus: 'APPROVED',
          afterStatus: 'LEFT',
        },
      });

      await tx.student.update({
        where: { id: record.studentId },
        data: { currentStatus: 'OFF_CAMPUS' as any },
      });

      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      if (isBoarding) {
        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生已离校：${record.studentName}`,
          content: `${record.studentName}已确认离校，请关注查寝`,
          noticeType: 'ROLE' as any,
          targets: { type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] },
          publisherId: String(user.id),
          publisherName: user.name,
        });
      }

      return result;
    });

    this.logger.log(`确认离校: ${record.leaveNo}, 操作人: ${user.name}`);

    return updated;
  }

  async finish(id: string, user: CurrentUserPayload) {
    const record = await this.findRecordOrThrow(id);

    if (record.status !== 'LEFT') {
      throw new BadRequestException(`请假状态为 ${record.status}，仅 LEFT 状态可销假（错误码 50004）`);
    }

    this.checkDataScopeAccess(record.classId, '', user.dataScope);

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRecord.update({
        where: { id: id },
        data: {
          status: 'CLOSED' as any,
          actualReturnedAt: now,
          closedAt: now,
        },
      });

      await this.createTimeline(tx, {
        studentId: record.studentId,
        leaveRecordId: record.id,
        eventType: 'RETURN_SCHOOL' as any,
        operatorId: String(user.id),
        operatorName: user.name,
        operatorRole: this.getOperatorRole(user),
        eventSource: 'TEACHER' as any,
        sourceEventId: record.id,
        metadata: {
          eventTitle: '销假完成',
          eventDescription: `班主任${user.name}确认销假，学生${record.studentName}已返校`,
          beforeStatus: 'LEFT',
          afterStatus: 'ON_CAMPUS',
        },
      });

      await tx.student.update({
        where: { id: record.studentId },
        data: { currentStatus: 'ON_CAMPUS' as any },
      });

      await this.completeTodoByBusiness(tx, record.id, 'LEAVE');

      if (isBoarding) {
        await this.noticeService.sendSystemNotice(tx, {
          title: `住宿生已返校：${record.studentName}`,
          content: `${record.studentName}已销假返校`,
          noticeType: 'ROLE' as any,
          targets: { type: 'ROLE', roles: ['ROLE_DORM_MANAGER'] },
          publisherId: String(user.id),
          publisherName: user.name,
        });
      }

      return result;
    });

    this.logger.log(`销假完成: ${record.leaveNo}, 操作人: ${user.name}`);

    return updated;
  }

  async findAll(query: QueryLeaveDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);

    if (query.status) {
      where.status = query.status as any;
    }
    if (query.studentId) {
      where.studentId = String(query.studentId);
    }
    if (query.classId) {
      where.classId = String(query.classId);
    }
    if (query.date) {
      const startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }
    if (query.keyword) {
      where.OR = [
        { studentName: { contains: query.keyword } },
        { leaveNo: { contains: query.keyword } },
        { reason: { contains: query.keyword } },
      ];
    }

    where.deletedAt = null;

    const [list, total] = await Promise.all([
      this.prisma.leaveRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentNo: true,
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

  async findOne(id: string, user: CurrentUserPayload) {
    const record = await this.prisma.leaveRecord.findUnique({
      where: { id: id, deletedAt: null },
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            gender: true,
            phone: true,
          },
        },
        applicant: {
          select: { id: true, name: true, teacherNo: true },
        },
        approver: {
          select: { id: true, name: true, teacherNo: true },
        },
        timelines: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('请假记录不存在');
    }

    this.checkDataScopeAccess(record.classId, '', user.dataScope);

    return record;
  }

  async getToday(user: CurrentUserPayload) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where = await this.buildDataScopeFilter(user.dataScope);
    where.createdAt = { gte: todayStart };
    where.deletedAt = null;

    const list = await this.prisma.leaveRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, studentNo: true, name: true },
        },
      },
    });

    return list;
  }

  async getHistory(query: QueryLeaveDto, user: CurrentUserPayload) {
    const where = await this.buildDataScopeFilter(user.dataScope);
    where.status = { in: ['CLOSED', 'REJECTED', 'CANCELLED'] };
    where.deletedAt = null;

    if (query.keyword) {
      where.OR = [
        { studentName: { contains: query.keyword } },
        { leaveNo: { contains: query.keyword } },
      ];
    }
    if (query.classId) {
      where.classId = String(query.classId);
    }
    if (query.date) {
      const startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const [list, total] = await Promise.all([
      this.prisma.leaveRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, studentNo: true, name: true },
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

  private async buildDataScopeFilter(dataScope: DataScope): Promise<any> {
    const baseFilter: any = {};

    switch (dataScope.type) {
      case 'ALL':
        break;

      case 'GRADE':
        if (dataScope.gradeId) {
          const classes = await this.prisma.class.findMany({
            where: { gradeId: String(dataScope.gradeId) },
            select: { id: true },
          });
          const classIds = classes.map((c) => c.id);
          if (classIds.length > 0) {
            baseFilter.classId = { in: classIds };
          } else {
            baseFilter.id = 'none';
          }
        }
        break;

      case 'CLASS':
        if (dataScope.classId) {
          baseFilter.classId = String(dataScope.classId);
        } else {
          baseFilter.id = 'none';
        }
        break;

      case 'DORM':
        baseFilter.OR = [
          { student: { boardingType: 'BOARDING' } },
        ];
        break;

      case 'SELF':
        baseFilter.id = 'none';
        break;
    }

    return baseFilter;
  }

  private checkDataScopeAccess(
    recordClassId: string,
    recordGradeId: string,
    dataScope: DataScope,
  ): void {
    switch (dataScope.type) {
      case 'ALL':
        return;
      case 'GRADE':
        return;
      case 'CLASS':
        if (dataScope.classId && recordClassId !== String(dataScope.classId)) {
          throw new ForbiddenException('无权访问该请假记录');
        }
        return;
      case 'DORM':
        return;
      case 'SELF':
        throw new ForbiddenException('无权访问请假记录（暂无授课班级）');
    }
  }

  private async findRecordOrThrow(id: string) {
    const record = await this.prisma.leaveRecord.findUnique({
      where: { id: id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('请假记录不存在');
    }

    return record;
  }

  private async generateLeaveNo(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `L${dateStr}`;

    const maxRecord = await tx.leaveRecord.findFirst({
      where: {
        leaveNo: { startsWith: prefix },
      },
      select: { leaveNo: true },
      orderBy: { leaveNo: 'desc' },
    });

    let sequence = 1;
    if (maxRecord) {
      const lastSequence = parseInt(maxRecord.leaveNo.slice(prefix.length), 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  private async createTimeline(
    tx: Prisma.TransactionClient,
    data: {
      studentId: string;
      leaveRecordId: string;
      eventType: any;
      operatorId?: string;
      operatorName?: string;
      operatorRole?: string;
      eventSource: any;
      sourceEventId?: string;
      metadata?: any;
    },
  ) {
    await tx.timelineEvent.create({
      data: {
        studentId: data.studentId,
        leaveRecordId: data.leaveRecordId,
        eventType: data.eventType,
        operatorId: data.operatorId || null,
        operatorName: data.operatorName || null,
        operatorRole: data.operatorRole || null,
        eventSource: data.eventSource,
        sourceEventId: data.sourceEventId ?? '',
        metadata: data.metadata || {},
        occurredAt: new Date(),
        isSystem: false,
      },
    });
  }

  private async completeTodoByBusiness(
    tx: Prisma.TransactionClient,
    businessId: string,
    businessType: string,
  ) {
    await tx.task.updateMany({
      where: {
        sourceId: businessId,
        source: businessType as any,
        status: 'PENDING',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  private async cancelTodoByBusiness(
    tx: Prisma.TransactionClient,
    businessId: string,
    businessType: string,
  ) {
    await tx.task.updateMany({
      where: {
        sourceId: businessId,
        source: businessType as any,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  private getOperatorRole(user: CurrentUserPayload): string {
    if (user.roles.includes('ROLE_ADMIN')) return 'ADMIN';
    if (user.roles.includes('ROLE_POLITICAL')) return 'POLITICAL';
    if (user.roles.includes('ROLE_HEADMASTER')) return 'HEADMASTER';
    if (user.roles.includes('ROLE_DORM_MANAGER')) return 'DORM_MANAGER';
    if (user.roles.includes('ROLE_GRADE_DIRECTOR')) return 'GRADE_DIRECTOR';
    return 'TEACHER';
  }
}

const isBoarding = false;
