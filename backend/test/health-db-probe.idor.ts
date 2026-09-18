/**
 * P1-4 收口验证：/health/db readiness 探针必须在 DB 不可用时 fail-closed 返回 503，
 * 而不是把 DB 故障吞成 HTTP 200（旧实现把错误包进 body 却返回 200，导致编排误判健康）。
 *
 * 运行：
 *   cd backend
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/health-db-probe.idor.ts
 *
 * 不依赖真实数据库：用 stub 拦截 Prisma $queryRaw 模拟「DB 正常 / DB 故障」，
 * 验证 (1) HealthService 层对故障只返回 error body 不抛异常、
 * (2) HealthController 层据此设置正确的 HTTP status（200 / 503）。
 * 注：这是模拟故障验证，非真实 CynosDB 故障验证（见报告「真实环境验证」一节）。
 */
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

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

/** 模拟 Prisma：$queryRaw 是 tagged template，正常解析 / 故障 reject。
 *  故障消息故意带上内网 DB 地址，用于验证脱敏（不泄露到响应体）。 */
function makePrisma(ok: boolean): any {
  const internalUrl =
    'sh-cynosdbmysql-grp-pfljni8i.sql.tencentcdb.com:3306';
  return {
    $queryRaw: (_strings: unknown) =>
      ok
        ? Promise.resolve([{ '?column?': 1 }])
        : Promise.reject(
            new Error(
              `Error: P1001: Can't reach database server at ${internalUrl}`,
            ),
          ),
  };
}

/** 模拟 express Response（passthrough 模式只关心 status 设置）。 */
function makeRes(): any {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  return res;
}

async function main(): Promise<void> {
  console.log('P1-4 /health/db readiness 探针（模拟故障，无真实 DB）：');

  // ---------- 1. HealthService 层：DB 正常 → status 'ok'，且不抛异常 ----------
  {
    const svc = new HealthService(makePrisma(true));
    const r = await svc.checkDatabase();
    check('DB 正常 → 服务返回 status=ok', r.status === 'ok', r.status);
    check('DB 正常 → database=connected', r.database === 'connected', r.database);
  }

  // ---------- 2. HealthService 层：DB 故障 → status 'error'，且不抛异常（不转 200） ----------
  {
    const svc = new HealthService(makePrisma(false));
    let threw = false;
    let r: any;
    try {
      r = await svc.checkDatabase();
    } catch (e) {
      threw = true;
      console.log(`    (service threw: ${(e as Error).message})`);
    }
    check('DB 故障 → 服务不抛异常（交由 controller 设 503，而非被 filter 转成业务 500）', !threw);
    check('DB 故障 → 服务返回 status=error', r && r.status === 'error', r && r.status);
    check(
      'DB 故障 → 响应体已脱敏（不含内网 DB 地址/端口）',
      r && !String(r.error ?? '').includes('tencentcdb') && !String(r.error ?? '').includes(':3306'),
      r && String(r.error ?? '').slice(0, 40),
    );
  }

  // ---------- 3. HealthController 层：DB 正常 → HTTP 200 ----------
  {
    const okService = {
      checkDatabase: () =>
        Promise.resolve({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() }),
    } as any;
    const ctrl = new HealthController(okService);
    const res = makeRes();
    let threw = false;
    let body: any;
    try {
      body = await ctrl.checkDatabase(res);
    } catch (e) {
      threw = true;
      console.log(`    (controller threw: ${(e as Error).message})`);
    }
    check('DB 正常 → controller 不抛异常', !threw);
    check('DB 正常 → HTTP status = 200', res.statusCode === 200, String(res.statusCode));
    check('DB 正常 → 返回健康 body (status=ok)', body && body.status === 'ok');
  }

  // ---------- 4. HealthController 层：DB 故障 → HTTP 503（fail-closed） ----------
  {
    const errService = {
      checkDatabase: () =>
        Promise.resolve({
          status: 'error',
          database: 'disconnected',
          error: '数据服务暂时不可用，请检查数据库实例状态',
          timestamp: new Date().toISOString(),
        }),
    } as any;
    const ctrl = new HealthController(errService);
    const res = makeRes();
    let threw = false;
    let body: any;
    try {
      body = await ctrl.checkDatabase(res);
    } catch (e) {
      threw = true;
      console.log(`    (controller threw: ${(e as Error).message})`);
    }
    check('DB 故障 → controller 不抛异常（不经 AllExceptionsFilter / 不产生 50000 业务错误）', !threw);
    check('DB 故障 → HTTP status = 503（fail-closed，不再是 200）', res.statusCode === 503, String(res.statusCode));
    check('DB 故障 → 仍是健康探针 body (status=error)，而非业务错误体', body && body.status === 'error' && !('code' in body), body && body.status);
    check('DB 故障 → 503 且未泄露为 200', res.statusCode !== 200, `status=${res.statusCode}`);
  }

  console.log('');
  console.log(`结果：${passed} passed / ${failed} failed`);
  if (failed > 0) {
    console.error('❌ P1-4 验证未通过');
    process.exit(1);
  }
  console.log('✅ P1-4 验证全部通过（模拟故障）');
}

main().catch((e) => {
  console.error('测试运行异常：', e);
  process.exit(1);
});
