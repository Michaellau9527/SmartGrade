import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 管理员账号密码冷启动登录请求 DTO（P1-13 运维配套）
 *
 * 字段最小化：
 *  - username：seed 预置的 User.username（默认 'admin'）
 *  - password：明文密码，来源是后端环境变量 SMARTGRADE_ADMIN_PASSWORD
 *
 * 该接口不接受 teacherNo，不接受任何微信字段；
 * 调用方仅限运维冷启动 / 紧急恢复（前端页面不在本任务范围）。
 */
export class LoginByPasswordDto {
  @ApiProperty({
    description: '管理员账号（seed 预置 User.username，默认 admin）',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '管理员密码（明文，后端用 bcrypt 校验后丢弃）',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
