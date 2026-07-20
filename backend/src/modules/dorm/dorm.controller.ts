import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DormService } from './dorm.service';
import { QueryDormDto, CheckDormDto } from './dto';
import { IdParamDto } from '@/common/dto';
import { CurrentUser, RequirePermissions } from '@/common/decorators';

@ApiTags('宿舍管理')
@ApiBearerAuth()
@Controller('dormitories')
export class DormController {
  constructor(private readonly dormService: DormService) {}

  @Get()
  @RequirePermissions('dorm:read')
  @ApiOperation({ summary: '公寓列表' })
  async findAllDormitories() {
    return this.dormService.findAllDormitories();
  }

  @Get(':id')
  @RequirePermissions('dorm:read')
  @ApiOperation({ summary: '公寓详情' })
  async findOneDormitory(@Param() params: IdParamDto) {
    return this.dormService.findOneDormitory(params.id);
  }

  @Get(':id/rooms')
  @RequirePermissions('dorm:read')
  @ApiOperation({ summary: '公寓房间列表' })
  async findRoomsByDormitory(@Param() params: IdParamDto, @Query() query: QueryDormDto) {
    return this.dormService.findRooms({ ...query, dormitoryId: params.id } as QueryDormDto);
  }

  @Get('rooms/:id')
  @RequirePermissions('dorm:read')
  @ApiOperation({ summary: '寝室详情' })
  async findOneRoom(@Param() params: IdParamDto) {
    return this.dormService.findOneRoom(params.id);
  }

  @Post('rooms/:id/check')
  @RequirePermissions('dorm:check')
  @ApiOperation({ summary: '查寝' })
  async checkRoom(@Param() params: IdParamDto, @Body() dto: CheckDormDto, @CurrentUser() user: any) {
    return this.dormService.checkRoom(params.id, dto, user);
  }

  @Get('statistics')
  @RequirePermissions('dorm:read')
  @ApiOperation({ summary: '宿舍统计' })
  async getStatistics() {
    return this.dormService.getStatistics();
  }
}
