import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { CurrentUser, RequirePermissions } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';

@ApiTags('数据统计')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @RequirePermissions('statistics:read')
  @ApiOperation({ summary: 'Dashboard 概览统计' })
  async getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.statisticsService.getOverview(user);
  }

  @Get('recent-leaves')
  @RequirePermissions('statistics:read')
  @ApiOperation({ summary: '最近请假' })
  async getRecentLeaves(@CurrentUser() user: CurrentUserPayload) {
    return this.statisticsService.getRecentLeaves(user);
  }

  @Get('recent-notices')
  @RequirePermissions('statistics:read')
  @ApiOperation({ summary: '最近通知' })
  async getRecentNotices(@CurrentUser() user: CurrentUserPayload) {
    return this.statisticsService.getRecentNotices(user);
  }

  @Get('recent-timeline')
  @RequirePermissions('statistics:read')
  @ApiOperation({ summary: '最近时间轴' })
  async getRecentTimeline(@CurrentUser() user: CurrentUserPayload) {
    return this.statisticsService.getRecentTimeline(user);
  }
}
