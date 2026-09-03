import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { Public } from '@/common/decorators';

/**
 * HealthController - 健康检查接口
 *
 * 用于：
 * - 负载均衡健康探测
 * - 容器编排存活检查
 * - 监控系统状态上报
 */
@ApiTags('健康检查')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '基础健康检查' })
  async check() {
    return this.healthService.check();
  }

  @Get('db')
  @ApiOperation({ summary: '数据库连接检查' })
  async checkDatabase(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.checkDatabase();
    // readiness probe（P1-4）：DB 不可用时必须返回 503 而非 200，
    // 否则容器编排/负载均衡会误判实例健康并把流量打进无 DB 的实例。
    // 通过显式设置 HTTP status 实现 fail-closed，不抛异常、不绕道全局业务异常过滤器
    // （避免把健康探针变成普通业务错误处理，也不触碰 P0-6 的 50300/50000 体系）。
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }

  @Get('full')
  @ApiOperation({ summary: '完整健康检查' })
  async checkFull() {
    return this.healthService.checkFull();
  }
}