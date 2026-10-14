import { Module } from '@nestjs/common';

import { StudentCredentialController } from './student-credential.controller';
import { StudentCredentialService } from './student-credential.service';

/**
 * 学生身份二维码凭证模块（P2-QR 阶段E 基础设施 + 阶段F1 管理接口）
 *
 * 服务层能力：签发/补发/撤销/按令牌查凭证/带数据范围校验的签发、撤销、状态查询；
 * HTTP 端点在阶段F1 按权限码 student:qrcode:issue 接入（管理端签发/撤销/状态查询）。
 * 批量签发（student:qrcode:batch）与门卫扫码核验（verify:scan）在后续阶段接入。
 */
@Module({
  controllers: [StudentCredentialController],
  providers: [StudentCredentialService],
  exports: [StudentCredentialService],
})
export class StudentCredentialModule {}
