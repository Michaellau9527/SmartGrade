/**
 * 极简路径别名 shim：让 ts-node 在运行测试时能解析后端源码里的 `@/*` 别名
 * （映射到 backend/src/*）。仅用于本地/CI 运行 IDOR 验证脚本，不依赖任何新依赖。
 *
 * 用法：ts-node --transpile-only -r ./test/_tsconfig_paths_shim.js ./test/xxx.ts
 */
const Module = require('module');
const path = require('path');

const SRC_ROOT = path.resolve(__dirname, '..', 'src');

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(SRC_ROOT, request.slice(2));
    return originalResolve.call(this, mapped, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
