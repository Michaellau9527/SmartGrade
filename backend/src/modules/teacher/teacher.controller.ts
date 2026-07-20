import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { PaginationDto, IdParamDto } from '@/common/dto';
import { RequirePermissions } from '@/common/decorators';

@ApiTags('教师')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @ApiOperation({ summary: '获取教师列表' })
  async findAll(@Query() query: PaginationDto) {
    return this.teacherService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取教师详情' })
  async findOne(@Param() params: IdParamDto) {
    return this.teacherService.findOne(params.id);
  }

  @Post()
  @RequirePermissions('teacher:create')
  @ApiOperation({ summary: '新增教师' })
  async create(@Body() body: any) {
    return this.teacherService.create(body);
  }

  @Put(':id')
  @RequirePermissions('teacher:update')
  @ApiOperation({ summary: '修改教师' })
  async update(@Param() params: IdParamDto, @Body() body: any) {
    return this.teacherService.update(params.id, body);
  }

  @Delete(':id')
  @RequirePermissions('teacher:delete')
  @ApiOperation({ summary: '删除教师' })
  async remove(@Param() params: IdParamDto) {
    return this.teacherService.remove(params.id);
  }

  // ========== 角色/标签分配 ==========

  @Post(':id/roles')
  @RequirePermissions('teacher:assign-role')
  @ApiOperation({ summary: '分配教师角色' })
  async assignRoles(
    @Param() params: IdParamDto,
    @Body('roleIds') roleIds: number[],
  ) {
    return this.teacherService.assignRoles(params.id, roleIds);
  }

  @Post(':id/tags')
  @RequirePermissions('teacher:assign-tag')
  @ApiOperation({ summary: '分配教师标签' })
  async assignTags(
    @Param() params: IdParamDto,
    @Body('tagIds') tagIds: number[],
  ) {
    return this.teacherService.assignTags(params.id, tagIds);
  }
}
