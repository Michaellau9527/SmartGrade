/**
 * 学生列表查询的纯函数工具
 *
 * 抽成无框架依赖的纯函数，便于 ts-node 单测（遵循 P1 各项的既有模式：
 * computeWorkbenchSchoolWide / resolveCorsConfig / resolveAdminPassword）。
 *
 * 注意：本文件只处理「搜索关键词规范化」与「分页参数推导」，
 * 不涉及任何数据权限（DataScope）逻辑 —— DataScope 仍由 StudentService 内的
 * buildDataScopeFilter / checkDataScopeAccess 负责（P0 红线，不可改动）。
 */

/** 搜索关键词最大长度，防止超长输入导致的查询放大 / 滥用 */
export const STUDENT_KEYWORD_MAX_LEN = 64;

/**
 * 规范化学生列表搜索关键词：
 * - 非字符串 / null / undefined → 视为「无搜索」返回 null
 * - 去除首尾空白；纯空白 → 视为「无搜索」返回 null
 * - 超过最大长度 → 抛错（由调用方转为 400 BadRequest）
 *
 * 返回 null 时调用方不应拼接 OR 条件，避免「空白关键词匹配全部」的异常行为。
 */
export function sanitizeStudentKeyword(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > STUDENT_KEYWORD_MAX_LEN) {
    throw new Error(`搜索关键词长度不能超过 ${STUDENT_KEYWORD_MAX_LEN} 个字符`);
  }
  return trimmed;
}

export interface StudentListPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * 推导学生列表分页参数：
 * - page 无效（缺省 / <1 / 非整数）→ 1
 * - pageSize 无效（缺省 / <1 / 非整数）→ 默认 100（一次拉满一个班/年级，修复验收报告 C10 的默认 20 截断）
 * - pageSize 硬上限 100，防 DoS
 * - skip / take 据此计算
 *
 * 仅作用于学生列表接口，不改动共享的 PaginationDto（其他模块仍用各自的默认 20）。
 */
export function computeStudentListPagination(
  page?: number,
  pageSize?: number,
): StudentListPagination {
  const effectivePage =
    typeof page === 'number' && Number.isFinite(page) && page >= 1
      ? Math.floor(page)
      : 1;
  const effectivePageSize =
    typeof pageSize === 'number' && Number.isFinite(pageSize) && pageSize >= 1
      ? Math.min(Math.floor(pageSize), 100)
      : 100;
  return {
    page: effectivePage,
    pageSize: effectivePageSize,
    skip: (effectivePage - 1) * effectivePageSize,
    take: effectivePageSize,
  };
}
