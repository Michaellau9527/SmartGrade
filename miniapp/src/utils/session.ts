import Taro from '@tarojs/taro';
import { useEffect } from 'react';
import { login } from '../api/auth';
import { useUserStore } from '../store/user';
import { configureRequest, getToken } from './request';
import { ensurePrivacyAuthorized } from './privacy';
import { isTokenExpired } from './jwt.util';

/**
 * 全局登录态守卫。
 *
 * 背景：此前 App 启动登录是 fire-and-forget，页面 onMount 立刻发业务请求，
 * 此时 token 还没写进 storage，/students、/leaves 全部 401。
 * 这里把登录收敛成「全局唯一 Promise」，页面拉数据前 await 它即可消除竞态。
 *
 * 真实登录链路：wx.login() 拿 code → POST /auth/login（后端 jscode2session 换
 * openid → 匹配已绑定教师 → 签发 JWT）。不再使用写死的 T001 mock 登录。
 *
 * 独立成文件是为了避免页面直接 import 入口 app.ts 带来的副作用。
 */

/** 全局唯一的登录 Promise，保证并发页面只触发一次登录 */
let loginPromise: Promise<void> | null = null;

/** 最近一次登录失败的原因（供登录落地页展示友好文案，不把原始堆栈抛给用户） */
let lastLoginError: string | null = null;

/** 读取最近一次登录失败原因；无失败记录时返回 null */
export function getLastLoginError(): string | null {
  return lastLoginError;
}

/** 注册登录态同步：request 层 401 静默重登录后，store 同步更新 */
configureRequest({
  onTokenRefreshed: (info) => {
    useUserStore.getState().setUserInfo(info);
  }
});

/**
 * 确保已登录（Session 恢复）。
 *
 * - 已有 loginPromise → 直接复用（并发去重）。
 * - 持有 token 且未过期 → 视为已登录立即返回（user store 已在模块加载时
 *   从 storage 恢复，无需重复登录）。
 * - token 缺失 / 过期 → 重新走微信登录流程恢复会话（fail-closed），
 *   不再把过期 token 当「已登录」发给后端等一个 401 再补救。
 *
 * 登录失败不抛错（不阻塞页面渲染），由调用方通过接口错误感知；
 * 失败时清空 loginPromise，使下次 ensureLoggedIn 可重试。
 */
export function ensureLoggedIn(): Promise<void> {
  if (loginPromise) {
    return loginPromise;
  }

  const token = getToken();
  if (token && !isTokenExpired(token)) {
    loginPromise = Promise.resolve();
    return loginPromise;
  }

  loginPromise = (async () => {
    try {
      // 隐私合规：采集用户身份前必须先取得隐私授权（微信《个人信息保护指引》）
      await ensurePrivacyAuthorized();

      const { code } = await Taro.login();
      const result = await login(code);
      useUserStore.getState().setUserInfo({
        token: result.token,
        teacherNo: result.teacher.teacherNo,
        teacherName: result.teacher.name,
        roles: result.roles ?? [],
        permissions: result.permissions ?? []
      });
      lastLoginError = null; // 登录成功，清空历史失败原因
    } catch (err) {
      lastLoginError = err instanceof Error ? err.message : String(err);
      console.error('[SmartGrade] 登录失败:', err);
      loginPromise = null; // 允许下次重试
    }
  })();

  return loginPromise;
}

/**
 * 重置登录态，使下次 ensureLoggedIn 重新走登录流程。
 * 彻底清除：loginPromise + store + storage（token / teacherNo / ...），
 * 避免「只清 Promise 却留着 storage token」导致下次仍被当成已登录。
 */
export function resetSession(): void {
  loginPromise = null;
  lastLoginError = null;
  useUserStore.getState().logout();
}

/**
 * 页面级 Session 恢复 Hook：mount 与 useDidShow 时各确保一次登录态。
 * token 过期/缺失时自动重登，避免从后台回到前台后停留在过期会话。
 * ensureLoggedIn 幂等（有效 token 立即 resolve，不会重复触发 wx.login）。
 */
export function useSessionRestore(): void {
  useEffect(() => {
    ensureLoggedIn().catch(() => {});
  }, []);
  Taro.useDidShow(() => {
    ensureLoggedIn().catch(() => {});
  });
}

export default ensureLoggedIn;
