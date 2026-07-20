import { Controller, Get, Post, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentService } from './incident.service';

@ApiTags('异常事件')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Get()
  @ApiOperation({ summary: '获取异常列表' })
  async findAll(@Query() query: any) {
    return this.incidentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取异常详情' })
  async findOne(@Param('id') id: string) {
    return this.incidentService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '上报异常' })
  async create(@Body() body: any, @Request() req: any) {
    return this.incidentService.create(body, req.user);
  }

  @Post(':id/handle')
  @ApiOperation({ summary: '处理异常' })
  async handle(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.incidentService.handle(+id, body, req.user);
  }

  @Post(':id/close')
  @ApiOperation({ summary: '关闭异常' })
  async close(@Param('id') id: string, @Request() req: any) {
    return this.incidentService.close(+id, req.user);
  }
}