import Taro from '@tarojs/taro';
import { classifyPrivacyFail } from './privacy.util';

/**
 * 隐私合规授权（微信《个人信息保护指引》要求，P0-8 / D13）。
 *
 * 在采集用户身份（wx.login → openid）前必须取得用户同意。
 * 通过 wx.requirePrivacyAuthorize 拉起平台隐私弹窗：用户同意后 resolve。
 *
 * P1-9「正式收紧」策略（fail-closed）：
 * - 用户明确拒绝授权 → reject（阻止 wx.login 采集 openid），并清空缓存，
 *   允许下次重新拉起授权弹窗；调用方（ensureLoggedIn）会据此停止登录。
 * - 隐私协议未配置 / 未声明 / 接口被禁用（errno 112/1025/1026、api banned）
 *   → 保留容错跳过：这是 mp 后台配置项（D13），微信审核为硬门槛，
 *     代码不猜测配置状态，避免开发/预览期因未配置而彻底无法登录。
 * - 基础库过低、隐私接口不可用 → 容错跳过，不阻塞。
 */
let privacyPromise: Promise<void> | null = null;

export function ensurePrivacyAuthorized(): Promise<void> {
  if (privacyPromise) {
    return privacyPromise;
  }

  privacyPromise = requestPrivacy().catch((err: unknown) => {
    // 用户拒绝（fail-closed）：清空缓存，允许下次重新拉起授权弹窗；
    // 否则这个被 reject 的 Promise 会被永久缓存，用户再也无法重新授权。
    privacyPromise = null;
    throw err;
  });

  return privacyPromise;
}

async function requestPrivacy(): Promise<void> {
  const api = (Taro as any).requirePrivacyAuthorize;
  if (typeof api !== 'function') {
    // 隐私接口不可用（基础库过低）：跳过，不阻塞
    return;
  }

  await new Promise<void>((resolve, reject) => {
    try {
      api({
        success: () => resolve(),
        fail: (res?: { errMsg?: string; errno?: number }) => {
          if (classifyPrivacyFail(res) === 'USER_DENIED') {
            console.warn('[SmartGrade] 用户拒绝隐私授权，阻止登录采集 openid');
            try {
              Taro.showToast({ title: '需同意隐私政策后才能使用', icon: 'none' });
            } catch {
              /* 忽略 UI 异常，不影响主流程 */
            }
            reject(new Error('隐私授权被拒绝'));
          } else {
            // 未配置协议 / 未声明 / 其他环境问题：容错跳过（上线前需在 mp 后台配置）
            console.warn(
              '[SmartGrade] 隐私授权跳过（协议未配置或环境问题）:',
              res?.errMsg ?? 'unknown',
            );
            resolve();
          }
        },
      });
    } catch {
      // 异常同样降级为跳过，不阻塞登录流程
      resolve();
    }
  });
}

export default ensurePrivacyAuthorized;
