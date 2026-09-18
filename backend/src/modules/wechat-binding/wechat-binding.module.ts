import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WechatBindingController } from './wechat-binding.controller';
import { WechatBindingService } from './wechat-binding.service';

/**
 * WechatBindingModule（P1-13 Gate D）
 *
 * 依赖 AuthModule 以复用 Gate C 抽取的 WechatCodeExchangeService
 * （微信 code → openid 只有这一份实现）。
 * 导出 WechatBindingService 供 TeacherController 的 init / unbind 路由复用。
 */
@Module({
  imports: [AuthModule],
  controllers: [WechatBindingController],
  providers: [WechatBindingService],
  exports: [WechatBindingService],
})
export class WechatBindingModule {}
