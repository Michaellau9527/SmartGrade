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
  Controller, Get, Post, Body, Param, HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { NoticeCapabilityService } from './notice.capability-service';
import type {
  CreateNoticeRequest, PublishNoticeRequest,
} from '@smartgrade/shared/types/notice/NoticeResponse';
import type { AuthorizationContext } from '../../authorization/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

@ApiTags('学生通知')
@ApiBearerAuth()
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeCapabilityService) {}

  /** POST /notices — 创建通知草稿 */
  @Post()
  @ApiOperation({ summary: '创建通知草稿', description: '创建通知草稿（DRAFT 状态）' })
  async create(@Body() body: CreateNoticeRequest) {
    return this.noticeService.createNotice(body, _buildDemoContext());
  }

  /** GET /notices/:id — 通知详情 */
  @Get(':id')
  @ApiOperation({ summary: '通知详情', description: '返回通知详情（含 Timeline + 阅读状态）' })
  async getOne(@Param('id') id: string) {
    try {
      return await this.noticeService.getNotice(id, _buildDemoContext());
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
  async publish(@Param('id') id: string, @Body() body: PublishNoticeRequest) {
    try {
      return await this.noticeService.publishNotice(id, body, _buildDemoContext());
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
  async markRead(@Param('id') id: string) {
    try {
      return await this.noticeService.markRead(id, _buildDemoContext());
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
  async acknowledge(@Param('id') id: string) {
    try {
      return await this.noticeService.acknowledge(id, _buildDemoContext());
    } catch (e: any) {
      if (e.name === 'NoticeNotFoundError') {
        throw new HttpException(e.message, HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }
}

// ============================================================
// Sprint 2 过渡：Demo AuthorizationContext（与 C01/C02 一致）
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
        PermissionCode.NOTICE_CREATE,
        PermissionCode.NOTICE_READ,
        PermissionCode.NOTICE_UPDATE,
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
