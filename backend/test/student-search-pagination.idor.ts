/**
 * P1-6 学生搜索 + 分页 —— 逻辑层单测（无框架 / 无 DB）
 *
 * 覆盖：
 *  - 搜索关键词规范化（sanitizeStudentKeyword）
 *  - 分页参数推导（computeStudentListPagination）
 *
 * 运行：
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/student-search-pagination.idor.ts
 */

import {
  sanitizeStudentKeyword,
  computeStudentListPagination,
  STUDENT_KEYWORD_MAX_LEN,
} from '../src/modules/student/student-query.util';

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

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

console.log('\n=== [搜索] sanitizeStudentKeyword ===');
check('null → 无搜索(null)', sanitizeStudentKeyword(null) === null);
check('undefined → 无搜索(null)', sanitizeStudentKeyword(undefined) === null);
check('纯空白 "   " → 无搜索(null)', sanitizeStudentKeyword('   ') === null);
check('前后空白被 trim (" 张三 ") → "张三"', sanitizeStudentKeyword(' 张三 ') === '张三');
check(
  '恰好 64 字符 → 原样返回',
  sanitizeStudentKeyword('a'.repeat(STUDENT_KEYWORD_MAX_LEN)) === 'a'.repeat(STUDENT_KEYWORD_MAX_LEN),
);
check(
  '65 字符 → 抛错（防超长）',
  throws(() => sanitizeStudentKeyword('a'.repeat(STUDENT_KEYWORD_MAX_LEN + 1))),
);
check('非字符串数字 → 无搜索(null)', sanitizeStudentKeyword(12345 as unknown) === null);
check('空串 "" → 无搜索(null)', sanitizeStudentKeyword('') === null);

console.log('\n=== [分页] computeStudentListPagination ===');
{
  const d = computeStudentListPagination();
  check('缺省 → page=1', d.page === 1, d);
  check('缺省 → pageSize=100（修复 C10 默认 20 截断）', d.pageSize === 100, d);
  check('缺省 → skip=0', d.skip === 0, d);
  check('缺省 → take=100', d.take === 100, d);
}
{
  const p = computeStudentListPagination(3, 20);
  check('page=3,pageSize=20 → skip=40', p.skip === 40, p);
  check('page=3,pageSize=20 → take=20', p.take === 20, p);
  check('page=3,pageSize=20 → page=3', p.page === 3, p);
}
{
  const c = computeStudentListPagination(1, 200);
  check('pageSize=200 被硬上限夹到 100', c.pageSize === 100, c);
  check('pageSize=200 → take=100', c.take === 100, c);
}
{
  const bad = computeStudentListPagination(0, 20);
  check('page=0（无效）→ 归正为 page=1', bad.page === 1, bad);
  check('page=0 → skip=0', bad.skip === 0, bad);
}
{
  const bad2 = computeStudentListPagination(2, 0);
  check('pageSize=0（无效）→ 归正为默认 100', bad2.pageSize === 100, bad2);
}
{
  const frac = computeStudentListPagination(2.7, 20.9);
  check('小数 page 向下取整 → page=2', frac.page === 2, frac);
  check('小数 pageSize 向下取整 → pageSize=20', frac.pageSize === 20, frac);
}

console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===`);
if (failed > 0) {
  console.log('失败项：', failures.join('; '));
  process.exit(1);
}
console.log('✅ P1-6 学生搜索+分页 逻辑层全部通过');
