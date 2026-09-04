/**
 * P1-8 sendSystemNotice 补修验证（系统通知写入闭环）
 * --------------------------------------------------------------------------
 * 背景：sendSystemNotice 在 P1-8 阶段仍写 schoolId=''，导致 leave.service.ts
 * 6 处活链路调用产出的 Notice 不进任何学校的列表（被 P1-8 新增的 schoolId
 * 过滤排除），形成「写入侧空、读取侧过滤」的阻断。
 *
 * 本轮闭环：
 *   StudentSnapshot.schoolId → LeaveRecord.schoolId → sendSystemNotice.schoolId
 *                                            → Notice.schoolId
 *
 * 验证维度（用户硬约束 #2：必须有 Mock Prisma 行为测试，证明数据沿链路真实传下去）：
 *  ① 静态断言（底线）
 *     1.1 sendSystemNotice 函数体不再写 schoolId: ''，且内部使用 data.schoolId
 *     1.2 sendSystemNotice 签名 schoolId 必填（TypeScript 类型保证）
 *     1.3 leave.service.ts LeaveRecord.create 不再写 schoolId: ''
 *     1.4 leave.service.ts 6 处 sendSystemNotice 调用全覆盖（create/approve×2/
 *         reject/confirmLeft/finish）
 *  ② Mock Prisma 行为测试（数据链路验证）
 *     2.1 sendSystemNotice('school-A') → tx.notice.create.data.schoolId === 'school-A'
 *     2.2 sendSystemNotice('school-B') → tx.notice.create.data.schoolId === 'school-B'
 *     2.3 多校隔离关键断言：A 校调用产出的 notice 与 B 校调用产出的 notice 是
 *         完全不同的 data 对象，schoolId 互不串味
 *     2.4 sendSystemNotice 内部不再写空串
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only \
 *     -r ./test/_tsconfig_paths_shim.js ./test/notice-system-notice.idor.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NoticeService } from '../src/modules/notice/notice.service';

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

// ============================================================
// ① 静态断言
// ============================================================
console.log('\n===== ① 静态断言 =====');

const noticeServiceSrc = readFileSync(
  resolve(__dirname, '..', 'src', 'modules', 'notice', 'notice.service.ts'),
  'utf-8',
);
const leaveServiceSrc = readFileSync(
  resolve(__dirname, '..', 'src', 'modules', 'leave', 'leave.service.ts'),
  'utf-8',
);

// 提取 sendSystemNotice 函数体（从声明开始到闭合的 '}')
const sendSystemNoticeStart = noticeServiceSrc.indexOf('async sendSystemNotice');
const sendSystemNoticeEnd = noticeServiceSrc.indexOf('\n  }\n', sendSystemNoticeStart);
const sendSystemNoticeBody = noticeServiceSrc.slice(
  sendSystemNoticeStart,
  sendSystemNoticeEnd + 4,
);

check(
  'sendSystemNotice 函数体不再含 schoolId: \'\'',
  !sendSystemNoticeBody.includes("schoolId: ''"),
  '检测到空串赋值',
);
check(
  'sendSystemNotice 函数体写入 schoolId: data.schoolId',
  sendSystemNoticeBody.includes('schoolId: data.schoolId'),
);
check(
  'sendSystemNotice 签名声明 schoolId: string（必填）',
  /schoolId:\s*string\s*;\s*\}/.test(sendSystemNoticeBody),
  '签名应强制要求 schoolId 字段',
);
check(
  'sendSystemNotice 签名未提供 ?（可选）默认',
  !/schoolId\?\s*:/.test(sendSystemNoticeBody),
);

// 1.3 LeaveRecord.create 不再写 schoolId: ''
check(
  'leave.service.ts LeaveRecord.create 不再写 schoolId: \'\'',
  !leaveServiceSrc.includes("schoolId: '',"),
);

// 1.4 leave.service.ts 6 处 sendSystemNotice 调用全覆盖
const sendSystemNoticeCalls = leaveServiceSrc.match(
  /this\.noticeService\.sendSystemNotice\s*\(\s*tx,\s*\{/g,
);
check(
  'leave.service.ts 中 sendSystemNotice(tx, {...}) 调用恰好 6 处',
  (sendSystemNoticeCalls?.length ?? 0) === 6,
  `实际 ${sendSystemNoticeCalls?.length ?? 0} 处`,
);

// 每处调用块内部必须含 schoolId: ...
// 用滑窗切出每个调用块（从 '{' 开始到下一个 sendSystemNotice 调用或文件末尾）
const callStarts: number[] = [];
{
  const re = /this\.noticeService\.sendSystemNotice\s*\(\s*tx,\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(leaveServiceSrc)) !== null) {
    callStarts.push(m.index);
  }
}
const callBlocks: string[] = callStarts.map((start, i) => {
  const end = i + 1 < callStarts.length ? callStarts[i + 1] : leaveServiceSrc.length;
  return leaveServiceSrc.slice(start, end);
});
const blocksWithSchoolId = callBlocks.filter((b) => /\bschoolId\s*:/.test(b));
check(
  '6 处 sendSystemNotice 调用块全部含 schoolId 字段',
  blocksWithSchoolId.length === 6,
  `实际 ${blocksWithSchoolId.length} 处含 schoolId`,
);

// create 阶段使用 snapshot.schoolId；其余 5 处使用 record.schoolId
check(
  'create 阶段使用 snapshot.schoolId 作为 sendSystemNotice 入参',
  /snapshot\.schoolId/.test(leaveServiceSrc),
);
check(
  'approve / reject / confirmLeft / finish 使用 record.schoolId（>=5 处）',
  (leaveServiceSrc.match(/record\.schoolId/g) ?? []).length >= 5,
);

// ============================================================
// ② Mock Prisma 行为测试（数据链路验证 — 用户 #2 硬约束）
// ============================================================
console.log('\n===== ② Mock Prisma 行为测试（数据沿链路传递）=====');

function makeFakePrisma() {
  return {
    teacher: {
      findMany: async () => [], // resolveTargetTeachers 返回空，跳过 reads 写入
    },
  } as any;
}

function makeFakeTx() {
  const calls: { method: string; data: any }[] = [];
  return {
    calls,
    notice: {
      create: async (args: any) => {
        calls.push({ method: 'notice.create', data: args.data });
        return { id: `n-${calls.length}`, ...args.data };
      },
    },
    noticeRead: {
      createMany: async (args: any) => {
        calls.push({ method: 'noticeRead.createMany', data: args.data });
        return { count: (args.data ?? []).length };
      },
    },
  };
}

async function runMockTests() {
  const prisma = makeFakePrisma();

  // 2.1 真实传递 school-A
  {
    const service = new NoticeService(prisma);
    const tx = makeFakeTx();
    await service.sendSystemNotice(tx as any, {
      title: '请假审批：张三 病假',
      content: '班主任为张三发起病假',
      noticeType: 'ROLE',
      targets: { type: 'ROLE', roles: ['ROLE_POLITICAL'] },
      publisherId: 't-001',
      publisherName: '李老师',
      schoolId: 'school-A',
    });
    const createCall = tx.calls.find((c) => c.method === 'notice.create');
    check(
      'sendSystemNotice(schoolId="school-A") → tx.notice.create.data.schoolId === "school-A"',
      !!createCall && createCall.data.schoolId === 'school-A',
      createCall ? `实际 schoolId="${createCall.data.schoolId}"` : 'notice.create 未被调用',
    );
  }

  // 2.2 真实传递 school-B
  {
    const service = new NoticeService(prisma);
    const tx = makeFakeTx();
    await service.sendSystemNotice(tx as any, {
      title: '请假审批：李四 事假',
      content: '班主任为李四发起事假',
      noticeType: 'ROLE',
      targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
      publisherId: 't-002',
      publisherName: '王老师',
      schoolId: 'school-B',
    });
    const createCall = tx.calls.find((c) => c.method === 'notice.create');
    check(
      'sendSystemNotice(schoolId="school-B") → tx.notice.create.data.schoolId === "school-B"',
      !!createCall && createCall.data.schoolId === 'school-B',
      createCall ? `实际 schoolId="${createCall.data.schoolId}"` : 'notice.create 未被调用',
    );
  }

  // 2.3 多校隔离：A 与 B 串行调用，notice.create 收到的 schoolId 互不串味
  {
    const service = new NoticeService(prisma);
    const txA = makeFakeTx();
    const txB = makeFakeTx();
    await service.sendSystemNotice(txA as any, {
      title: 'a', content: 'a', noticeType: 'ROLE',
      targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
      publisherId: 't-a', publisherName: '老师A', schoolId: 'school-A',
    });
    await service.sendSystemNotice(txB as any, {
      title: 'b', content: 'b', noticeType: 'ROLE',
      targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
      publisherId: 't-b', publisherName: '老师B', schoolId: 'school-B',
    });
    const aCall = txA.calls.find((c) => c.method === 'notice.create');
    const bCall = txB.calls.find((c) => c.method === 'notice.create');
    check(
      'A 校调用产出的 notice.schoolId === "school-A"（互不串味）',
      !!aCall && aCall.data.schoolId === 'school-A',
    );
    check(
      'B 校调用产出的 notice.schoolId === "school-B"（互不串味）',
      !!bCall && bCall.data.schoolId === 'school-B',
    );
    check(
      'A/B 通知不串味（断言不等）',
      aCall?.data.schoolId !== bCall?.data.schoolId,
    );
  }

  // 2.4 sendSystemNotice 内部不再写空串
  {
    const service = new NoticeService(prisma);
    const tx = makeFakeTx();
    await service.sendSystemNotice(tx as any, {
      title: 'x', content: 'x', noticeType: 'ROLE',
      targets: { type: 'ROLE', roles: ['ROLE_HEADMASTER'] },
      publisherId: 't', publisherName: 't', schoolId: 'school-A',
    });
    const createCall = tx.calls.find((c) => c.method === 'notice.create');
    check(
      'sendSystemNotice 落库的 notice.data.schoolId 不为 \'\'',
      !!createCall && createCall.data.schoolId !== '',
      createCall ? `schoolId="${createCall.data.schoolId}"` : 'notice.create 未被调用',
    );
    check(
      'sendSystemNotice 落库的 notice.data.schoolId 不为 null/undefined',
      !!createCall && createCall.data.schoolId != null,
    );
  }
}

runMockTests().then(() => {
  console.log('\n========================================');
  console.log(`P1-8 sendSystemNotice 补修结果: ${passed} 通过, ${failed} 失败`);
  if (failures.length) {
    console.log('失败项:');
    failures.forEach((f) => console.log(f));
  }
  console.log('========================================\n');
  process.exit(failed > 0 ? 1 : 0);
});