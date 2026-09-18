/**
 * P1-1 收口验证：工作台「全校可见」判定不得因「无班级/年级关系」而兜底成全校。
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/workbench-scope.idor.ts
 *
 * 不依赖数据库，仅验证 computeWorkbenchSchoolWide 的纯逻辑 + 数据范围兜底语义。
 */
import { computeWorkbenchSchoolWide } from '../src/modules/workbench/workbench.controller';
import { RoleCode } from '@smartgrade/shared/enums/RoleCode';

let passed = 0;
let failed = 0;

function expectFlag(
  label: string,
  actual: boolean,
  expected: boolean,
): void {
  if (actual === expected) {
    passed += 1;
    console.log(`  ✓ ${label} → ${actual}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label} → 实际 ${actual}，期望 ${expected}`);
  }
}

console.log('P1-1 工作台全校可见判定：');

// 1. ADMIN / POLITICAL 始终全校可见
expectFlag('ROLE_ADMIN → SCHOOL_WIDE', computeWorkbenchSchoolWide([RoleCode.ROLE_ADMIN]), true);
expectFlag('ROLE_POLITICAL → SCHOOL_WIDE', computeWorkbenchSchoolWide([RoleCode.ROLE_POLITICAL]), true);
expectFlag(
  'ROLE_ADMIN + ROLE_HEADMASTER → SCHOOL_WIDE',
  computeWorkbenchSchoolWide([RoleCode.ROLE_ADMIN, RoleCode.ROLE_HEADMASTER]),
  true,
);

// 2. 其他角色即便没有任何班级/年级关系，也绝不能成为全校
expectFlag('ROLE_HEADMASTER → 非全校', computeWorkbenchSchoolWide([RoleCode.ROLE_HEADMASTER]), false);
expectFlag('ROLE_GRADE_DIRECTOR → 非全校', computeWorkbenchSchoolWide([RoleCode.ROLE_GRADE_DIRECTOR]), false);
expectFlag('ROLE_DORM_MANAGER → 非全校', computeWorkbenchSchoolWide([RoleCode.ROLE_DORM_MANAGER]), false);
expectFlag('ROLE_SUBJECT_TEACHER → 非全校', computeWorkbenchSchoolWide([RoleCode.ROLE_SUBJECT_TEACHER]), false);

// 3. 关键回归守卫：普通任课教师「无班级关系 + 无年级关系」绝不能等于全校
//    （这是 P1-1 修复前的真实漏洞：isSchoolWide = ... || (classIds.length===0 && gradeIds.length===0)）
expectFlag(
  '无角色的普通教师 → 非全校（deny by default）',
  computeWorkbenchSchoolWide([]),
  false,
);

// 4. 多种非管理员角色组合也不应全校
expectFlag(
  'HEADMASTER + SUBJECT_TEACHER → 非全校',
  computeWorkbenchSchoolWide([RoleCode.ROLE_HEADMASTER, RoleCode.ROLE_SUBJECT_TEACHER]),
  false,
);

console.log('');
console.log(`结果：${passed} passed / ${failed} failed`);
if (failed > 0) {
  console.error('❌ P1-1 验证未通过');
  process.exit(1);
}
console.log('✅ P1-1 验证全部通过');
