import { mockLogin } from '../api/auth';
import { useUserStore } from '../store/user';
import { configureRequest, getToken } from './request';

/**
 * 全局登录态守卫。
 *
 * 背景：此前 App 启动登录是 fire-and-forget，页面 onMount 立刻发业务请求，
 * 此时 token 还没写进 storage，/students、/leaves 全部 401。
 * 这里把登录收敛成「全局唯一 Promise」，页面拉数据前 await 它即可消除竞态。
 *
 * 独立成文件是为了避免页面直接 import 入口 app.ts 带来的副作用。
 */

/** 自动登录使用的工号 */
const DEFAULT_TEACHER_NO = 'T001';

/** 全局唯一的登录 Promise，保证并发页面只触发一次登录 */
let loginPromise: Promise<void> | null = null;

/** 注册登录态同步：request 层 401 静默重登录后，store 同步更新 */
configureRequest({
  teacherNo: DEFAULT_TEACHER_NO,
  onTokenRefreshed: (info) => {
    useUserStore.getState().setUserInfo(info);
  }
});

/**
 * 确保已登录。已持有 token 时立即返回；否则执行一次登录。
 * 登录失败不抛错（不阻塞页面渲染），由调用方通过接口错误感知。
 */
export function ensureLoggedIn(): Promise<void> {
  if (loginPromise) {
    return loginPromise;
  }

  if (getToken()) {
    loginPromise = Promise.resolve();
    return loginPromise;
  }

  loginPromise = (async () => {
    try {
      const result = await mockLogin(DEFAULT_TEACHER_NO);
      useUserStore.getState().setUserInfo({
        token: result.token,
        teacherNo: result.teacher.teacherNo,
        teacherName: result.teacher.name,
        roles: result.roles ?? [],
        permissions: result.permissions ?? []
      });
    } catch (err) {
      console.error('[SmartGrade] 登录失败:', err);
    }
  })();

  return loginPromise;
}

/** 供退出登录等场景重置，使下次 ensureLoggedIn 重新走登录流程 */
export function resetSession(): void {
  loginPromise = null;
}

export default ensureLoggedIn;
