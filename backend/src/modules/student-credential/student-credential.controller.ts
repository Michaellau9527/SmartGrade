import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StudentCredentialService } from './student-credential.service';
import { IssueCredentialDto, StudentIdParamDto } from './dto';
import { CurrentUser, DataScope, RequirePermissions } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';

/**
 * StudentCredentialController - 学生身份二维码凭证管理接口（P2-QR 阶段F1）
 *
 * 路由前缀：全局前缀 /api/v1（main.ts 统一设置），本控制器相对路径 student-credentials
 *   - POST   /api/v1/student-credentials                     签发 / 补发
 *   - DELETE /api/v1/student-credentials/students/:studentId 撤销
 *   - GET    /api/v1/student-credentials/students/:studentId 状态查询
 *
 * 安全约束：
 * - 权限码 student:qrcode:issue 由 PermissionsGuard 强制校验（服务端，不依赖前端隐藏）。
 *   F1-B3 口径（与 role-permission.map.ts / seed.ts 实际授权一致）：
 *   该权限仅授予 ROLE_ADMIN（全权限短路）与 ROLE_HEADMASTER（班主任，见 seed ROLE_HEADMASTER）；
 *   年级主任 / 政教 / 宿管 / 任课教师 / 门卫 均未授予，本轮未扩大任何角色权限。
 * - 数据范围（@DataScope() 计算后由 Service 校验）在服务层二次校验，越权返回 404；
 *   因当前仅班主任与管理员可调用，实际生效分支为 CLASS 与 ALL；
 *   Service 内 GRADE/DORM/SELF 分支为防御性保留，不代表对应角色已获得授权。
 * - 签发返回的原始令牌仅在本次响应中出现一次，不写入日志、不入库。
 * - 操作者身份来自已认证上下文（@CurrentUser()），请求体不接受任何身份声明。
 *
 * 补发语义：对同一学生再次签发即为补发，旧有效凭证在同一事务内作废，旧码立即失效。
 */
@ApiTags('学生凭证')
@ApiBearerAuth()
@Controller('student-credentials')
export class StudentCredentialController {
  constructor(private readonly credentialService: StudentCredentialService) {}

  /**
   * 签发 / 补发学生二维码凭证
   *
   * 权限：student:qrcode:issue
   *   - ROLE_ADMIN：持有全部权限（守卫短路）
   *   - ROLE_HEADMASTER：持有该权限，仅可操作本班学生（服务层数据范围校验）
   *   - 其余角色（含年级主任）当前未授予该权限，调用将被守卫拒绝
   */
  @Post()
  @DataScope()
  @RequirePermissions('student:qrcode:issue')
  @ApiOperation({
    summary: '签发/补发学生二维码凭证',
    description:
      '权限码 student:qrcode:issue（当前授予系统管理员与班主任；班主任限本班学生）。' +
      '为指定学生签发凭证；该学生已有有效凭证时自动作废旧凭证并生成新凭证（即补发）。' +
      '返回令牌明文仅此一次，数据库仅存哈希。',
  })
  async issue(
    @Body() dto: IssueCredentialDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ credentialId: string; version: number; token: string }> {
    const { credential, token } = await this.credentialService.issueForUser(
      dto.studentId,
      user,
    );
    // 仅暴露必要元数据；凭证记录中的 tokenHash 不下发
    return { credentialId: credential.id, version: credential.version, token };
  }

  /**
   * 撤销学生二维码凭证
   *
   * 权限：student:qrcode:issue
   * 幂等：重复撤销返回 revokedCount=0，不报错、不产生不一致状态
   */
  @Delete('students/:studentId')
  @DataScope()
  @RequirePermissions('student:qrcode:issue')
  @ApiOperation({
    summary: '撤销学生二维码凭证',
    description: '撤销该学生当前全部有效凭证，撤销后该凭证无法再通过有效性校验。重复撤销幂等。',
  })
  async revoke(
    @Param() params: StudentIdParamDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ studentId: string; revokedCount: number }> {
    return this.credentialService.revokeForUser(params.studentId, user);
  }

  /**
   * 查询学生凭证状态
   *
   * 权限：student:qrcode:issue
   * 返回：是否存在有效凭证、有效凭证版本与签发信息（不含令牌哈希）
   */
  @Get('students/:studentId')
  @DataScope()
  @RequirePermissions('student:qrcode:issue')
  @ApiOperation({
    summary: '查询学生凭证状态',
    description: '返回该学生是否存在有效凭证及其元数据（不含任何令牌信息）。',
  })
  async status(
    @Param() params: StudentIdParamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.credentialService.getStatusForUser(params.studentId, user);
  }
}
