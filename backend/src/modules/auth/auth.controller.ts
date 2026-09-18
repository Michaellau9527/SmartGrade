import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { Public, CurrentUser } from '@/common/decorators';
import { CurrentUserPayload } from '@/common/types';
import { LoginDto, LoginByPasswordDto } from './dto';

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

  /**
   * 管理员账号密码冷启动登录（P1-13 运维配套）
   *
   * 仅供：
   *   ① 运维冷启动拿首个 admin token（生产首部署后所有教师 wechat_openid=NULL）
   *   ② 紧急恢复（wechat openid 绑定事故、jscode2session 不可用等）
   *
   * 行为：
   *   - 读 seed 预置的 User.username + UserIdentity(provider='ACCOUNT') 行
   *   - bcrypt 校验 SMARTGRADE_ADMIN_PASSWORD
   *   - 强制要求 Teacher 含 ROLE_ADMIN（拒绝普通教师身份）
   *   - 签发与 /auth/login 同一 shape 的 token，JwtStrategy 原样消费
   *
   * 与 /auth/login 互不影响：后者（微信 code → openid → teacher.wechatOpenid）
   *   仍是教师常规登录的唯一正式入口；本接口不走微信链路。
   */
  @Public()
  @Post('login-with-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '管理员账号密码冷启动登录',
    description:
      '用 seed 预置的 User.username(默认 admin) + 密码直接登入。' +
      '强制要求 Teacher 含 ROLE_ADMIN；返回 accessToken / refreshToken / teacher，' +
      '与 /auth/login 完全兼容。',
  })
  async loginWithPassword(@Body() dto: LoginByPasswordDto) {
    return this.authService.loginByPassword(dto.username, dto.password);
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
