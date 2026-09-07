import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * POST /api/v1/wechat-binding/confirm 请求体（P1-13 Gate D）
 *
 * - code ：wx.login() 换取的临时登录凭证，交给后端 jscode2session 换 openid
 * - token：init 返回的一次性绑定码（后端只存其 SHA-256，不存明文）
 *
 * 字段名与冻结书 2.2 节保持一致（{ code, token }）。
 */
export class ConfirmWechatBindingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;
}

/**
 * POST /api/v1/wechat-binding/preview 请求体（P1-13 Gate E0）
 *
 * 只带绑定码：preview 是**只读**的，不执行绑定、不消费绑定码。
 * 目的：让持有绑定码的教师在点确认前知道「这个码准备绑定到哪位教师」，
 * 避免误绑。返回字段被严格裁剪（仅 teacherId + teacherName）。
 */
export class PreviewWechatBindingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;
}
