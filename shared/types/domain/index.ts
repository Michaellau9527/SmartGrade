/**
 * SmartGrade Domain Types — v1.2 冻结版
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2
 *
 * 本目录是 SmartGrade 项目的**唯一领域类型来源**。
 * 所有 Sprint 2.1+ 的代码必须从此处 import，不允许在业务代码中重复定义。
 *
 * ⚠️ v1.2 核心变更：
 * 1. `StudentStatus` 4 状态（从 v1.1 的 6 状态缩）
 * 2. 新增 `StudentLocation` 6 位置（独立字段）
 * 3. 双维度模型（`current_status` + `current_location`）
 * 4. `leave_reason_type` 6 枚举（必填）
 * 5. 21 Timeline 事件聚合
 * 6. `LeaveStatus` 8 状态（v4.2 冻结）
 *
 * 入口：
 *   import { Student, LeaveRecord, StudentStatusLocationResolver } from '@smartgrade/shared/types/domain';
 */

// ===== 实体 =====
export * from './School';
export * from './Grade';
export * from './Class';
export * from './Teacher';
export * from './Student';
export * from './Parent';
export * from './User';
export * from './UserIdentity';
export * from './TimelineEvent';
export * from './LeaveRecord';
export * from './Notice';
export * from './Task';

// ===== 枚举 =====
export * from './enums/StudentStatus';
export * from './enums/StudentLocation';
export * from './enums/UserType';
export * from './enums/IdentityProvider';
export * from './enums/TimelineEventType';
export * from './enums/TimelineEventSource';
export * from './enums/LeaveStatus';
export * from './enums/LeaveType';
export * from './enums/LeaveReasonType';
export * from './enums/NoticeType';
export * from './enums/NoticeStatus';
export * from './enums/NotificationTargetType';
export * from './enums/TaskStatus';
export * from './enums/TaskPriority';
export * from './enums/TaskSource';

// ===== Resolver =====
export * from './StudentStatusLocationResolver';
