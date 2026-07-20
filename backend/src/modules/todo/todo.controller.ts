import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { TodoService } from './todo.service';
import { QueryTodoDto, CompleteTodoDto } from './dto';
import { IdParamDto } from '@/common/dto';
import { CurrentUser, RequirePermissions } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';

/**
 * TodoController - 待办管理接口
 *
 * 权限通过 @RequirePermissions 标记
 * 数据权限在 Service 层根据角色实现（teacher_id 过滤）
 *
 * docs/09-API.md 第九章：待办接口
 * docs/10-Permission.md：todo:read / todo:complete
 */
@ApiTags('待办')
@ApiBearerAuth()
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  /**
   * 获取待办列表
   *
   * 默认只显示 TODO 和 PROCESSING 状态
   * 支持按状态/业务类型/优先级筛选
   * ADMIN/POLITICAL 查看全部，其他角色只看自己的
   */
  @Get()
  @RequirePermissions('todo:read')
  @ApiOperation({
    summary: '获取待办列表',
    description: '默认显示待处理和处理中，支持按状态/业务类型/优先级筛选',
  })
  async findAll(@Query() query: QueryTodoDto, @CurrentUser() user: CurrentUserPayload) {
    return this.todoService.findAll(query, user);
  }

  /**
   * 获取待办统计
   *
   * 统计各状态待办数量
   */
  @Get('statistics')
  @RequirePermissions('todo:read')
  @ApiOperation({
    summary: '获取待办统计',
    description: '统计 TODO/PROCESSING/DONE/CANCELLED 各状态数量',
  })
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    return this.todoService.getStatistics(user);
  }

  /**
   * 获取待办详情
   */
  @Get(':id')
  @RequirePermissions('todo:read')
  @ApiOperation({ summary: '获取待办详情' })
  async findOne(@Param() params: IdParamDto, @CurrentUser() user: CurrentUserPayload) {
    return this.todoService.findOne(params.id, user);
  }

  /**
   * 完成待办
   *
   * 状态校验：仅 TODO / PROCESSING 可完成
   */
  @Post(':id/complete')
  @RequirePermissions('todo:complete')
  @ApiOperation({
    summary: '完成待办',
    description: '将待办标记为已完成，仅 TODO/PROCESSING 状态可操作',
  })
  async complete(@Param() params: IdParamDto, @CurrentUser() user: CurrentUserPayload) {
    return this.todoService.complete(params.id, user);
  }

  /**
   * 批量完成待办
   */
  @Post('batch-complete')
  @RequirePermissions('todo:complete')
  @ApiOperation({
    summary: '批量完成待办',
    description: '批量将待办标记为已完成，仅 TODO/PROCESSING 状态可操作',
  })
  async batchComplete(
    @Body() dto: CompleteTodoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.todoService.batchComplete(dto.ids, user);
  }
}
