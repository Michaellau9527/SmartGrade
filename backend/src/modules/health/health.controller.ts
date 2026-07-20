import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * HealthController - 健康检查接口
 *
 * 用于：
 * - 负载均衡健康探测
 * - 容器编排存活检查
 * - 监控系统状态上报
 */
@ApiTags('健康检查')
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
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get('full')
  @ApiOperation({ summary: '完整健康检查' })
  async checkFull() {
    return this.healthService.checkFull();
  }
}