import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';

@ApiTags('文件')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @ApiOperation({ summary: '获取文件列表' })
  async findAll(@Query() query: any) {
    return this.documentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件详情' })
  async findOne(@Param('id') id: string) {
    return this.documentService.findOne(+id);
  }

  @Get(':id/reads')
  @ApiOperation({ summary: '获取阅读情况' })
  async getReads(@Param('id') id: string) {
    return this.documentService.getReads(+id);
  }

  @Post()
  @ApiOperation({ summary: '上传文件' })
  async create(@Body() body: any, @Request() req: any) {
    return this.documentService.create(body, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: '修改文件' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.documentService.update(+id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  async remove(@Param('id') id: string) {
    return this.documentService.remove(+id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载文件' })
  async download(@Param('id') id: string) {
    return this.documentService.download(+id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '确认阅读' })
  async confirm(@Param('id') id: string, @Request() req: any) {
    return this.documentService.confirm(+id, req.user);
  }
}