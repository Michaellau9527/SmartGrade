import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';

/**
 * 文件上传安全策略（P1-3）
 *
 * 原则：最小必要限制，复用既有 UPLOAD_MAX_SIZE 环境变量（env.validation.ts）。
 * - 单文件大小上限：UPLOAD_MAX_SIZE（默认 10MB）
 * - 类型限制：扩展名白名单（正向）+ 危险 MIME 黑名单（负向，纵深防御）
 *
 * 说明：项目当前无服务端 Excel 解析依赖，通用上传端点实际业务类型未定。
 * 因此不把范围收缩到单一猜测类型，而是采用「常见安全文档/图片白名单」，
 * 明确拒绝可执行/脚本类危险文件，阻断任意文件上传漏洞。
 */

/** 允许的扩展名白名单（最小必要：图片 + 文档 + 表格 + 文本） */
export const ALLOWED_UPLOAD_EXTENSIONS: ReadonlySet<string> = new Set([
  // 图片
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  // 文档
  '.pdf',
  // 表格 / 文本
  '.xls', '.xlsx', '.csv', '.txt',
  // 办公文档
  '.doc', '.docx', '.ppt', '.pptx',
]);

/**
 * 危险 MIME 前缀黑名单（纵深防御）：
 * 即便扩展名伪装成白名单，若客户端上报的 MIME 属于以下危险类别也拒绝。
 */
const DANGEROUS_MIME_PREFIXES: ReadonlyArray<string> = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-msdos-program',
  'application/x-dosexec',
  'application/vnd.ms-htmlhelp',
  'text/html',
  'application/javascript',
  'application/x-php',
  'application/x-python',
  // 注意：application/octet-stream 故意不在黑名单内——
  // 浏览器对 xlsx/csv/docx 等常见办公文件常回退为 octet-stream，
  // 若拦截会误伤真实 Excel 导入；危险文件已由扩展名白名单拦截。
];

/** 判定文件是否允许上传（扩展名白名单 + 危险 MIME 黑名单） */
export function isAllowedUploadType(originalname: string, mimetype: string): boolean {
  if (!originalname || typeof originalname !== 'string') return false;

  const lower = originalname.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false; // 无扩展名，拒绝
  const ext = lower.slice(dot);
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return false;

  // MIME 校验：若客户端提供了 MIME 且属于危险类别则拒绝
  const mime = (mimetype || '').toLowerCase();
  if (mime && DANGEROUS_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return false;
  }
  return true;
}

/** 构造 multer fileFilter：拒绝时抛 BadRequestException（项目风格 400） */
export function createUploadFileFilter() {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ): void => {
    if (!isAllowedUploadType(file.originalname, file.mimetype)) {
      cb(new BadRequestException('不支持的文件类型，仅允许图片/PDF/Office/表格/文本类文件'), false);
      return;
    }
    cb(null, true);
  };
}

/**
 * 构造统一上传拦截器选项，供 FileInterceptor / FilesInterceptor 复用。
 * 在装饰器中调用，故直接读取 process.env（与 ConfigService 同源）。
 */
export function buildUploadOptions(): MulterOptions {
  const raw = process.env.UPLOAD_MAX_SIZE;
  const maxSize = raw ? Number(raw) : NaN;
  const fileSize = Number.isFinite(maxSize) && maxSize > 0 ? maxSize : 10 * 1024 * 1024; // 默认 10MB
  return {
    limits: { fileSize },
    fileFilter: createUploadFileFilter(),
  };
}
