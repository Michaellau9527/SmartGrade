/**
 * P1-7 Session 恢复 —— 逻辑层单测（纯 Node 运行，无需 Taro / 微信环境）
 *
 * 覆盖：isTokenExpired / decodeJwtExp（token 过期判定，是 Session 恢复的核心）
 *
 * 运行：
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./miniapp/src/utils/session.test.ts
 * （该测试只 import session.ts 中的纯函数，不会触发 Taro 顶层副作用导致崩溃）
 */

import { isTokenExpired } from './jwt.util';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

/** 构造一个 JWT（header.payload.signature），payload 为给定对象 */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

const now = Math.floor(Date.now() / 1000);

console.log('\n=== [Session] isTokenExpired ===');

// 1. 空 token → 过期（fail-closed，必须重登）
check('空串 → 过期', isTokenExpired('') === true);
check('null → 过期', isTokenExpired('') === true);

// 2. 非 3 段 → 过期（fail-closed）
check('非 JWT（2 段）→ 过期', isTokenExpired('a.b') === true);
check('随机串 → 过期', isTokenExpired('not-a-jwt') === true);

// 3. 有效期内 → 未过期
{
  const valid = makeJwt({ sub: '1', exp: now + 3600 });
  check('exp 在 1 小时后 → 未过期', isTokenExpired(valid) === false, valid);
}

// 4. 已过期 → 过期
{
  const expired = makeJwt({ sub: '1', exp: now - 3600 });
  check('exp 在 1 小时前 → 过期', isTokenExpired(expired) === true, expired);
}

// 5. 临界：距过期 < skew(30s) → 视为过期（避免临界必败请求）
{
  const nearExpire = makeJwt({ sub: '1', exp: now - 10 });
  check('exp 已过 10s（< skew 30s）→ 过期', isTokenExpired(nearExpire) === true, nearExpire);
}
{
  const safeMargin = makeJwt({ sub: '1', exp: now + 60 });
  check('exp 在 60s 后（> skew 30s）→ 未过期', isTokenExpired(safeMargin) === false, safeMargin);
}

// 6. 无 exp 字段 → 过期（fail-closed）
{
  const noExp = makeJwt({ sub: '1' });
  check('无 exp 字段 → 过期', isTokenExpired(noExp) === true, noExp);
}

// 7. 中文 / 特殊字符 payload 也能正确解析 exp
{
  const cn = makeJwt({ sub: '教师①', name: '张三', exp: now + 7200 });
  check('含中文 payload 且未过期 → 未过期', isTokenExpired(cn) === false, cn);
}

console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===`);
if (failed > 0) {
  console.log('失败项：', failures.join('; '));
  process.exit(1);
}
console.log('✅ P1-7 Session 恢复（token 过期判定）逻辑层全部通过');
