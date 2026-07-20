/**
 * Workbench DI Tokens
 *
 * Provider 接口的 NestJS DI 标识符。
 * 独立文件，避免 service ↔ module 循环引用。
 */

import type { ITodoService, IStudentStatusService, INoticeService } from './workbench.service';
import type { IQuickActionProvider } from './workbench-quick-action.provider';

/** ITodoService 注入标识 */
export const TODO_SERVICE = Symbol('ITodoService');
/** IStudentStatusService 注入标识 */
export const STUDENT_STATUS_SERVICE = Symbol('IStudentStatusService');
/** INoticeService 注入标识 */
export const NOTICE_SERVICE = Symbol('INoticeService');
/** IQuickActionProvider 注入标识 */
export const QUICK_ACTION_PROVIDER = Symbol('IQuickActionProvider');

// 类型映射（用于 NestJS Provider 类型标注）
export type { ITodoService, IStudentStatusService, INoticeService, IQuickActionProvider };
