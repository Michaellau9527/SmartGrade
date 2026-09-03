/**
 * CORS 配置解析（P1-2 收口）
 *
 * 设计原则（与 P0 安全纪律一致，最小修改、deny by default）：
 * - 显式配置 CORS_ORIGIN（逗号分隔、且非 '*'）→ 视为明确白名单，允许带凭证（credentials: true）
 * - 未配置或为 '*'：
 *     · 非生产环境 → 反射请求源（origin: true）+ credentials（本地开发便利，≠ 字面 '*'）
 *     · 生产环境   → deny by default：空白名单，拒绝一切跨域，避免带凭证数据被任意站点读取
 *       说明：微信小程序 wx.request 不走浏览器 CORS，不受影响；
 *             Web 管理后台需在云托管环境显式配置 CORS_ORIGIN 后方可跨域访问
 *
 * 安全红线：生产环境严禁 origin: '*'（或反射式 origin: true）与 credentials: true 同时使用。
 */
export interface CorsConfig {
  origin: boolean | string | string[];
  credentials: boolean;
}

export function resolveCorsConfig(
  corsOriginEnv: string | undefined,
  isProd: boolean,
): CorsConfig {
  const raw = (corsOriginEnv ?? '').trim();
  const isWildcard = raw === '' || raw === '*';

  if (!isWildcard) {
    const allowList = raw.split(',').map((o) => o.trim()).filter(Boolean);
    if (allowList.length > 0) {
      return { origin: allowList, credentials: true };
    }
    // 配置了但解析为空（如仅空白符）→ 当作未配置处理
  }

  if (!isProd) {
    // 开发/测试：保留便利（反射请求 Origin，配合 credentials 不会触发浏览器 '*'+credentials 限制）
    return { origin: true, credentials: true };
  }

  // 生产环境：严禁 wildcard + credentials。未配置明确白名单时 deny by default。
  return { origin: [], credentials: true };
}
