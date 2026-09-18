/**
 * P0-4 (B6) IDOR 验证脚本
 * ---------------------------------------------------------------------------
 * 验证 student.service 的 checkDataScopeAccess 在「单条操作」(findOne/update/remove/
 * setDormitory) 中按真实数据范围隔离，重点修复 GRADE（年级主任）分支此前为空实现
 * 导致的越权/IDOR 漏洞：
 *   - 修复前：年级主任可访问/修改/删除任意年级的任意学生（仅 list 受过滤，单条不受限）
 *   - 修复后：年级主任仅能访问本年级学生，跨年级访问抛 NotFoundException
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only \
 *     -r ./test/_tsconfig_paths_shim.js ./test/student-datascope.idor.ts
 *
 * 退出码 0 = 全部通过；非 0 = 存在越权。
 */
import assert from 'assert';
import { NotFoundException } from '@nestjs/common';
import { StudentService } from '../src/modules/student/student.service';

type ScopeType = 'ALL' | 'GRADE' | 'CLASS' | 'DORM' | 'SELF';

function makeUser(type: ScopeType, opts: { gradeId?: string; classId?: string; classIds?: string[] } = {}) {
  return {
    id: 'u_test',
    name: 'tester',
    roles: [],
    permissions: [],
    dataScope: {
      type,
      gradeId: opts.gradeId,
      classId: opts.classId,
      classIds: opts.classIds,
    },
  } as any;
}

function makeStudent(over: Partial<any> = {}) {
  return {
    id: 's_1',
    name: '张三',
    studentNo: 'S2024001',
    classId: 'class_A',
    gradeId: 'grade_A',
    boardingType: 'DAY_STUDENT',
    ...over,
  };
}

/** 构造一个只满足 findOne 所需的最小 mock Prisma */
function makeService(student: any) {
  const prisma: any = {
    student: {
      findUnique: async () => student,
      findMany: async () => [],
      count: async () => 0,
      create: async () => student,
      update: async () => student,
    },
    leaveRecord: { count: async () => 0 },
    timelineEvent: { count: async () => 0 },
  };
  return new StudentService(prisma);
}

let passed = 0;
let failed = 0;

async function expectNoThrow(label: string, fn: () => any) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    failed += 1;
    console.log(`  ✗ ${label} —— 预期放行，却抛错: ${(e as Error).message}`);
  }
}

async function expectThrow(label: string, fn: () => any) {
  try {
    await fn();
    failed += 1;
    console.log(`  ✗ ${label} —— 预期拦截(抛错)，却放行了（越权!）`);
  } catch (e) {
    if (e instanceof NotFoundException) {
      passed += 1;
      console.log(`  ✓ ${label} —— 已拦截: ${(e as NotFoundException).message}`);
    } else {
      failed += 1;
      console.log(`  ✗ ${label} —— 抛错类型不符: ${(e as Error).message}`);
    }
  }
}

async function main() {
  console.log('\n[IDOR] 学生数据范围隔离验证 (P0-4 / B6)\n');

  console.log('GRADE（年级主任）：');
  {
    const svc = makeService(makeStudent({ gradeId: 'grade_A', classId: 'class_A' }));
    await expectNoThrow('本年级学生 → 放行', () =>
      svc.findOne('s_1', makeUser('GRADE', { gradeId: 'grade_A' })),
    );
    await expectThrow('跨年级学生 → 拦截 (IDOR)', () =>
      svc.findOne('s_1', makeUser('GRADE', { gradeId: 'grade_B' })),
    );
  }

  console.log('CLASS（班主任）：');
  {
    const svc = makeService(makeStudent({ gradeId: 'grade_A', classId: 'class_A' }));
    await expectNoThrow('本班学生 → 放行', () =>
      svc.findOne('s_1', makeUser('CLASS', { classId: 'class_A' })),
    );
    await expectThrow('外班学生 → 拦截', () =>
      svc.findOne('s_1', makeUser('CLASS', { classId: 'class_B' })),
    );
  }

  console.log('DORM（宿管）：');
  {
    const svcBoard = makeService(makeStudent({ boardingType: 'BOARDING' }));
    const svcDay = makeService(makeStudent({ boardingType: 'DAY_STUDENT' }));
    await expectNoThrow('住宿生 → 放行', () => svcBoard.findOne('s_1', makeUser('DORM')));
    await expectThrow('走读生 → 拦截', () => svcDay.findOne('s_1', makeUser('DORM')));
  }

  console.log('SELF（任课教师，无授课班级）：');
  {
    const svc = makeService(makeStudent({ gradeId: 'grade_A' }));
    await expectThrow('无授课班级 → 拦截', () => svc.findOne('s_1', makeUser('SELF')));
  }

  console.log('ALL（管理员/政教）：');
  {
    const svc = makeService(makeStudent({ gradeId: 'grade_X' }));
    await expectNoThrow('任意学生 → 放行', () => svc.findOne('s_1', makeUser('ALL')));
  }

  console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项`);
  if (failed > 0) {
    console.error(`\n❌ 存在数据范围越权，P0-4 未达标`);
    process.exit(1);
  }
  console.log(`\n✅ 数据范围隔离生效，IDOR 已修复`);
  process.exit(0);
}

main().catch((e) => {
  console.error('测试运行异常:', e);
  process.exit(2);
});
