import { Controller, Get, Put, Body, Param, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';

@ApiTags('系统配置')
@ApiBearerAuth()
@Controller('configs')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取系统配置' })
  async findAll() {
    return this.configService.findAll();
  }

  @Put()
  @ApiOperation({ summary: '修改系统配置' })
  async update(@Body() body: any) {
    return this.configService.update(body);
  }

  @Get('roles')
  @ApiOperation({ summary: '获取角色列表' })
  async getRoles() {
    return this.configService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: '新增角色' })
  async createRole(@Body() body: any) {
    return this.configService.createRole(body);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: '修改角色' })
  async updateRole(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateRole(+id, body);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色' })
  async removeRole(@Param('id') id: string) {
    return this.configService.removeRole(+id);
  }

  @Get('tags')
  @ApiOperation({ summary: '获取标签列表' })
  async getTags() {
    return this.configService.getTags();
  }

  @Post('tags')
  @ApiOperation({ summary: '新增标签' })
  async createTag(@Body() body: any) {
    return this.configService.createTag(body);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: '修改标签' })
  async updateTag(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateTag(+id, body);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: '删除标签' })
  async removeTag(@Param('id') id: string) {
    return this.configService.removeTag(+id);
  }
}