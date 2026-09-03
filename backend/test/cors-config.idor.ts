/**
 * P1-2 收口验证：CORS 来源白名单解析不得在生产环境形成 wildcard + credentials 暴露。
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/cors-config.idor.ts
 *
 * 不依赖数据库 / 不启动 HTTP 服务，仅验证 resolveCorsConfig 的纯逻辑。
 */
import { resolveCorsConfig } from '../src/common/security/cors';

let passed = 0;
let failed = 0;

function expect(
  label: string,
  actual: unknown,
  expected: unknown,
): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed += 1;
    console.log(`  ✓ ${label} → ${actualStr}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label} → 实际 ${actualStr}，期望 ${expectedStr}`);
  }
}

function expectNotWildcardInProd(label: string, cfg: ReturnType<typeof resolveCorsConfig>): void {
  // 生产环境安全红线：origin 不得为字面 '*' 或反射式 true（避免与 credentials:true 形成暴露）
  const safe = !(cfg.origin === '*' || cfg.origin === true);
  if (safe) {
    passed += 1;
    console.log(`  ✓ ${label} → origin=${JSON.stringify(cfg.origin)} 未使用 wildcard（安全）`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label} → 生产环境出现 origin=${JSON.stringify(cfg.origin)} + credentials:true 的危险组合！`);
  }
}

console.log('P1-2 CORS 配置解析：');

// 1. 显式白名单（生产）→ 允许明确 Origin，credentials:true
expect(
  '生产 + CORS_ORIGIN=单域名 → 白名单',
  resolveCorsConfig('https://admin.smartgrade.com', true),
  { origin: ['https://admin.smartgrade.com'], credentials: true },
);
expect(
  '生产 + CORS_ORIGIN=多域名 → 白名单',
  resolveCorsConfig('https://a.com, https://b.com ', true),
  { origin: ['https://a.com', 'https://b.com'], credentials: true },
);
expectNotWildcardInProd('生产 + 多域名白名单', resolveCorsConfig('https://a.com,https://b.com', true));

// 2. 未配置 / 通配（生产）→ deny by default，绝不使用 wildcard
expect(
  '生产 + CORS_ORIGIN 未配置 → 空白名单(deny)',
  resolveCorsConfig(undefined, true),
  { origin: [], credentials: true },
);
expect(
  '生产 + CORS_ORIGIN=* → 空白名单(deny)',
  resolveCorsConfig('*', true),
  { origin: [], credentials: true },
);
expectNotWildcardInProd('生产 + 未配置', resolveCorsConfig(undefined, true));
expectNotWildcardInProd('生产 + *', resolveCorsConfig('*', true));

// 3. 开发环境保留便利（反射请求源），非生产不强制白名单
expect(
  '开发 + 未配置 → 反射请求源(origin:true)',
  resolveCorsConfig(undefined, false),
  { origin: true, credentials: true },
);
expect(
  '开发 + * → 反射请求源(origin:true)',
  resolveCorsConfig('*', false),
  { origin: true, credentials: true },
);

// 4. 仅空白符（生产）→ 视为未配置 → deny
expect(
  '生产 + CORS_ORIGIN=仅空白 → deny',
  resolveCorsConfig('   ', true),
  { origin: [], credentials: true },
);

console.log('');
console.log(`结果：${passed} passed / ${failed} failed`);
if (failed > 0) {
  console.error('❌ P1-2 验证未通过');
  process.exit(1);
}
console.log('✅ P1-2 验证全部通过');
