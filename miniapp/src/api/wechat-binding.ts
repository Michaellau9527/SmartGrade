import { request } from '../utils/request';

/**
 * 教师微信绑定 API（P1-13）
 *
 * 两个接口都是 @Public（免登录）：目标教师在绑定完成前不可能持有 JWT。
 * 授权完全依赖管理员 init 出来的一次性绑定码。
 *
 * 安全约束（前端侧）：
 * - 绑定码只在内存 / 路由参数里流转，**不写入 Taro storage**（不持久化）；
 * - 本文件与调用方均不得 console 输出 token / openid / unionid。
 */

/** preview 返回的最小教师信息：只够教师辨认"绑的是不是我" */
export interface WechatBindingPreview {
  teacherId: string;
  teacherName: string;
}

/** confirm 的返回：后端不回显任何教师信息 */
export interface WechatBindingConfirmResult {
  ok: boolean;
}

/**
 * 绑定预览（只读）：查询这个绑定码准备绑定到哪位教师。
 * 不执行绑定、不消费绑定码。
 */
export function previewWechatBinding(token: string): Promise<WechatBindingPreview> {
  return request<WechatBindingPreview>('/wechat-binding/preview', {
    method: 'POST',
    data: { token }
  });
}

/**
 * 确认绑定：凭绑定码 + wx.login() 的临时 code 完成绑定。
 * 绑定码一次性，成功后立即失效。
 */
export function confirmWechatBinding(
  token: string,
  code: string
): Promise<WechatBindingConfirmResult> {
  return request<WechatBindingConfirmResult>('/wechat-binding/confirm', {
    method: 'POST',
    data: { token, code }
  });
}
