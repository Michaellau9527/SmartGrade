/**
 * P1-8 focused test — 通知 schoolId 归属
 *
 * 验证点：
 * 1. pickNoticeSchoolId：唯一学校解析 / 去重 / 歧义与空值 fail-closed；
 * 2. isSchoolWideRole：与 P1-1 同口径（仅 ADMIN/POLITICAL）；
 * 3. resolveFallbackSchoolId：全校角色仅在「全库恰好一所学校」时兜底；
 * 4. 控制器行为（mock Prisma，无真实 DB）：
 *    - create 解析不到学校 → 400（绝不写空串 schoolId）；
 *    - create 解析成功 → AuthorizationContext.organization.schoolId 为真实学校；
 *    - list 解析不到学校 → 返回空数组；
 *    - list 解析成功 → 查询 where 含 schoolId 过滤。
 *
 * 运行：node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/notice-school.idor.ts
 */

import { pickNoticeSchoolId, isSchoolWideRole, resolveFallbackSchoolId } from '../src/modules/notice/notice-school.util';
import { NoticeController } from '../src/modules/notice/notice.controller';
import type { CurrentUserPayload } from '../src/common/types';

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

function makeUser(roles: string[]): CurrentUserPayload {
  return {
    id: 42,
    teacherNo: 'T0042',
    name: '测试教师',
    roles,
    permissions: [],
    dataScope: { type: 'CLASS', classId: 'cls-1', classIds: ['cls-1'] },
  };
}

console.log('\n===== 1. pickNoticeSchoolId =====');

check('单条班级关系 → 返回该学校', pickNoticeSchoolId(['S1'], []) === 'S1');
check('多条班级关系同一学校 → 去重后返回', pickNoticeSchoolId(['S1', 'S1', 'S1'], []) === 'S1');
check('班级+年级关系同一学校 → 返回', pickNoticeSchoolId(['S1'], ['S1']) === 'S1');
check('无任何关系 → null（fail-closed）', pickNoticeSchoolId([], []) === null);
check('空值数组 → null', pickNoticeSchoolId([null, undefined, ''], [null]) === null);
check('空白字符串被忽略，剩唯一有效值 → 返回', pickNoticeSchoolId(['  ', 'S1'], ['']) === 'S1');
check('跨校歧义（两个不同学校）→ null（不猜）', pickNoticeSchoolId(['S1'], ['S2']) === null);
check('跨校歧义（仅班级关系内部冲突）→ null', pickNoticeSchoolId(['S1', 'S2'], []) === null);
check('前后空白会被 trim', pickNoticeSchoolId([' S1 '], []) === 'S1');

console.log('\n===== 2. isSchoolWideRole =====');

check('ROLE_ADMIN → true', isSchoolWideRole(['ROLE_ADMIN']) === true);
check('ROLE_POLITICAL → true', isSchoolWideRole(['ROLE_POLITICAL']) === true);
check('ROLE_HEADMASTER → false', isSchoolWideRole(['ROLE_HEADMASTER']) === false);
check('ROLE_DORM_MANAGER → false（宿管非全校角色）', isSchoolWideRole(['ROLE_DORM_MANAGER']) === false);
check('ROLE_SUBJECT_TEACHER → false', isSchoolWideRole(['ROLE_SUBJECT_TEACHER']) === false);
check('混合角色含 ADMIN → true', isSchoolWideRole(['ROLE_HEADMASTER', 'ROLE_ADMIN']) === true);
check('空角色列表 → false', isSchoolWideRole([]) === false);

console.log('\n===== 3. resolveFallbackSchoolId =====');

check('非全校角色 + 1 校 → 不兜底 null', resolveFallbackSchoolId(false, 1, 'S1') === null);
check('全校角色 + 恰好 1 校 → 返回该校', resolveFallbackSchoolId(true, 1, 'S1') === 'S1');
check('全校角色 + 2 校 → null（多校不猜）', resolveFallbackSchoolId(true, 2, 'S1') === null);
check('全校角色 + 0 校 → null', resolveFallbackSchoolId(true, 0, null) === null);
check('全校角色 + 1 校但 id 空白 → null', resolveFallbackSchoolId(true, 1, '   ') === null);

console.log('\n===== 4. 控制器行为（mock Prisma）=====');

function makeFakePrisma(opts: {
  classSchoolIds: Array<string | null>;
  gradeSchoolIds: Array<string | null>;
  schools: string[];
  noticeWhere?: (w: Record<string, unknown>) => void;
}) {
  return {
    teacherClassRelation: {
      findMany: async () => opts.classSchoolIds.map((s) => ({ class: s ? { schoolId: s } : null })),
    },
    grade: {
      findMany: async () => opts.gradeSchoolIds.map((s) => ({ schoolId: s })),
    },
    school: {
      findMany: async () => opts.schools.map((id) => ({ id })),
    },
    notice: {
      findMany: async (args: any) => {
        opts.noticeWhere?.(args.where);
        return [];
      },
    },
  } as any;
}

function makeController(prisma: any) {
  const captured: { ctx?: any } = {};
  const noticeService = {
    createNotice: async (_body: any, ctx: any) => {
      captured.ctx = ctx;
      return { id: 'n1' };
    },
  };
  const controller = new NoticeController(noticeService as any, prisma);
  return { controller, captured };
}

