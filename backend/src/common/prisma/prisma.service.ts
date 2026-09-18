import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - 数据库服务
 *
 * 关键约束（CloudBase 503 修复）：
 * - onModuleInit 时若数据库连接失败，**不 throw、不 crash**
 *   确保 NestJS 服务能顺利监听端口，让 CloudBase 健康检查通过
 * - 首次连接失败不会阻塞服务启动；调用数据库接口时 Prisma 会自动在请求阶段再尝试连接
 * - isConnected 状态对外暴露，便于 /health 端点区分 "服务存活" 与 "DB 可用"
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('PrismaService');

  /** 启动阶段 DB 连接是否成功（对外只读） */
  private _connected = false;
  get isConnected(): boolean {
    return this._connected;
  }

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ],
    });
  }

  async onModuleInit() {
    // 开发环境下输出查询日志
    if (process.env.NODE_ENV === 'development') {
      try {
        (this as any).$on('query', (e: any) => {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        });
      } catch {
        // ignore
      }
    }

    // 启动阶段主动尝试一次 DB 连接，仅记录状态不 throw
    const databaseUrl = process.env.DATABASE_URL || '';
    const urlPresent = !!databaseUrl;
    if (!urlPresent) {
      this.logger.warn('DATABASE_URL 未设置，跳过启动阶段连接校验');
      this._connected = false;
      return;
    }
    try {
      // PrismaClient 内部 lazy connect，通过一个无副作用查询触发连接
      await this.$queryRawUnsafe(`SELECT 1 as _ping`);
      this._connected = true;
      this.logger.log('数据库连接成功');
    } catch (err: any) {
      this._connected = false;
      const msg = err && err.message ? String(err.message) : String(err);
      this.logger.error(`数据库连接失败（NestJS 继续启动，接口调用时会再尝试）: ${msg}`);
      // 不 throw —— 关键：让 CloudBase 健康检查通过
    }
  }
}