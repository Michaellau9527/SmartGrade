import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { TimelineService } from './timeline.service';
import { QueryTimelineDto } from './dto';
import { IdParamDto } from '@/common/dto';
import { DataScope, CurrentUser, RequirePermissions } from '@/common/decorators';

/**
 * TimelineController - 时间轴查询接口
 *
 * 纯查询模块：Timeline 写入由 Leave/Notice/Dorm 等业务模块完成
 *
 * 数据权限通过 @DataScope() 装饰器标记
 * 权限通过 @RequirePermissions('timeline:read') 标记
 *
 * docs/09-API.md 第十章：时间轴接口
 * docs/10-Permission.md：timeline:read 权限
 */
@ApiTags('时间轴')
@ApiBearerAuth()
@Controller('timelines')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  /**
   * 获取时间轴列表
   *
   * 数据权限：根据角色过滤可见范围
   * 支持按学生/教师/事件类型/时间范围/业务关联筛选
   */
  @Get()
  @DataScope()
  @RequirePermissions('timeline:read')
  @ApiOperation({
    summary: '获取时间轴列表',
    description: '支持按学生/教师/事件类型/时间范围筛选，数据权限自动过滤',
  })
  async findAll(@Query() query: QueryTimelineDto, @CurrentUser() user: any) {
    return this.timelineService.findAll(query, user);
  }

  /**
   * 获取时间轴统计
   *
   * 数据权限：根据角色过滤
   * 返回：按事件类型统计 + 按时间范围统计
   */
  @Get('statistics')
  @DataScope()
  @RequirePermissions('timeline:read')
  @ApiOperation({
    summary: '获取时间轴统计',
    description: '按事件类型和按时间范围（今日/本周/本月）统计，数据权限自动过滤',
  })
  async getStatistics(@CurrentUser() user: any) {
    return this.timelineService.getStatistics(user);
  }

  /**
   * 获取时间轴详情
   *
   * 返回：Timeline + Student + Class + Grade + 操作教师 + 关联请假记录
   * 数据权限：Service 层通过 student 关联校验
   */
  @Get(':id')
  @RequirePermissions('timeline:read')
  @ApiOperation({
    summary: '获取时间轴详情',
    description: '返回时间轴记录、学生信息、操作教师、关联请假记录',
  })
  async findOne(@Param() params: IdParamDto, @CurrentUser() user: any) {
    return this.timelineService.findOne(params.id, user);
  }
}
