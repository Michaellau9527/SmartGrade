import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { PaginationDto, IdParamDto } from '@/common/dto';
import { RequirePermissions } from '@/common/decorators';

@ApiTags('角色权限')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: '获取角色列表' })
  async findAll(@Query() query: PaginationDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  async findOne(@Param() params: IdParamDto) {
    return this.roleService.findOne(params.id);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: '获取角色权限' })
  async getRolePermissions(@Param() params: IdParamDto) {
    return this.roleService.getRolePermissions(params.id);
  }

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({ summary: '新增角色' })
  async create(@Body() body: any) {
    return this.roleService.create(body);
  }

  @Put(':id')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: '修改角色' })
  async update(@Param() params: IdParamDto, @Body() body: any) {
    return this.roleService.update(params.id, body);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({ summary: '删除角色' })
  async remove(@Param() params: IdParamDto) {
    return this.roleService.remove(params.id);
  }

  @Post(':id/permissions')
  @RequirePermissions('role:assign-permission')
  @ApiOperation({ summary: '分配角色权限' })
  async assignPermissions(
    @Param() params: IdParamDto,
    @Body('permissionIds') permissionIds: number[],
  ) {
    return this.roleService.assignPermissions(params.id, permissionIds);
  }
}
