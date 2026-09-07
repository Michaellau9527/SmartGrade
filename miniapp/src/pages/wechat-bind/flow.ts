/**
 * 教师微信绑定流程（P1-13 Gate E1）
 *
 * 为什么单独抽成纯函数：
 * - 页面（index.tsx）只负责渲染与 Taro API 适配；
 * - 流程顺序「preview → 用户确认 → wx.login → confirm → 恢复会话」是可被验证的核心逻辑，
 *   抽出来后可以在不启动小程序、不依赖 Taro 的前提下断言其顺序与副作用边界。
 *
 * 硬约束：
 * - 用户未确认 → 绝不调用 login / confirm；
 * - 绑定成功前不写任何本地存储（token 只在参数里流转）；
 * - 本文件不 import Taro，也不输出 token / openid / unionid 日志。
 */

/** preview 返回的最小教师信息 */
export interface BindPreviewInfo {
  teacherId: string;
  teacherName: string;
}

export interface BindFlowDeps {
  /** 只读查询：这个绑定码指向哪位教师 */
  preview: (token: string) => Promise<BindPreviewInfo>;
  /** 用户确认动作：返回 true 才继续（取消 = false） */
  requestUserConfirmation: (teacherName: string) => Promise<boolean>;
  /** wx.login()：取临时 code（复用现有登录能力，不实现第二套微信登录） */
  login: () => Promise<{ code: string }>;
  /** 真正写绑定 */
  confirm: (token: string, code: string) => Promise<unknown>;
  /** 绑定成功后重建会话（清旧 session → 重新登录） */
  restoreSession: () => Promise<void>;
}

/** 流程实际走过的步骤，供测试断言顺序 */
export type BindFlowStep = 'preview' | 'user-confirm' | 'login' | 'confirm' | 'restore';

export type BindFlowResult =
  | { status: 'bound'; teacherName: string; steps: BindFlowStep[] }
  | { status: 'cancelled'; steps: BindFlowStep[] };

/**
 * 执行绑定流程。
 *
 * 抛出的错误直接向上传递（如「绑定码无效或已失效」），由页面决定展示方式。
 */
export async function runBindFlow(token: string, deps: BindFlowDeps): Promise<BindFlowResult> {
  const steps: BindFlowStep[] = [];
  const trimmed = (token ?? '').trim();
  if (!trimmed) {
    throw new Error('请先填写绑定码');
  }

  // 1) 先让教师知道要绑谁
  steps.push('preview');
  const info = await deps.preview(trimmed);

  // 2) 用户主动确认；取消 → 到此为止，不碰 login / confirm
  steps.push('user-confirm');
  const agreed = await deps.requestUserConfirmation(info.teacherName);
  if (!agreed) {
    return { status: 'cancelled', steps };
  }

  // 3) 取 wx.login code
  steps.push('login');
  const { code } = await deps.login();

  // 4) 真正绑定（后端二次校验 + 一次性消费）
  steps.push('confirm');
  await deps.confirm(trimmed, code);

  // 5) 重建会话：绑定完成后该微信即可正常登录
  steps.push('restore');
  await deps.restoreSession();

  return { status: 'bound', teacherName: info.teacherName, steps };
}

export default runBindFlow;
