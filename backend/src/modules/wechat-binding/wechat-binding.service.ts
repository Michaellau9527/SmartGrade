import { randomBytes, createHash } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/common/prisma';
import type { CurrentUserPayload } from '@/common/types';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';
import { WechatCodeExchangeService } from '../auth/wechat-code-exchange.service';
import {
  ConfirmWechatBindingDto,
  PreviewWechatBindingDto,
} from './dto/wechat-binding.dto';
import { assertTeacherInDataScope } from './teacher-scope.util';

/** 一次性绑定码有效期：10 分钟（冻结书安全规则 6） */
export const BINDING_TOKEN_TTL_MS = 10 * 60 * 1000;

/** 对外统一文案：不区分「不存在 / 已过期 / 已消费」，避免绑定码状态被枚举 */
const TOKEN_INVALID_MESSAGE = '绑定码无效或已失效';

/**
 * WechatBindingService —— 教师微信身份绑定（P1-13 Gate D）
 *
 * 职责：
 * - initBinding  ：管理员发起，生成一次性绑定码（明文仅返回一次，库里只存 SHA-256）
 * - confirmBinding：免登录公开接口，凭绑定码 + wx.login code 完成绑定
 * - unbindWechat ：仅 ROLE_ADMIN，清空 teacher.wechat_openid / wechat_unionid
 *
 * 并发安全（D5）：
 * - 友好预检查在前，但**不作为并发保证**；
 * - 事务内用 `updateMany({ where: { id, status: 'ACTIVE' } })` 做条件更新，
 *   只有把状态从 ACTIVE 改成 CONSUMED 成功的那一个请求才能继续写入；
 * - 最终防线是数据库唯一约束：teacher.wechat_openid unique、
 *   teacher_wechat_binding.token_hash unique。P2002 冲突被翻译成 400 业务错误，绝不变成 500。
 */
@Injectable()
export class WechatBindingService {
  private readonly logger = new Logger(WechatBindingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatCodeExchange: WechatCodeExchangeService,
  ) {}

  // ==================== D1 发起绑定 ====================

