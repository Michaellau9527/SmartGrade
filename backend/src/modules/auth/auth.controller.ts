import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public, CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import { LoginDto } from './dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 微信登录（生产环境）
   *
   * 小程序 wx.login() 拿到 code 后调用此接口，后端换 openid 并签发 JWT。
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信登录', description: '传入 wx.login 的 code，后端换 openid 并签发 JWT' })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginByWechat(dto.code);
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
  async logout(@CurrentUser('id') teacherId: string) {
    return this.authService.logout(teacherId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息', description: '返回当前登录教师的完整信息、角色、标签、权限' })
  async getCurrentUser(@CurrentUser('id') teacherId: string) {
    return this.authService.getCurrentUser(teacherId);
  }
}