async function runControllerTests() {
  // 4.1 create：教师有班级关系 → ctx 带真实 schoolId
  {
    const prisma = makeFakePrisma({ classSchoolIds: ['S1'], gradeSchoolIds: [], schools: [] });
    const { controller, captured } = makeController(prisma);
    await controller.create({ title: 't', content: 'c', noticeType: 'NOTICE', targets: [] } as any, makeUser(['ROLE_HEADMASTER']));
    check('create（有班级关系）→ ctx.organization.schoolId = S1', captured.ctx?.authorization?.organization?.schoolId === 'S1');
  }

  // 4.2 create：解析不到学校 → 400，且不调用 createNotice
  {
    const prisma = makeFakePrisma({ classSchoolIds: [], gradeSchoolIds: [], schools: [] });
    let called = false;
    const noticeService = { createNotice: async () => { called = true; return {}; } };
    const controller = new NoticeController(noticeService as any, prisma);
    let httpStatus: number | null = null;
    let httpMessage = '';
    try {
      await controller.create({ title: 't', content: 'c', noticeType: 'NOTICE', targets: [] } as any, makeUser(['ROLE_SUBJECT_TEACHER']));
    } catch (e: any) {
      httpStatus = e?.status ?? null;
      httpMessage = e?.message ?? String(e);
    }
    check('create（无关系普通教师）→ 抛 400', httpStatus === 400, `status=${httpStatus}`);
    check('create（无关系普通教师）→ 未写库（createNotice 未被调用）', called === false);
    check('create 错误文案不泄露内部结构', httpMessage.length > 0 && !/prisma|database|sql/i.test(httpMessage));
  }

  // 4.3 create：ADMIN 无关系 + 全库恰好 1 校 → 单校兜底
  {
    const prisma = makeFakePrisma({ classSchoolIds: [], gradeSchoolIds: [], schools: ['S-ONLY'] });
    const { controller, captured } = makeController(prisma);
    await controller.create({ title: 't', content: 'c', noticeType: 'NOTICE', targets: [] } as any, makeUser(['ROLE_ADMIN']));
    check('create（ADMIN 无关系 + 唯一学校）→ schoolId = S-ONLY', captured.ctx?.authorization?.organization?.schoolId === 'S-ONLY');
  }

  // 4.4 create：ADMIN 无关系 + 多校 → 400（多校不猜）
  {
    const prisma = makeFakePrisma({ classSchoolIds: [], gradeSchoolIds: [], schools: ['S1', 'S2'] });
    const noticeService = { createNotice: async () => ({}) };
    const controller = new NoticeController(noticeService as any, prisma);
    let httpStatus: number | null = null;
    try {
      await controller.create({ title: 't', content: 'c', noticeType: 'NOTICE', targets: [] } as any, makeUser(['ROLE_ADMIN']));
    } catch (e: any) {
      httpStatus = e?.status ?? null;
    }
    check('create（ADMIN 无关系 + 多校）→ 抛 400', httpStatus === 400);
  }

  // 4.5 list：解析不到学校 → 返回空数组（不查库）
  {
    const prisma = makeFakePrisma({ classSchoolIds: [], gradeSchoolIds: [], schools: [] });
    const noticeService = { createNotice: async () => ({}) };
    const controller = new NoticeController(noticeService as any, prisma);
    const result = await controller.list(makeUser(['ROLE_SUBJECT_TEACHER']));
    check('list（无关系教师）→ 返回空数组（deny-by-default）', Array.isArray(result) && result.length === 0);
  }

  // 4.6 list：解析成功 → where 含 schoolId 过滤
  {
    let whereSeen: any = null;
    const prisma = makeFakePrisma({
      classSchoolIds: ['S1'],
      gradeSchoolIds: [],
      schools: [],
      noticeWhere: (w) => { whereSeen = w; },
    });
    const noticeService = { createNotice: async () => ({}) };
    const controller = new NoticeController(noticeService as any, prisma);
    await controller.list(makeUser(['ROLE_HEADMASTER']));
    check('list（有学校归属）→ where.schoolId = S1', whereSeen?.schoolId === 'S1');
    check('list 保留既有过滤（deletedAt/status）', whereSeen?.deletedAt === null && !!whereSeen?.status);
  }

  // 4.7 list：noticeType 参数仍生效
  {
    let whereSeen: any = null;
    const prisma = makeFakePrisma({
      classSchoolIds: ['S1'],
      gradeSchoolIds: [],
      schools: [],
      noticeWhere: (w) => { whereSeen = w; },
    });
    const noticeService = { createNotice: async () => ({}) };
    const controller = new NoticeController(noticeService as any, prisma);
    await controller.list(makeUser(['ROLE_HEADMASTER']), 'URGENT');
    check('list（noticeType=URGENT）→ where.noticeType 仍生效', whereSeen?.noticeType === 'URGENT');
  }
}

runControllerTests().then(() => {
  console.log('\n========================================');
  console.log(`P1-8 notice-school 结果: ${passed} 通过, ${failed} 失败`);
  if (failures.length) {
    console.log('失败项:');
    failures.forEach((f) => console.log(f));
  }
  console.log('========================================\n');
  process.exit(failed > 0 ? 1 : 0);
});
