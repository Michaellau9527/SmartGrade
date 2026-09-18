/**
 * JWT 过期判定（纯函数，无 Taro / React 依赖，便于单测与在服务端复用）。
 *
 * 仅读取 payload 中的 exp（秒级时间戳），无需密钥；解析失败一律视为过期
 * （fail-closed），促使上层重新登录恢复会话。
 *
 * base64url 解码采用手写实现，不依赖运行环境的 atob，兼容 Node 与微信小程序。
 */

/** base64url → UTF-8 字符串 */
function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let binary = '';
  for (let i = 0; i < b64.length; i += 4) {
    const a = lookup.indexOf(b64[i]);
    const b = lookup.indexOf(b64[i + 1]);
    const c = lookup.indexOf(b64[i + 2]);
    const d = lookup.indexOf(b64[i + 3]);
    binary += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) binary += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== -1) binary += String.fromCharCode(((c & 3) << 6) | d);
  }
  return decodeURIComponent(escape(binary));
}

/**
 * 解析 JWT payload 中的 exp（秒级时间戳）。
 * 无法解析（非 3 段 / 非 JSON / 无 exp）→ 返回 null。
 */
export function decodeJwtExp(token: string): number | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) return null;
    const json = JSON.parse(base64UrlDecode(segments[1]));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

/**
 * token 是否已过期（fail-closed：无法解析一律视为过期）。
 * skewSeconds 给一点余量，避免临界过期瞬间仍发一次必败请求。
 */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) return true;
  return Date.now() / 1000 >= exp - skewSeconds;
}
