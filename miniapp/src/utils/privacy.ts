import Taro from '@tarojs/taro';

/**
 * 隐私合规授权（微信《个人信息保护指引》要求，P0-8 / D13）。
 *
 * 在采集用户身份（wx.login → openid）前必须取得用户同意。
 * 通过 wx.requirePrivacyAuthorize 拉起平台隐私弹窗：用户同意后 resolve。
 *
 * 容错策略：
 * - 基础库过低或隐私接口不可用（如隐私协议尚未在公众平台配置）：静默跳过，不阻塞登录。
 * - 用户拒绝或当前隐私协议未配置：记录告警并 resolve，避免在开发/预览期因未配置协议而卡死；
 *   正式发布前需在公众平台配置《隐私保护指引》，平台审核期会强制要求授权通过。
 */
let privacyPromise: Promise<void> | null = null;

export function ensurePrivacyAuthorized(): Promise<void> {
  if (privacyPromise) {
    return privacyPromise;
  }

  privacyPromise = (async () => {
    const api = (Taro as any).requirePrivacyAuthorize;
    if (typeof api !== 'function') {
      // 隐私接口不可用：跳过，不阻塞
      return;
    }
    await new Promise<void>((resolve) => {
      try {
        api({
          success: () => resolve(),
          fail: () => {
            console.warn('[SmartGrade] 隐私授权未完成（用户拒绝或协议未配置）');
            resolve();
          },
        });
      } catch {
        // 异常同样降级为跳过，不阻塞登录流程
        resolve();
      }
    });
  })();

  return privacyPromise;
}
