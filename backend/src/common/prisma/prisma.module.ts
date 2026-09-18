import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaService } from './prisma.service';

/**
 * PrismaModule - 数据库连接模块
 *
 * 全局模块，所有业务模块均可注入 PrismaService
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaModule');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('数据库连接成功');
    } catch (error) {
      // 生产环境下不因数据库连接失败而崩溃，保证服务启动和健康检查通过
      this.logger.warn(`数据库连接失败（服务仍将启动）: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('数据库连接已关闭');
  }
}