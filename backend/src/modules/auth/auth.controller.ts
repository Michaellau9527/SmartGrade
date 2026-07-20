import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public, CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import { MockLoginDto } from './dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 模拟登录（开发测试用）
   *
   * 生产环境替换为微信 code 登录
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '模拟登录（开发测试）', description: '通过教师工号登录，获取 JWT Token' })
  async login(@Body() dto: MockLoginDto) {
    return this.authService.mockLogin(dto.teacherNo);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token', description: '使用 Refresh Token 换取新的 Access Token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  async logout(@CurrentUser('id') teacherId: number) {
    return this.authService.logout(teacherId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息', description: '返回当前登录教师的完整信息、角色、标签、权限' })
  async getCurrentUser(@CurrentUser('id') teacherId: number) {
    return this.authService.getCurrentUser(teacherId);
  }
}
