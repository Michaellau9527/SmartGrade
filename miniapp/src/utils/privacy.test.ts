/**
 * P1-9 focused test — 隐私授权失败分类（纯函数，Node 可跑）
 *
 * 验证 classifyPrivacyFail 对微信 requirePrivacyAuthorize 的 fail 结果分类：
 * - 用户拒绝（errno 103/104、errMsg「privacy permission is not ...」）→ USER_DENIED
 * - 配置缺失（errno 112/1025/1026、scope not declared / api banned 等）→ NOT_CONFIGURED
 * - 无法归类 → UNKNOWN
 *
 * 运行：node_modules/ts-node/dist/bin.js --transpile-only ./src/utils/privacy.test.ts
 */

import { classifyPrivacyFail } from './privacy.util';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = `  ❌ ${name}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(msg);
  }
}

console.log('\n===== 用户拒绝（应分类为 USER_DENIED）=====');

check('errno=104 → USER_DENIED', classifyPrivacyFail({ errMsg: 'requirePrivacyAuthorize:fail privacy permission is not authorized', errno: 104 }) === 'USER_DENIED');
check('errno=103（耦合弹窗拒绝）→ USER_DENIED', classifyPrivacyFail({ errMsg: 'fail', errno: 103 }) === 'USER_DENIED');
check('errMsg 含 privacy permission is not authorized → USER_DENIED', classifyPrivacyFail({ errMsg: 'requirePrivacyAuthorize:fail privacy permission is not authorized' }) === 'USER_DENIED');
check('间隔期场景 in gap → USER_DENIED', classifyPrivacyFail({ errMsg: 'requirePrivacyAuthorize:fail privacy permission is not authorized in gap' }) === 'USER_DENIED');
check('errno 在 errMsg 字符串里（104）→ USER_DENIED', classifyPrivacyFail({ errMsg: 'requirePrivacyAuthorize:fail errno: 104 privacy permission is not authorized' }) === 'USER_DENIED');

console.log('\n===== 配置缺失（应分类为 NOT_CONFIGURED，保留容错）=====');

check('errno=112（接口未声明）→ NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'A:fail api scope is not declared in the privacy agreement', errno: 112 }) === 'NOT_CONFIGURED');
check('errno=1025 → NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'fail', errno: 1025 }) === 'NOT_CONFIGURED');
check('errno=1026 → NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'fail', errno: 1026 }) === 'NOT_CONFIGURED');
check('api banned → NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'A:fail appid privacy api banned' }) === 'NOT_CONFIGURED');
check('scope is not declared → NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'A:fail api scope is not declared in the privacy agreement' }) === 'NOT_CONFIGURED');
check('announce your privacy usage → NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'fail please go to mp to announce your privacy usage' }) === 'NOT_CONFIGURED');
check('privacy pop-up feature（未实现弹窗）→ NOT_CONFIGURED', classifyPrivacyFail({ errMsg: 'fail please implement the privacy pop-up feature' }) === 'NOT_CONFIGURED');

console.log('\n===== 无法归类 / 空（应分类为 UNKNOWN，保守容错）=====');

check('空 res → UNKNOWN', classifyPrivacyFail(null) === 'UNKNOWN');
check('undefined → UNKNOWN', classifyPrivacyFail(undefined) === 'UNKNOWN');
check('无 errno 无关键词 → UNKNOWN', classifyPrivacyFail({ errMsg: 'requirePrivacyAuthorize:fail timeout' }) === 'UNKNOWN');
check('errno=0 → UNKNOWN', classifyPrivacyFail({ errMsg: 'fail', errno: 0 }) === 'UNKNOWN');
check('errno=其他（如 500）→ UNKNOWN', classifyPrivacyFail({ errMsg: 'fail', errno: 500 }) === 'UNKNOWN');

console.log('\n========================================');
console.log(`P1-9 privacy 分类结果: ${passed} 通过, ${failed} 失败`);
if (failures.length) {
  console.log('失败项:');
  failures.forEach((f) => console.log(f));
}
console.log('========================================\n');
process.exit(failed > 0 ? 1 : 0);
