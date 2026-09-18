/**
 * 隐私授权失败分类 — 纯函数（P1-9）
 *
 * 背景：P0-8 引入 ensurePrivacyAuthorized，但用户拒绝时此前静默 resolve
 * 继续登录（软处理），等于「用户拒绝授权后仍采集 openid」，违反隐私合规。
 * P1-9 收紧为 fail-closed：用户拒绝 → reject 阻止登录；配置缺失/接口不可用
 * 仍容错跳过（配置缺失属 mp 后台配置项，微信审核为硬门槛，代码不猜配置状态）。
 *
 * 依据微信官方《隐私协议开发指南》错误码：
 * - 103 / 104           用户拒绝 / 未同意（含间隔期内再次调用）
 * - 112                 未在隐私保护指引声明该接口的隐私类型
 * - 1025 / 1026         未声明任何用户信息类型
 * - appid privacy api banned  平台回收接口权限（提审勾选「未采集」）
 */

export type PrivacyFailKind = 'USER_DENIED' | 'NOT_CONFIGURED' | 'UNKNOWN';

/** 从 fail 回调结果里提取 errno（可能在 errMsg 字符串或独立字段） */
function extractErrno(res?: { errMsg?: string; errno?: number } | null): number | null {
  if (res && typeof res.errno === 'number') return res.errno;
  const msg = typeof res?.errMsg === 'string' ? res.errMsg : '';
  const m = msg.match(/errno[:\s]*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * 分类隐私授权失败原因。
 *
 * 规则（fail-closed 优先，仅「用户明确拒绝」触发拒绝）：
 * - USER_DENIED：errno 103/104，或 errMsg 含「privacy permission is not ...」
 *   （官方对「用户未同意」的固定文案）。
 * - NOT_CONFIGURED：errno 112/1025/1026，或 errMsg 含 scope 未声明 /
 *   announce privacy usage / api banned / not configured / 未实现弹窗。
 * - UNKNOWN：无法归类（保守容错，交给调用方按环境问题处理）。
 */
export function classifyPrivacyFail(
  res?: { errMsg?: string; errno?: number } | null,
): PrivacyFailKind {
  const msg = typeof res?.errMsg === 'string' ? res.errMsg : '';
  const errno = extractErrno(res);

  // 用户明确拒绝（官方 errno）
  if (errno === 103 || errno === 104) return 'USER_DENIED';
  // 用户未同意的固定 errMsg（含 "privacy permission is not authorized" 与
  // "privacy permission is not authorized in gap" 间隔期场景）
  if (/privacy permission is not/i.test(msg)) return 'USER_DENIED';

  // 配置缺失（开发者未在 mp 后台声明）
  if (errno === 112 || errno === 1025 || errno === 1026) return 'NOT_CONFIGURED';
  if (
    /scope is not declared/i.test(msg) ||
    /announce your privacy usage/i.test(msg) ||
    /api banned/i.test(msg) ||
    /not configured/i.test(msg) ||
    /privacy pop-up feature/i.test(msg)
  ) {
    return 'NOT_CONFIGURED';
  }

  return 'UNKNOWN';
}
