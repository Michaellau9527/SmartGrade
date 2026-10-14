import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 学生二维码凭证 DTO（P2-QR 阶段F1）
 *
 * 安全约束：
 * - 请求体只允许携带 studentId（目标学生归属），操作者身份一律来自已认证的
 *   服务端上下文（@CurrentUser()），绝不接受请求体传入的操作者字段；
 * - DTO 保持字段白名单（全局 ValidationPipe forbidNonWhitelisted），
 *   传入 issuedBy / revokedBy / 学生班级归属等额外字段将直接 400。
 */
export class IssueCredentialDto {
  @ApiProperty({ description: '目标学生ID（cuid）', example: 'clx1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'studentId 格式非法' })
  studentId: string;
}

/**
 * 学生ID 路径参数 DTO（撤销、状态查询复用）
 */
export class StudentIdParamDto {
  @ApiProperty({ description: '目标学生ID（cuid）', example: 'clx1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'studentId 格式非法' })
  studentId: string;
}
