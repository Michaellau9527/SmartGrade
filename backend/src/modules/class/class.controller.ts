import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { ClassQueryDto } from './dto/class-query.dto';
import { RequirePermissions } from '@/common/decorators';

@ApiTags('班级')
@ApiBearerAuth()
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @RequirePermissions('student:read')
  @ApiOperation({ summary: '获取班级列表（支持按学校/年级过滤与关键字搜索）' })
  findAll(@Query() query: ClassQueryDto) {
    return this.classService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('student:read')
  @ApiOperation({ summary: '获取班级详情' })
  findOne(@Param('id') id: string) {
    return this.classService.findOne(id);
  }
}
