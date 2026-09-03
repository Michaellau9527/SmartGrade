import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 微信登录请求 DTO
 *
 * 小程序 wx.login() 返回的临时登录凭证 code。
 */
export class LoginDto {
  @ApiProperty({ description: 'wx.login 返回的临时登录凭证 code', required: true })
  @IsString()
  @IsNotEmpty()
  code: string;
}
