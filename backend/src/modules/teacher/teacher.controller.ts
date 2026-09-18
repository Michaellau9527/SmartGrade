import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { PaginationDto, IdParamDto } from '@/common/dto';
import { CurrentUser, RequirePermissions } from '@/common/decorators';
import type { CurrentUserPayload } from '@/common/types';
import { PermissionCode } from '@smartgrade/shared/enums/PermissionCode';
import { WechatBindingService } from '../wechat-binding/wechat-binding.service';

@ApiTags('教师')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly wechatBindingService: WechatBindingService,
  ) {}

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

  // ========== 微信身份绑定（P1-13） ==========

  @Post(':id/bind-wechat/init')
  @RequirePermissions(PermissionCode.TEACHER_BIND_WECHAT)
  @ApiOperation({
    summary: '发起教师微信绑定',
    description: '生成一次性绑定码（10 分钟有效，库里只存 SHA-256）。受 JwtAuthGuard + PermissionsGuard + Service 层 DataScope 校验保护。',
  })
  async initBindWechat(
    @Param() params: IdParamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.wechatBindingService.initBinding(params.id, user);
  }

  @Post(':id/unbind-wechat')
  @RequirePermissions(PermissionCode.TEACHER_UNBIND_WECHAT)
  @ApiOperation({
    summary: '解绑教师微信',
    description: '清空该教师的微信身份。冻结方案：仅 ROLE_ADMIN 可执行（权限之外再有角色硬校验）。',
  })
  async unbindWechat(
    @Param() params: IdParamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.wechatBindingService.unbindWechat(params.id, user);
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
