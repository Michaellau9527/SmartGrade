/**
 * P1-5 收口验证：seed 管理员密码必须强制通过 SMARTGRADE_ADMIN_PASSWORD 提供，
 * 禁止任何硬编码默认弱口令（旧实现回退到 'SmartGrade@2025'，等于公开后门）。
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/seed-admin-password.idor.ts
 *
 * 不依赖数据库 / 不触发 seed 主流程：仅验证纯函数 resolveAdminPassword 的缺省校验。
 * 注：这是逻辑层单元验证，非真实 seed 执行验证（见报告「真实环境验证」一节）。
 */
import { resolveAdminPassword } from '../prisma/seed-admin-password';

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}${detail ? ` → ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` → ${detail}` : ''}`);
  }
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

console.log('P1-5 seed 管理员密码强制（SMARTGRADE_ADMIN_PASSWORD）：');

// 1. 未设置 → 必须抛错（fail-closed，不再回退默认弱口令）
check(
  'SMARTGRADE_ADMIN_PASSWORD 缺失 → 抛错',
  throws(() => resolveAdminPassword({})),
);

// 2. 空字符串 → 必须抛错
check(
  'SMARTGRADE_ADMIN_PASSWORD 为空串 → 抛错',
  throws(() => resolveAdminPassword({ SMARTGRADE_ADMIN_PASSWORD: '' })),
);

// 3. 纯空白 → 必须抛错
check(
  'SMARTGRADE_ADMIN_PASSWORD 为纯空白 → 抛错',
  throws(() => resolveAdminPassword({ SMARTGRADE_ADMIN_PASSWORD: '   ' })),
);

// 4. 已设置 → 返回原值（覆盖生效）
const setVal = 'Str0ng!SeedPass#2026';
const got = resolveAdminPassword({ SMARTGRADE_ADMIN_PASSWORD: setVal });
check('SMARTGRADE_ADMIN_PASSWORD 已设置 → 返回该值', got === setVal, got);
check('返回值是显式设置值，而非旧默认弱口令', got !== 'SmartGrade@2025', got);

// 5. 即便“恰好等于旧默认口令”也不走 fallback 分支（只是被当作普通值返回，且只有显式设置才出现）
const explicitOld = resolveAdminPassword({ SMARTGRADE_ADMIN_PASSWORD: 'SmartGrade@2025' });
check(
  '显式设置旧口令时返回它（仅因显式，不再是静默 fallback）',
  explicitOld === 'SmartGrade@2025' && throws(() => resolveAdminPassword({})) === false ? true : explicitOld === 'SmartGrade@2025',
  explicitOld,
);

// 6. 不污染全局 process.env
check(
  '校验不依赖全局 process.env（用独立 env 对象）',
  throws(() => resolveAdminPassword({})) && resolveAdminPassword({ SMARTGRADE_ADMIN_PASSWORD: 'x' }) === 'x',
);

console.log('');
console.log(`结果：${passed} passed / ${failed} failed`);
if (failed > 0) {
  console.error('❌ P1-5 验证未通过');
  process.exit(1);
}
console.log('✅ P1-5 验证全部通过（逻辑层）');
