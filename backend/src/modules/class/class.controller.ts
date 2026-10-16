import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { ClassQueryDto } from './dto/class-query.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CurrentUser, DataScope, RequirePermissions } from '@/common/decorators';
import type { CurrentUserPayload } from '@/common/types';

/**
 * ClassController — 班级管理
 *
 * 权限（后端权威校验，前端隐藏按钮仅为体验，不可替代）：
 * - class:read   列表 / 详情 / 可选年级（管理员短路放行、年级主任本年级、
 *                政教与班主任只读且受数据范围约束）
 * - class:create 新增（ROLE_ADMIN / ROLE_GRADE_DIRECTOR）
 * - class:update 编辑（同上）
 * - class:delete 删除（同上）
 *
 * 数据范围由 @DataScope() + ClassService 强制：
 * 年级主任仅能操作本年级，班主任仅能读本班，任课教师/宿管无班级管理范围。
 */
@ApiTags('班级')
@ApiBearerAuth()
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @DataScope()
  @RequirePermissions('class:read')
  @ApiOperation({ summary: '获取班级列表（按学校/年级过滤与关键字搜索，受数据范围约束）' })
  findAll(@Query() query: ClassQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.classService.findAll(query, user);
  }

  /**
   * 新增班级时可选的年级列表。
   * ⚠️ 必须声明在 `@Get(':id')` 之前，否则 'grades' 会被当作 id 命中。
   */
  @Get('grades')
  @DataScope()
  @RequirePermissions('class:read')
  @ApiOperation({ summary: '获取可管理（可选）年级列表（受数据范围约束）' })
  listGrades(@CurrentUser() user: CurrentUserPayload) {
    return this.classService.listGradeOptions(user);
  }

  @Get(':id')
  @DataScope()
  @RequirePermissions('class:read')
  @ApiOperation({ summary: '获取班级详情' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.classService.findOne(id, user);
  }

  @Post()
  @DataScope()
  @RequirePermissions('class:create')
  @ApiOperation({ summary: '新增班级（年级主任限本年级，schoolId 由服务端推导）' })
  create(@Body() dto: CreateClassDto, @CurrentUser() user: CurrentUserPayload) {
    return this.classService.create(dto, user);
  }

  @Put(':id')
  @DataScope()
  @RequirePermissions('class:update')
  @ApiOperation({ summary: '修改班级（强制校验目标班级所属年级的数据范围）' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.classService.update(id, dto, user);
  }

  @Delete(':id')
  @DataScope()
  @RequirePermissions('class:delete')
  @ApiOperation({
    summary: '删除班级（软删除；存在关联学生/教师关系/请假/时间轴时拒绝）',
  })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.classService.remove(id, user);
  }
}
