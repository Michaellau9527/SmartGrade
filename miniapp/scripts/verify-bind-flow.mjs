/**
 * 小程序绑定流程验证（P1-13 Gate E2）
 *
 * 背景：miniapp 目前没有 jest / 测试框架，为一个页面引入全套测试基建属于范围扩大。
 * 因此把页面流程抽成不依赖 Taro 的纯函数（src/pages/wechat-bind/flow.ts），
 * 用 Node 直接跑断言，验证**顺序与副作用边界**这类真正需要保证的行为。
 *
 * 用法（在 miniapp/ 下）：
 *   ./node_modules/.bin/tsc src/pages/wechat-bind/flow.ts \
 *     --outDir .tmp-bind-verify --rootDir src --module commonjs --target es2020 --skipLibCheck
 *   node scripts/verify-bind-flow.mjs
 *
 * 覆盖：
 *  1. 成功路径：preview → user-confirm → login → confirm → restore（严格顺序）
 *  2. 用户取消：不调用 login / confirm / restoreSession
 *  3. confirm 成功 → 必定恢复 session
 *  4. 空绑定码 → 直接抛错，不发起 preview
 *  5. preview 失败（无效/过期）→ 不继续 login / confirm
 *  6. 传给 confirm 的 code 必须来自 login 的返回值
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const compiled = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.tmp-bind-verify/pages/wechat-bind/flow.js'
);
const { runBindFlow } = require(compiled);

const TOKEN = 'BINDING_TOKEN_DEMO';
const TEACHER = { teacherId: 'T001', teacherName: '张老师' };

/** 构造一组带调用记录的依赖 */
function makeDeps(overrides = {}) {
  const calls = [];
  const deps = {
    calls,
    preview: async (token) => {
      calls.push(['preview', token]);
      return { ...TEACHER };
    },
    requestUserConfirmation: async (teacherName) => {
      calls.push(['user-confirm', teacherName]);
      return true;
    },
    login: async () => {
      calls.push(['login']);
      return { code: 'WX_CODE_FROM_LOGIN' };
    },
    confirm: async (token, code) => {
      calls.push(['confirm', token, code]);
      return { ok: true };
    },
    restoreSession: async () => {
      calls.push(['restore']);
    },
    ...overrides
  };
  return deps;
}

const results = [];
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, ok: true });
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      results.push({ name, ok: false, err });
      console.log(`  ✗ ${name}\n    ${err.message}`);
    });
}

console.log('P1-13 Gate E2: 小程序绑定流程（flow.ts）');

await check('1. 成功路径：严格按 preview → user-confirm → login → confirm → restore 执行', async () => {
  const deps = makeDeps();
  const res = await runBindFlow(TOKEN, deps);

  assert.equal(res.status, 'bound');
  assert.equal(res.teacherName, '张老师');
  assert.deepEqual(res.steps, ['preview', 'user-confirm', 'login', 'confirm', 'restore']);
  // 调用顺序（去掉参数）
  assert.deepEqual(deps.calls.map((c) => c[0]), [
    'preview',
    'user-confirm',
    'login',
    'confirm',
    'restore'
  ]);
});

await check('2. 用户取消：绝不调用 login / confirm / restoreSession', async () => {
  const deps = makeDeps();
  // 覆盖实现仍需记调用，否则断言失去意义
  deps.requestUserConfirmation = async (teacherName) => {
    deps.calls.push(['user-confirm', teacherName]);
    return false;
  };
  const res = await runBindFlow(TOKEN, deps);

  assert.equal(res.status, 'cancelled');
  assert.deepEqual(res.steps, ['preview', 'user-confirm']);
  assert.deepEqual(deps.calls.map((c) => c[0]), ['preview', 'user-confirm']);
});

await check('3. confirm 成功 → 必定恢复 session（restoreSession 被调用）', async () => {
  const deps = makeDeps();
  await runBindFlow(TOKEN, deps);
  assert.ok(
    deps.calls.some((c) => c[0] === 'restore'),
    'restoreSession 未被调用'
  );
});

await check('4. 空绑定码 → 直接抛错，不发起 preview', async () => {
  const deps = makeDeps();
  await assert.rejects(() => runBindFlow('   ', deps), /绑定码/);
  assert.equal(deps.calls.length, 0);
});

await check('5. preview 失败（无效/过期）→ 不继续 login / confirm', async () => {
  const deps = makeDeps();
  deps.preview = async (token) => {
    deps.calls.push(['preview', token]);
    throw new Error('绑定码无效或已失效');
  };
  await assert.rejects(() => runBindFlow(TOKEN, deps), /绑定码无效或已失效/);
  assert.deepEqual(deps.calls.map((c) => c[0]), ['preview']);
});

await check('6. 传给 confirm 的 code 来自 login 返回值，token 来自入参', async () => {
  const deps = makeDeps();
  await runBindFlow(`  ${TOKEN}  `, deps); // 前后空白应被 trim
  const confirmCall = deps.calls.find((c) => c[0] === 'confirm');
  assert.deepEqual(confirmCall, ['confirm', TOKEN, 'WX_CODE_FROM_LOGIN']);
});

const failed = results.filter((r) => !r.ok);
console.log(
  `\nTest Suites: 1 ${failed.length ? 'failed' : 'passed'}, 1 total\n` +
    `Tests: ${results.length - failed.length} passed, ${results.length} total`
);
if (failed.length) process.exit(1);
