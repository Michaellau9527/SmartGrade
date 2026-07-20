import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { PaginationDto, IdParamDto } from '@/common/dto';
import { RequirePermissions } from '@/common/decorators';

@ApiTags('角色权限')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: '获取权限列表' })
  async findAll(@Query() query: PaginationDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取权限详情' })
  async findOne(@Param() params: IdParamDto) {
    return this.permissionService.findOne(params.id);
  }

  @Post()
  @RequirePermissions('permission:create')
  @ApiOperation({ summary: '新增权限' })
  async create(@Body() body: any) {
    return this.permissionService.create(body);
  }

  @Put(':id')
  @RequirePermissions('permission:update')
  @ApiOperation({ summary: '修改权限' })
  async update(@Param() params: IdParamDto, @Body() body: any) {
    return this.permissionService.update(params.id, body);
  }

  @Delete(':id')
  @RequirePermissions('permission:delete')
  @ApiOperation({ summary: '删除权限' })
  async remove(@Param() params: IdParamDto) {
    return this.permissionService.remove(params.id);
  }
}