  /**
   * POST /api/v1/teachers/:id/bind-wechat/init
   * 由 TeacherController 调用（已受 JwtAuthGuard + PermissionsGuard 保护）
   */
  async initBinding(teacherId: string, actor: CurrentUserPayload) {
    // 数据范围：跨校 / 跨年级越权一律拒绝（ROLE_ADMIN 保持全局放行）
    await assertTeacherInDataScope(this.prisma, actor, teacherId);

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        wechatOpenid: true,
      },
    });

    if (!teacher || teacher.deletedAt) {
      throw new NotFoundException('教师不存在');
    }
    if (teacher.status !== 'ACTIVE') {
      throw new BadRequestException('该教师状态异常，无法绑定微信');
    }
    if (teacher.wechatOpenid) {
      throw new BadRequestException('该教师已绑定微信，请先解绑');
    }

    const bindingToken = this.generateBindingToken();
    const expiresAt = new Date(Date.now() + BINDING_TOKEN_TTL_MS);

    await this.prisma.teacherWechatBinding.create({
      data: {
        tokenHash: this.hashToken(bindingToken),
        teacherId,
        adminId: String(actor?.id),
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // 只返回继续绑定所需的最小信息：明文绑定码（仅此一次）+ 有效期 + 目标教师 id
    return {
      bindingToken,
      expiresIn: Math.floor(BINDING_TOKEN_TTL_MS / 1000),
      teacherId,
    };
  }

  // ==================== D2 确认绑定 ====================

  /**
   * POST /api/v1/wechat-binding/confirm （@Public，免登录）
   */
  async confirmBinding(dto: ConfirmWechatBindingDto) {
    // Step 1-3：一次性绑定码存在 / ACTIVE / 未过期（统一文案，防状态枚举）
    const binding = await this.resolveActiveBinding(dto.token);

    // Step 5：复用 Gate C 的换码服务，取得 { openid, unionid? }
    const { openid, unionid } = await this.wechatCodeExchange.exchange(dto.code);

    // Step 6-7：友好预检查（并发安全不依赖这里）
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: binding.teacherId },
      select: { id: true, deletedAt: true, wechatOpenid: true },
    });
    if (!teacher || teacher.deletedAt) {
      throw new NotFoundException('教师不存在');
    }
    if (teacher.wechatOpenid) {
      throw new BadRequestException('该教师已绑定其他微信，请先解绑');
    }

    const occupied = await this.prisma.teacher.findUnique({
      where: { wechatOpenid: openid },
      select: { id: true },
    });
    if (occupied && occupied.id !== binding.teacherId) {
      throw new BadRequestException('该微信已绑定其他教师');
    }

    // Step 8-9：事务内原子消费 + 写入；唯一约束作为最终防线
    try {
      await this.prisma.$transaction(async (tx: any) => {
        // 原子消费：仅当仍为 ACTIVE 才能改成 CONSUMED
        const consumed = await tx.teacherWechatBinding.updateMany({
          where: { id: binding.id, status: 'ACTIVE' },
          data: { status: 'CONSUMED', consumedAt: new Date() },
        });
        if (!consumed || consumed.count !== 1) {
          throw new BadRequestException(TOKEN_INVALID_MESSAGE);
        }

        // 事务内二次确认（并发下前一个事务可能刚写完）
        const current = await tx.teacher.findUnique({
          where: { id: binding.teacherId },
          select: { wechatOpenid: true },
        });
        if (current?.wechatOpenid) {
          throw new BadRequestException('该教师已绑定其他微信，请先解绑');
        }

        await tx.teacher.update({
          where: { id: binding.teacherId },
          data: {
            wechatOpenid: openid,
            // unionid 有值才写；无值不得伪造（不写 null / 空串）
            ...(unionid ? { wechatUnionid: unionid } : {}),
          },
        });
      });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (this.isUniqueViolation(e)) {
        // teacher.wechat_openid 唯一键冲突 → 业务冲突，不是 500
        throw new BadRequestException('该微信已绑定其他教师');
      }
      this.logger.error(`[P1-13] 绑定写入失败: ${String(e)}`);
      throw e;
    }

    // 不回显任何教师信息（防绑定码持有者枚举教师资料）
    return { ok: true };
  }

  // ==================== E0 绑定预览（只读） ====================

  /**
   * POST /api/v1/wechat-binding/preview （@Public，免登录）
   *
   * 冻结书 §7 时序：目标教师打开绑定入口后应看到「即将绑定教师：XXX」，
   * 再主动点确认。preview 只回答"这个绑定码指向哪位教师"，**不执行绑定**。
   *
   * 与 confirm 的关系：
   * - 复用同一个 `resolveActiveBinding`（不存在第二套 token 校验逻辑）；
   * - **不消费**绑定码（不写 status / consumedAt），preview 后可继续 confirm；
   * - **不触碰** jscode2session（不调 WechatCodeExchangeService）；
   * - 响应裁剪到 { teacherId, teacherName }，不含 phone/email/school/class/
   *   teacherNo/adminId/tokenHash/openid/unionid 等任何内部或敏感字段。
   *
   * 数据范围：preview 本身不读归属、不写数据，**不是**新的越权入口。
   * 目标教师在 init 阶段已由 assertTeacherInDataScope 校验过授权人范围。
   */
  async previewBinding(dto: PreviewWechatBindingDto) {
    const binding = await this.resolveActiveBinding(dto.token);

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: binding.teacherId },
      select: { id: true, name: true },
    });
    if (!teacher) {
      // 目标教师已不存在：该绑定码事实上不可用，沿用统一文案，不泄露内部状态
      throw new BadRequestException(TOKEN_INVALID_MESSAGE);
    }

    return { teacherId: teacher.id, teacherName: teacher.name };
  }

  // ==================== D3 解绑 ====================

  /**
   * POST /api/v1/teachers/:id/unbind-wechat
   * 冻结方案：仅 ROLE_ADMIN。权限之外再做一次角色硬校验，
   * 防止通过其他权限（如 teacher:update）绕过。
   */
  async unbindWechat(teacherId: string, actor: CurrentUserPayload) {
    if (!actor?.roles?.includes(RoleCode.ROLE_ADMIN)) {
      throw new ForbiddenException('仅管理员可解绑教师微信');
    }

    await assertTeacherInDataScope(this.prisma, actor, teacherId);

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, deletedAt: true },
    });
    if (!teacher || teacher.deletedAt) {
      throw new NotFoundException('教师不存在');
    }

    // 只清微信身份；历史 binding 审计记录不删除
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { wechatOpenid: null, wechatUnionid: null },
    });

    return { ok: true };
  }

  // ==================== 内部工具 ====================

  /**
   * 唯一的绑定码校验入口（confirm / preview 共用）。
   *
   * 校验：存在 + status=ACTIVE + 未过期。三者任一不满足都返回同一句
   * 「绑定码无效或已失效」，避免绑定码状态被枚举。
   * 注意：本方法不消费绑定码，消费只发生在 confirmBinding 的事务内。
   */
  private async resolveActiveBinding(token: string) {
    const tokenHash = this.hashToken(token);
    const binding = await this.prisma.teacherWechatBinding.findUnique({
      where: { tokenHash },
    });
    if (
      !binding ||
      binding.status !== 'ACTIVE' ||
      binding.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(TOKEN_INVALID_MESSAGE);
    }
    return binding;
  }

  /** 128bit 随机一次性绑定码（base64url，便于人工传递） */
  private generateBindingToken(): string {
    return randomBytes(16).toString('base64url');
  }

  /** 库里只存 SHA-256，绝不存明文 */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isUniqueViolation(e: unknown): boolean {
    return !!e && typeof e === 'object' && (e as { code?: unknown }).code === 'P2002';
  }
}
