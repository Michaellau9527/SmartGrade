import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';

/**
 * HealthService - 健康检查服务
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger('HealthService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 基础健康检查 - 服务是否存活
   */
  async check() {
    return {
      status: 'ok',
      service: 'smartgrade-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 数据库连接检查
   */
  async checkDatabase() {
    const start = Date.now();

    try {
      // 执行简单查询测试连接
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;

      return {
        status: 'ok',
        database: 'connected',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`数据库连接失败: ${error.message}`);

      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 完整健康检查 - 服务 + 数据库
   */
  async checkFull() {
    const dbCheck = await this.checkDatabase();

    return {
      status: dbCheck.status === 'ok' ? 'ok' : 'degraded',
      service: 'smartgrade-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbCheck,
      },
    };
  }
}