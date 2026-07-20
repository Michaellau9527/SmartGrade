import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { StudentService } from './student.service';
import {
  QueryStudentDto,
  CreateStudentDto,
  UpdateStudentDto,
  SetDormitoryDto,
  ImportStudentDto,
} from './dto';
import { IdParamDto } from '@/common/dto';
import { DataScope, CurrentUser, RequirePermissions } from '@/common/decorators';

/**
 * StudentController - 学生管理接口
 *
 * 数据权限通过 @DataScope() 装饰器标记
 * Guard 自动根据用户角色计算数据范围
 *
 * docs/10-Permission.md 第八章 + 第十六章
 */
@ApiTags('学生')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * 获取学生列表
   *
   * 数据权限：
   * - ROLE_ADMIN / ROLE_POLITICAL → 全校
   * - ROLE_GRADE_DIRECTOR → 本年级
   * - ROLE_HEADMASTER → 本班
   * - ROLE_DORM_MANAGER → 仅住宿生
   * - ROLE_SUBJECT_TEACHER → 授课班级（暂返回空）
   */
  @Get()
  @DataScope()
  @RequirePermissions('student:read')
  @ApiOperation({ summary: '获取学生列表', description: '支持按姓名/学号/班级/年级/住宿类型/状态/性别筛选' })
  async findAll(@Query() query: QueryStudentDto, @CurrentUser() user: any) {
    return this.studentService.findAll(query, user);
  }

  /**
   * 获取学生详情
   *
   * 返回：基本信息 + 班级 + 年级 + 住宿 + 请假数量 + 时间轴数量
   */
  @Get(':id')
  @RequirePermissions('student:read')
  @ApiOperation({ summary: '获取学生详情', description: '包含班级、年级、住宿信息及请假/时间轴统计' })
  async findOne(@Param() params: IdParamDto, @CurrentUser() user: any) {
    return this.studentService.findOne(params.id, user);
  }

  /**
   * 新增学生
   */
  @Post()
  @RequirePermissions('student:create')
  @ApiOperation({ summary: '新增学生' })
  async create(@Body() dto: CreateStudentDto, @CurrentUser() user: any) {
    return this.studentService.create(dto, user);
  }

  /**
   * 修改学生信息
   */
  @Put(':id')
  @RequirePermissions('student:update')
  @ApiOperation({ summary: '修改学生信息' })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: any,
  ) {
    return this.studentService.update(params.id, dto, user);
  }

  /**
   * 删除学生（逻辑删除）
   */
  @Delete(':id')
  @RequirePermissions('student:delete')
  @ApiOperation({ summary: '删除学生', description: '逻辑删除，数据保留' })
  async remove(@Param() params: IdParamDto, @CurrentUser() user: any) {
    return this.studentService.remove(params.id, user);
  }

  /**
   * 设置住宿信息
   */
  @Post(':id/dormitory')
  @RequirePermissions('student:update')
  @ApiOperation({ summary: '设置住宿信息', description: '设置宿舍房间和床位号，自动将住宿类型改为 BOARDING' })
  async setDormitory(
    @Param() params: IdParamDto,
    @Body() dto: SetDormitoryDto,
    @CurrentUser() user: any,
  ) {
    return this.studentService.setDormitory(params.id, dto, user);
  }

  /**
   * Excel 导入学生（预留接口）
   *
   * 暂不实现文件解析，仅预留接口定义
   */
  @Post('import')
  @RequirePermissions('student:create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Excel 导入学生', description: '预留接口，暂未实现' })
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }
    return this.studentService.importExcel(file, user);
  }
}
