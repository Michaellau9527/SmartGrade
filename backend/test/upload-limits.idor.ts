/**
 * P1-3 文件上传安全限制 — focused 验证脚本
 *
 * 运行：
 *   node_modules/.bin/ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/upload-limits.idor.ts
 *
 * 不引入新依赖；复用 _tsconfig_paths_shim 解析 @/ 别名。
 *
 * 测试对象均为真实会被 FileInterceptor/FilesInterceptor 使用的配置：
 * - isAllowedUploadType（实际类型判定逻辑）
 * - createUploadFileFilter 的 fileFilter（真实回调行为）
 * - buildUploadOptions().limits.fileSize（真实大小上限配置）
 */
import {
  isAllowedUploadType,
  createUploadFileFilter,
  buildUploadOptions,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '../src/common/security/upload';
import { BadRequestException } from '@nestjs/common';

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}`);
  }
}

function runFileFilter(
  file: { originalname: string; mimetype: string },
): { error: Error | null; accept: boolean } {
  let captured: { error: Error | null; accept: boolean } = { error: null, accept: false };
  const filter = createUploadFileFilter();
  filter({} as any, file as Express.Multer.File, (error, accept) => {
    captured = { error, accept };
  });
  return captured;
}

console.log('\n=== P1-3 上传安全限制测试 ===');

// ---------- 1. 白名单扩展名应放行 ----------
console.log('\n[1] 允许的类型（扩展名白名单）');
const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.pdf', '.xls', '.xlsx', '.csv', '.txt', '.doc', '.docx', '.ppt', '.pptx'];
for (const ext of allowed) {
  check(`允许 ${ext}`, isAllowedUploadType(`test${ext}`, 'application/octet-stream') === true);
}

// ---------- 2. 危险扩展名应拒绝 ----------
console.log('\n[2] 拒绝的危险/未知类型');
const denied = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html', '.htm', '.dll', '.com', '.vbs', '.ps1', '.jar', '.py', '.bin', '.iso', ''];
for (const ext of denied) {
  const name = ext === '' ? 'noextension' : `evil${ext}`;
  check(`拒绝 ${ext || '(无扩展名)'}`, isAllowedUploadType(name, 'application/octet-stream') === false);
}

// ---------- 3. 改扩展名绕过（危险 MIME + 白名单扩展名）应被拦截 ----------
console.log('\n[3] 扩展名伪装 + 危险 MIME（纵深防御）');
check('evil.png 但 MIME=application/x-msdownload 被拒', isAllowedUploadType('evil.png', 'application/x-msdownload') === false);
check('evil.jpg 但 MIME=text/html 被拒', isAllowedUploadType('evil.jpg', 'text/html') === false);
check('evil.xlsx 但 MIME=application/x-msdos-program 被拒', isAllowedUploadType('evil.xlsx', 'application/x-msdos-program') === false);

// ---------- 4. fileFilter 回调真实行为 ----------
console.log('\n[4] fileFilter 真实回调行为');
const ok = runFileFilter({ originalname: 'photo.png', mimetype: 'image/png' });
check('合法文件 → cb(null, true)', ok.error === null && ok.accept === true);

const bad = runFileFilter({ originalname: 'virus.exe', mimetype: 'application/x-msdownload' });
check('非法文件 → cb(error, false)', bad.accept === false && bad.error instanceof BadRequestException);
check('非法文件错误为 BadRequestException(400 风格)', bad.error instanceof BadRequestException);

const spoof = runFileFilter({ originalname: 'x.png', mimetype: 'application/x-php' });
check('伪装文件(MIME 危险) → 拒绝', spoof.accept === false && spoof.error instanceof BadRequestException);

// ---------- 5. 大小上限配置（真实 limits 值） ----------
console.log('\n[5] buildUploadOptions 大小上限');
const opts = buildUploadOptions();
check('limits.fileSize 为正整数', typeof opts.limits?.fileSize === 'number' && (opts.limits?.fileSize as number) > 0);
check('limits.fileSize 默认 = 10MB (10485760)', opts.limits?.fileSize === 10 * 1024 * 1024);
check('fileFilter 为函数', typeof opts.fileFilter === 'function');
check('ALLOWED_UPLOAD_EXTENSIONS 不含 .exe', !ALLOWED_UPLOAD_EXTENSIONS.has('.exe'));
check('ALLOWED_UPLOAD_EXTENSIONS 含 .xlsx', ALLOWED_UPLOAD_EXTENSIONS.has('.xlsx'));

// ---------- 6. 自定义 UPLOAD_MAX_SIZE 生效 ----------
console.log('\n[6] 环境变量 UPLOAD_MAX_SIZE 生效');
const prev = process.env.UPLOAD_MAX_SIZE;
process.env.UPLOAD_MAX_SIZE = '2097152'; // 2MB
const opts2 = buildUploadOptions();
check('UPLOAD_MAX_SIZE=2097152 → 2MB', opts2.limits?.fileSize === 2097152);
if (prev === undefined) delete process.env.UPLOAD_MAX_SIZE; else process.env.UPLOAD_MAX_SIZE = prev;

console.log(`\n=== 结果: ${passed} 通过 / ${failed} 失败 ===\n`);
if (failed > 0) {
  process.exit(1);
}
