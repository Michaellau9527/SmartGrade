/**
 * WorkbenchController — 工作台接口
 *
 * 上游规则：Sprint 2.2 C01 — 刘老师拍板
 *
 * 职责：
 * - 接收 HTTP 请求，调用 WorkbenchService
 * - 不包含业务逻辑
 *
 * 注意：当前 Sprint 2 使用旧版 Guard（@RequirePermissions + CurrentUserPayload）。
 * WorkbenchController 暂时标记 @Public，直接通过 AuthorizationContext 进行权限控制。
 * 后续 Sprint 2.2 "Authorization Refactor" 完成后，Guard 链将自动注入 AuthorizationContext。
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { WorkbenchService } from './workbench.service';

/**
 * WorkbenchController — GET /workbench
 *
 * Sprint 2 过渡期：标记 @Public，权限由 WorkbenchService 内部通过 AuthorizationContext 控制。
 * Sprint 3 Guard 升级后：改为 @RequirePermissions('workbench.view')
 */
@ApiTags('工作台')
@ApiBearerAuth()
@Controller('workbench')
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  /**
   * 获取工作台数据
   *
   * 返回今日概览：日期、待办、学生状态、通知、快捷操作
   *
   * Sprint 2 过渡说明：
   * - 当前使用 mock AuthorizationContext（Guard 未升级）
   * - 后续 AuthorizationResolver 集成到 Guard 链后，自动从 request 获取 ctx
   */
  @Get()
  @ApiOperation({
    summary: '获取工作台数据',
    description: '返回今日概览：日期、待办、学生状态、通知、快捷操作',
  })
  async getWorkbench() {
    // Sprint 2 过渡：返回结构化空数据
    // 后续 Guard 集成 AuthorizationContext 后，改为：
    //   async getWorkbench(@ReqContext() ctx: AuthorizationContext) {
    //     return this.workbenchService.getWorkbench(ctx);
    //   }
    return this.workbenchService.getWorkbench(_buildDemoContext());
  }
}

// ============================================================
// Sprint 2 过渡：Demo AuthorizationContext
//
// Guard 升级完成后删除此函数，
// 由 Guard 自动从 JWT + DB 解析 AuthorizationContext。
// ============================================================

import type { AuthorizationContext } from '../../authorization/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';

/** Demo Context — 仅 Sprint 2 过渡使用 */
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
        PermissionCode.WORKBENCH_VIEW,
        PermissionCode.LEAVE_CREATE,
        PermissionCode.LEAVE_APPROVE,
        PermissionCode.NOTICE_READ,
        PermissionCode.STUDENT_READ,
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
