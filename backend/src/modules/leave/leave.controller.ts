/**
 * LeaveController — 请假接口
 *
 * 上游规则：Sprint 2.2 C02 — 刘老师拍板
 *
 * 职责：
 * - 接收 HTTP 请求，调用 LeaveCapabilityService
 * - 不包含业务逻辑
 *
 * 六层流水线：
 *   Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
 */

import {
  Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { LeaveCapabilityService } from './leave.capability-service';
import { PrismaService } from '@/common/prisma';
import { CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import type {
  CreateLeaveRequest, ApproveLeaveRequest, RejectLeaveRequest, CancelLeaveRequest,
} from '@smartgrade/shared/types/leave/LeaveResponse';
import type { AuthorizationContext, DataScope as AuthDataScope } from '../../authorization/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

@ApiTags('学生请假')
@ApiBearerAuth()
@Controller('leaves')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveCapabilityService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /leaves — 请假列表（按当前用户数据范围过滤） */
  @Get()
  @ApiOperation({ summary: '请假列表', description: '获取请假列表（支持按状态筛选，自动按数据范围隔离）' })
  async list(@Query('status') status: string, @CurrentUser() user: CurrentUserPayload) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status) {
      where.status = status;
    }

    // 数据范围隔离：班主任只看本班、年级主任看本年级，管理员/政教/宿管看全部
    const ds = user.dataScope;
    if (ds.type === 'CLASS' && ds.classId) {
      where.classId = ds.classId;
    } else if (ds.type === 'GRADE' && ds.gradeId) {
      where.gradeId = ds.gradeId;
    } else if (ds.type === 'SELF') {
      // 任课教师无班级归属，看不到任何班级请假
      where.id = 'none';
    }
    // ALL / DORM：不附加班级/年级过滤

    const records = await this.prisma.leaveRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        student: {
          select: { studentNo: true },
        },
      },
    });
    return records.map((r) => ({
      id: r.id,
      leaveNo: r.leaveNo,
      status: r.status,
      studentId: r.studentId,
      studentName: r.studentName,
      // 学号来自 student 关联；冗余字段 studentName/className 已存表，学号未冗余
      studentNo: r.student?.studentNo ?? null,
      className: r.className,
      leaveType: r.leaveType,
      leaveReasonType: r.leaveReasonType,
      reason: r.reason,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      applicantName: r.applicantName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** POST /leaves — 创建请假 */
  @Post()
  @ApiOperation({ summary: '创建请假', description: '创建请假记录（PENDING 状态）' })
  async create(@Body() body: CreateLeaveRequest, @CurrentUser() user: CurrentUserPayload) {
    return this.leaveService.createLeave(body, buildAuthContext(user));
  }

  /** GET /leaves/:id — 请假详情 */
  @Get(':id')
  @ApiOperation({ summary: '请假详情', description: '返回请假详情（含 Timeline）' })
  async getOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.getLeave(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/approve — 审批通过 */
  @Post(':id/approve')
  @ApiOperation({ summary: '审批通过', description: '审批通过请假（PENDING → APPROVED）' })
  async approve(@Param('id') id: string, @Body() body: ApproveLeaveRequest, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.approveLeave(id, body, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      if (e.name === 'LeaveNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/reject — 驳回 */
  @Post(':id/reject')
  @ApiOperation({ summary: '驳回请假', description: '驳回请假（PENDING → REJECTED）' })
  async reject(@Param('id') id: string, @Body() body: RejectLeaveRequest, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.rejectLeave(id, body, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      if (e.name === 'LeaveNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/confirm-left — 确认离校 */
  @Post(':id/confirm-left')
  @ApiOperation({ summary: '确认离校', description: '确认学生离校（APPROVED → LEFT）' })
  async confirmLeft(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.confirmLeft(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/confirm-returned — 确认返校 */
  @Post(':id/confirm-returned')
  @ApiOperation({ summary: '确认返校', description: '确认学生返校（LEFT → RETURNED）' })
  async confirmReturned(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.confirmReturned(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/close — 销假完成 */
  @Post(':id/close')
  @ApiOperation({ summary: '销假完成', description: '销假完成（RETURNED → CLOSED）' })
  async close(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.closeLeave(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/cancel — 取消请假 */
  @Post(':id/cancel')
  @ApiOperation({ summary: '取消请假', description: '取消请假（PENDING → CANCELLED）' })
  async cancel(@Param('id') id: string, @Body() body: CancelLeaveRequest, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.leaveService.cancelLeave(id, body, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }
}

// ============================================================
// 由真实登录用户推导 AuthorizationContext（替代写死的 Demo Context）
// ============================================================

function buildAuthContext(user: CurrentUserPayload): AuthorizationContext {
  const ds = user.dataScope;
  const dataScope: AuthDataScope = {
    classIds: ds.type === 'CLASS' && ds.classId ? [ds.classId] : [],
    gradeIds: ds.type === 'GRADE' && ds.gradeId ? [ds.gradeId] : [],
    // 管理员 / 政教看全校；宿管负责全体住宿生，按全校范围处理
    isSchoolWide: ds.type === 'ALL' || ds.type === 'DORM',
    isParentScoped: false,
    version: 1,
  };
  return {
    actor: {
      userId: String(user.id),
      teacherId: String(user.id),
      parentId: null,
      userType: 'TEACHER',
    },
    authorization: {
      roleSet: new Set(user.roles as RoleCode[]),
      permissionSet: new Set(user.permissions as PermissionCode[]),
      organization: {
        schoolId: '',
        gradeIds: dataScope.gradeIds,
        classIds: dataScope.classIds,
      },
      dataScope,
    },
    issuedAt: new Date(),
  };
}
