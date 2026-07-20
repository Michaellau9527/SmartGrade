import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录请求 DTO
 *
 * Phase 3：支持模拟登录（开发测试用）
 * 生产环境替换为微信 code
 */
export class LoginDto {
  @ApiProperty({ description: '微信登录 code', required: false })
  @IsString()
  @IsNotEmpty()
  code: string;
}

/**
 * 模拟登录 DTO（开发测试用）
 */
export class MockLoginDto {
  @ApiProperty({ description: '教师工号', example: 'T001' })
  @IsString()
  @IsNotEmpty()
  teacherNo: string;
}
