/**
 * NoticeController — 通知接口（C03）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * 职责：
 * - 接收 HTTP 请求，调用 NoticeCapabilityService
 * - 不包含业务逻辑
 *
 * 六层流水线：
 *   Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
 */

import {
  Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { NoticeCapabilityService } from './notice.capability-service';
import { PrismaService } from '@/common/prisma';
import { CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import type {
  CreateNoticeRequest, PublishNoticeRequest,
} from '@smartgrade/shared/types/notice/NoticeResponse';
import type { AuthorizationContext, DataScope as AuthDataScope } from '../../authorization/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

@ApiTags('学生通知')
@ApiBearerAuth()
@Controller('notices')
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeCapabilityService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /notices — 通知列表 */
  @Get()
  @ApiOperation({ summary: '通知列表', description: '获取通知列表' })
  async list(@Query('noticeType') noticeType?: string) {
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { in: ['PUBLISHED', 'ARCHIVED'] },
    };
    if (noticeType) {
      where.noticeType = noticeType;
    }
    const records = await this.prisma.notice.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    return records.map((n) => ({
      id: n.id,
      noticeNo: n.noticeNo,
      title: n.title,
      noticeType: n.noticeType,
      status: n.status,
      publisherName: n.publisherName,
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      requireConfirm: n.requireConfirm,
      isRead: false,
      isAcknowledged: false,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /** POST /notices — 创建通知草稿 */
  @Post()
  @ApiOperation({ summary: '创建通知草稿', description: '创建通知草稿（DRAFT 状态）' })
  async create(@Body() body: CreateNoticeRequest, @CurrentUser() user: CurrentUserPayload) {
    return this.noticeService.createNotice(body, buildAuthContext(user));
  }

  /** GET /notices/:id — 通知详情 */
  @Get(':id')
  @ApiOperation({ summary: '通知详情', description: '返回通知详情（含 Timeline + 阅读状态）' })
  async getOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.noticeService.getNotice(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'NoticeNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /notices/:id/publish — 发布通知 */
  @Post(':id/publish')
  @ApiOperation({ summary: '发布通知', description: '发布通知（DRAFT → PUBLISHED）' })
  async publish(@Param('id') id: string, @Body() body: PublishNoticeRequest, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.noticeService.publishNotice(id, body, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'NoticeStateTransitionError') {
        throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
      }
      if (e.name === 'NoticeNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /notices/:id/read — 标记已读 */
  @Post(':id/read')
  @ApiOperation({ summary: '标记已读', description: '标记通知为已读' })
  async markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.noticeService.markRead(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'NoticeNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }

  /** POST /notices/:id/acknowledge — 确认阅读 */
  @Post(':id/acknowledge')
  @ApiOperation({ summary: '确认阅读', description: '确认已阅读通知（Acknowledge）' })
  async acknowledge(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.noticeService.acknowledge(id, buildAuthContext(user));
    } catch (e: any) {
      if (e.name === 'NoticeNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
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
