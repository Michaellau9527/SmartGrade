import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { Public } from '@/common/decorators';
import { WechatBindingService } from './wechat-binding.service';
import {
  ConfirmWechatBindingDto,
  PreviewWechatBindingDto,
} from './dto/wechat-binding.dto';

/**
 * WechatBindingController（P1-13 Gate D）
 *
 * 仅暴露免登录的 confirm 接口；init / unbind 挂在 TeacherController
 * （冻结书 2.2/2.3 约定的路由前缀）。
 *
 * confirm 为 @Public：目标教师此时尚未绑定微信，不可能已有 JWT。
 * 授权完全依赖一次性绑定码（SHA-256 落库、10 分钟有效、一次性消费），
 * 且成功响应不回显任何教师信息。
 */
@ApiTags('教师微信绑定')
@Controller('wechat-binding')
export class WechatBindingController {
  constructor(private readonly wechatBindingService: WechatBindingService) {}

  @Public()
  @Post('confirm')
  @ApiOperation({
    summary: '确认教师微信绑定',
    description: '免登录：凭一次性绑定码 + wx.login code 完成绑定（绑定码仅生效一次）',
  })
  async confirm(@Body() dto: ConfirmWechatBindingDto) {
    return this.wechatBindingService.confirmBinding(dto);
  }

  /**
   * 绑定预览：只读，不执行绑定、不消费绑定码。
   *
   * 为什么是 POST 而不是 GET：绑定码是**授权凭证**，必须走 body。
   * 放进 query 会被网关访问日志、Referer、浏览器/客户端历史记录留存，
   * 等于把一次性凭证写进日志。且本控制器既有 confirm 也是 POST + body，
   * 保持一致（冻结书未规定 preview 的 REST 形式，此处按项目既有习惯定）。
   */
  @Public()
  @Post('preview')
  @ApiOperation({
    summary: '预览教师微信绑定（只读）',
    description:
      '免登录：凭一次性绑定码查看即将绑定的教师姓名；不执行绑定、不消费绑定码',
  })
  async preview(@Body() dto: PreviewWechatBindingDto) {
    return this.wechatBindingService.previewBinding(dto);
  }
}
