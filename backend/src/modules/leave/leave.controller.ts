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
import type {
  CreateLeaveRequest, ApproveLeaveRequest, RejectLeaveRequest, CancelLeaveRequest,
} from '@smartgrade/shared/types/leave/LeaveResponse';
import type { AuthorizationContext } from '../../authorization/types';
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

  /** GET /leaves — 请假列表 */
  @Get()
  @ApiOperation({ summary: '请假列表', description: '获取请假列表（支持按状态筛选）' })
  async list(@Query('status') status?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status) {
      where.status = status;
    }
    const records = await this.prisma.leaveRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return records.map((r) => ({
      id: r.id,
      leaveNo: r.leaveNo,
      status: r.status,
      studentId: r.studentId,
      studentName: r.studentName,
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
  async create(@Body() body: CreateLeaveRequest) {
    return this.leaveService.createLeave(body, _buildDemoContext());
  }

  /** GET /leaves/:id — 请假详情 */
  @Get(':id')
  @ApiOperation({ summary: '请假详情', description: '返回请假详情（含 Timeline）' })
  async getOne(@Param('id') id: string) {
    try {
      return await this.leaveService.getLeave(id, _buildDemoContext());
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
  async approve(@Param('id') id: string, @Body() body: ApproveLeaveRequest) {
    try {
      return await this.leaveService.approveLeave(id, body, _buildDemoContext());
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
  async reject(@Param('id') id: string, @Body() body: RejectLeaveRequest) {
    try {
      return await this.leaveService.rejectLeave(id, body, _buildDemoContext());
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  /** POST /leaves/:id/confirm-left — 确认离校 */
  @Post(':id/confirm-left')
  @ApiOperation({ summary: '确认离校', description: '确认学生离校（APPROVED → LEFT）' })
  async confirmLeft(@Param('id') id: string) {
    try {
      return await this.leaveService.confirmLeft(id, _buildDemoContext());
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
  async confirmReturned(@Param('id') id: string) {
    try {
      return await this.leaveService.confirmReturned(id, _buildDemoContext());
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
  async close(@Param('id') id: string) {
    try {
      return await this.leaveService.closeLeave(id, _buildDemoContext());
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
  async cancel(@Param('id') id: string, @Body() body: CancelLeaveRequest) {
    try {
      return await this.leaveService.cancelLeave(id, body, _buildDemoContext());
    } catch (e: any) {
      if (e.name === 'LeaveStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }
}

// ============================================================
// Sprint 2 过渡：Demo AuthorizationContext（与 C01 一致）
// ============================================================

function _buildDemoContext(): AuthorizationContext {
  return {
    actor: {
      userId: 'demo_teacher_001',
      teacherId: 'teacher_001',
      parentId: null,
      userType: 'TEACHER',
    },
    authorization: {
      roleSet: new Set([RoleCode.ROLE_HEADMASTER]),
      permissionSet: new Set([
        PermissionCode.LEAVE_CREATE,
        PermissionCode.LEAVE_APPROVE,
        PermissionCode.LEAVE_READ,
      ]),
      organization: {
        schoolId: 'school_001',
        gradeIds: ['grade_001'],
        classIds: ['class_001'],
      },
      dataScope: {
        classIds: ['class_001'],
        gradeIds: ['grade_001'],
        isSchoolWide: false,
        isParentScoped: false,
        version: 1,
      },
    },
    issuedAt: new Date(),
  };
}
