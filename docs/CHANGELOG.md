# SmartGrade 更新日志（CHANGELOG）

All notable changes to this project will be documented in this file.

格式参考：

Keep a Changelog

版本规则：

Major.Minor.Patch

例如：

1.0.0

正式上线版本。

---

# [Unreleased]

- **Sprint 2.2 C03 完成：Student Notice Capability（通知生命周期）**
    - **DoD 6 项全部达成**：
        - ✅ 能创建通知草稿（DRAFT）
        - ✅ 能发布通知（DRAFT → PUBLISHED）
        - ✅ 能标记已读（NoticeRead.isRead = true）
        - ✅ 能确认阅读（Acknowledge，requireConfirm = true 时）
        - ✅ Timeline 完整（4 种事件类型：NOTICE_CREATED / NOTICE_PUBLISHED / NOTICE_READ / NOTICE_ACKNOWLEDGED）
        - ✅ 全链路测试通过（33/33）
    - **六层流水线再次验证**：Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
    - **状态机**：DRAFT → PUBLISHED → ARCHIVED（终态）
    - **Acknowledge 规则**：只有 requireConfirm = true 且未确认时才允许 Acknowledge
    - **新增文件**：
        - `shared/types/notice/NoticeResponse.ts` — 跨端共享类型
        - `modules/notice/notice.domain-service.ts` — 状态机规则（纯逻辑）
        - `modules/notice/notice.capability-service.ts` — 业务编排（事务 + Timeline）
        - `modules/notice/notice.controller.ts` — 5 个 API 端点（创建/详情/发布/已读/确认）
        - `modules/notice/notice.module.ts` — NestJS Module（useFactory 注入 CapabilityService，保留旧 NoticeService 兼容）
    - **Repository 扩展**：
        - `NoticeRepository` 的 `create` / `publish` / `markRead` / `markConfirmed` 支持 `tx` 参数
    - **Capability Flow 图**：
        ```
        班主任创建通知草稿 → 发布通知 → 教师阅读 → 确认阅读 → Timeline → Workbench 自动刷新
        ```
    - **测试**：33/33 通过（test9），总测试 116/116 通过（test6 + test7 + test8 + test9）
    - **明确不做**：❌ 通知编辑器 / ❌ 定时发布 / ❌ 通知模板 / ❌ 阅读统计 / ❌ 未读提醒 / ❌ 通知撤回

- **Sprint 2.2 C02 完成：Student Leave Capability（请假生命周期）**
    - **DoD 6 项全部达成**：
        - ✅ 能创建请假（PENDING）
        - ✅ 能审批请假（PENDING → APPROVED / REJECTED）
        - ✅ 能办理离校（APPROVED → LEFT）
        - ✅ 能办理返校（LEFT → RETURNED → CLOSED）
        - ✅ Timeline 完整（7 种事件类型，同事务强一致）
        - ✅ 全链路测试通过（33/33）
    - **六层流水线首次落地**：
        ```
        Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
        ```
    - **冻结规则**：
        - 六层流水线（所有 Capability 统一套路）
        - Timeline 强一致（状态变更 + Timeline 同事务，失败则回滚）
        - Leave 生命周期（PENDING → APPROVED → LEFT → RETURNED → CLOSED + REJECTED/CANCELLED）
        - DomainService 不允许改 Student（只通过 StudentStatusResolver）
        - 精简 DoD（6 条，不再写十几条）
        - Capability Flow 图（每个 Capability 最后补一张图）
    - **新增文件**：
        - `shared/types/leave/LeaveResponse.ts` — 跨端共享类型
        - `docs/contracts/LeaveResponse.md` — API Contract
        - `modules/leave/leave.domain-service.ts` — 状态机规则（纯逻辑）
        - `modules/leave/leave.capability-service.ts` — 业务编排（事务 + Timeline）
        - `modules/leave/leave.controller.ts` — 9 个 API 端点
        - `modules/leave/leave.module.ts` — NestJS Module
    - **Repository 扩展**：
        - `BaseRepository` 新增 `withTransaction()` + `TxClient` 类型
        - `LeaveRepository` 的 `create` / `updateStatus` / `findById` 支持 `tx` 参数
        - `TimelineRepository` 的 `create` 支持 `tx` 参数
    - **Capability Flow 图**：
        ```
        学生提交请假 → 班主任审批 → 学生离校 → 学生返校 → Timeline → Workbench 自动刷新
        ```
    - **测试**：33/33 通过（test8），总测试 83/83 通过（test6 + test7 + test8）
    - **明确不做**：❌ 统计 / ❌ 提醒 / ❌ 分析 / ❌ 批量 / ❌ 导出 / ❌ AI

当前开发版本。

## Added（新增）

- **Sprint 2.2 C01-R1 完成：Workbench Capability（Mock 版本）**
    - **交付物（Review 1 严格边界）**：
        - `shared/types/workbench/WorkbenchResponse.ts` — 跨端共享的 Workbench 响应类型
        - `docs/contracts/WorkbenchResponse.md` — API Contract 文档
        - `modules/workbench/workbench.service.ts` — Mock WorkbenchService
        - `src/__tests__/test7-sprint2-2-c01-r1-workbench.test.ts` — 20 个单元测试
    - **WorkbenchResponse 结构**：today / todos / studentStatusSummary / recentNotices / quickActions
    - **today 围绕"今天"**：date（YYYY-MM-DD）/ week（英文） / semesterWeek（学期第几周）
    - **studentStatusSummary 按 DataScope 过滤**：班主任→本班 / 年级主任→本年级 / 政教→全校
    - **quickActions 根据 permissionSet 动态生成**
    - **单元测试 20/20 通过**
    - **Review 1 边界**：✅ 字段定义 / ✅ Mock / ✅ 测试 / ❌ 不接数据库 / ❌ 不写 Repository / ❌ 不写 Prisma

- **Sprint 2.2 正式进入 Feature Development 阶段**
    - 不再新增基础架构，不再扩充底层抽象
    - 围绕 Student Timeline，把每一个业务 Capability 做成完整闭环
    - 新增 Capability 设计原则：Who / What / When（每个 Capability 都必须回答三个问题，最终写 Timeline）
    - Capability 命名规范统一为 Student XXX Capability（Student Leave / Student Notice / Student Task / Student Status）

- **Sprint 2.2 C01 Workbench 优化：Provider 模式 + QuickActionProvider 抽出**
    - **Adapter → Provider 重命名**（刘老师建议）：
        - `WorkbenchTodoAdapter` → `WorkbenchTodoProvider`
        - `WorkbenchStudentStatusAdapter` → `WorkbenchStudentStatusProvider`
        - `WorkbenchNoticeAdapter` → `WorkbenchNoticeProvider`
        - 它们不是接口适配器，而是为 Workbench 提供数据，所以叫 Provider 更准确
    - **QuickActionProvider 抽出**（刘老师建议）：
        - 新增 `IQuickActionProvider` 接口 + `WorkbenchQuickActionProvider` 实现
        - QuickAction 过滤逻辑从 WorkbenchService 移出
        - 以后新增 AIActionProvider / DormActionProvider / EmergencyActionProvider 都不会动 WorkbenchService
    - **WorkbenchService 变为纯聚合器**：只组合 4 个 Provider 的结果，不包含任何业务逻辑
    - **文件变更**：
        - 删除 3 个 Adapter 文件
        - 新增 4 个 Provider 文件（Todo / StudentStatus / Notice / QuickAction）
        - 更新 WorkbenchService / Module / Tokens
    - **单元测试 20/20 通过**（test7 Provider 版）
    - **总测试 50/50 通过**（test6 + test7）

- **Sprint 2.2 C01 完成：Workbench Capability（真实数据版）**
    - **聚合器模式（刘老师要求）**：WorkbenchService 只做聚合，不直接查 Repository
    - **Service 接口定义**：ITodoService / IStudentStatusService / INoticeService
    - **Adapter 适配层**：桥接 Repository 单例 → Service 接口（后续各 Capability 替换）
    - **WorkbenchController**：GET /workbench，Sprint 2 过渡期使用 demo AuthorizationContext
    - **WorkbenchModule**：NestJS DI，useFactory 注入 WorkbenchServices
    - **新增 8 个文件**：
        - `modules/workbench/workbench.service.ts` — 聚合器（重构：deps → services）
        - `modules/workbench/workbench.controller.ts` — NestJS Controller
        - `modules/workbench/workbench.module.ts` — NestJS Module
        - `modules/workbench/workbench.tokens.ts` — DI Token 定义
        - `modules/workbench/workbench-todo.adapter.ts` — TaskRepository → ITodoService
        - `modules/workbench/workbench-student-status.adapter.ts` — StudentRepository → IStudentStatusService
        - `modules/workbench/workbench-notice.adapter.ts` — NoticeRepository → INoticeService
    - **AppModule 注册**：WorkbenchModule 加入全局 imports
    - **单元测试 20/20 通过**（test7 重构版）
    - **总测试 50/50 通过**（test6 + test7）
    - **明确不做**：❌ Redis / ❌ Dashboard / ❌ 实时推送 / ❌ WebSocket / ❌ 图表 / ❌ AI / ❌ 自定义工作台

- 项目基础架构搭建
- SmartGrade 产品文档体系建立
- 教师端功能设计完成
- 管理后台功能设计完成
- 数据库模型设计完成
- API 规范设计完成
- 权限模型设计完成
- UI Design System 建立
- **Day 2 完成：数据库设计 v1.2**
    - Prisma Schema 重写为 v1.2 冻结版：21 张表 + 28 枚举
    - 数据库切换：PostgreSQL → MySQL 8（Domain Rule 规定）
    - ID 类型：BigInt → String (cuid)（跨端共享 TypeScript 类型一致）
    - Student 双维度状态：`current_status` (4) + `current_location` (6) + 3 时间戳
    - TimelineEvent：21 事件 + 5 来源 + `metadata` JSON
    - 新增关联表：`student_parent` / `teacher_class_relation`（多角色）
    - 新增独立表：`user_identity` (5 provider) / `parent` / `task` / `dorm_building` / `dorm_room`
    - 关键索引：`idx_student_status_location` (5 列联合) / `idx_student_time_desc` (2 列 + DESC)
    - MySQL DDL 生成：`backend/prisma/migrations/v1.2_init.sql` (558 行)
    - Prisma validate 通过 ✅
- **Day 3 完成：持久层 v1.3（Repository + Service + Tests）**
    - **Domain Rule 升级 v1.2 → v1.3**（刘老师 Day 2 审查 5 点全部落地）：
        1. §8.1.1 Repository 层强制规范 — 禁止方法必须抛 `DirectStatusUpdateError`
        2. §8.1.2 TeacherClassRelation 时间字段 — startDate / endDate 必填，保留调岗历史
        3. §8.1.3 TimelineEvent 关联字段 — relatedType / relatedId，支持业务反查
    - **Schema 增量 v1.3**：
        - `TeacherClassRelation` 新增 `startDate` / `endDate`
        - `TimelineEvent` 新增 `relatedType` / `relatedId`
        - 新增枚举 `RelatedEntityType`（LEAVE/NOTICE/TASK/DORM/INCIDENT/STUDENT）
        - MySQL DDL：`backend/prisma/migrations/v1.3_init.sql`
        - prisma format + validate 通过 ✅
    - **Repository 层**（9 个文件，~1400 行）：
        - `BaseRepository` — 抽象基类 + `DirectStatusUpdateError`
        - `StudentRepository` — 双维度查询 + 4 个禁止方法
        - `TimelineRepository` — 21 事件 + 禁止 update/delete（R-014）
        - `LeaveRepository` — 8 状态机 + 4 个禁止自动判定（v4.2）
        - `UserRepository` — 4 UserType + 5 IdentityProvider
        - `TeacherRepository` — `findCurrentHeadTeacher` / `transferTeacher` 事务
        - `NoticeRepository` — 5 NoticeType + 3 NoticeStatus
        - `TaskRepository` — 7 TaskStatus（含 OVERDUE 唯一允许自动）
        - `DormRepository` — 查寝应到学生（自动过滤走读生 + 离校）
    - **Service 层**（4 个文件，~790 行）：
        - `StudentStatusLocationResolver.business.ts` — 事件→状态/位置映射
        - `TimelineService` — 业务代码**唯一**事件入口（事务内触发 Resolver）
        - `StudentStatusService` — 班主任工作台 + 查寝 + 双维度查询
        - `LeaveService` — 8 状态机 + 每次转换产生 Timeline + 门卫扫码触发 Resolver
    - **单元测试**（30/30 通过 ✅）：
        - `test1-organization-chain` — 验收 1：组织链创建
        - `test2-teacher-scope` — 验收 2：班主任只能看本班
        - `test3-leave-timeline` — 验收 3：请假自动产生 TimelineEvent
        - `test4-status-protection` — 验收 4：v1.3 状态保护（17 个 it）
    - **TypeScript 编译** 0 错误（8 Repository + 4 Service + 1 Resolver）
    - **ADR 文档**：`docs/day3-architecture-decisions.md`
- **刘老师 Day 3 反馈：产品架构层面重塑（2026-07-18）**
    - 主题：从"Auth"升级为"Identity & Access"
    - **产品原则文档**：`docs/PRODUCT_PRINCIPLES.md`（第一页 = 班主任原则）
        - 核心一句话：**班主任每天打开小程序，不是为了"操作功能"，而是为了"了解学生状态，并完成今天必须完成的工作"**
        - 三个含义：状态可见 > 操作丰富、工作完成 > 流程完整、数据准确 > 数据齐全
        - 反对"看起来有用"清单
        - 产品边界 v1.2 冻结（10 不做 + 6 做）
    - **Day 4-6 计划重写**：`docs/SPRINT2_DAY4-6_PLAN.md`
        - Day 4 Identity：手机/微信/后台账号 三入口 → 同一 User
        - Day 5 Access：5 层模型（Permission → Role → Organization → Tag → DataScope）
        - Day 6 Session：`SessionContext` 完整接口 + 新建 `session` 表
    - **Mid Review 检查清单**：`docs/SPRINT2_MID_REVIEW_CHECKLIST.md`
        - 6 大评审项 + 跨项检查 + 35 个具体检查点
        - Day 6 完成后、开始 Sprint 2.2 之前必须通过
    - **关键原则（来自刘老师）**：
        - 不做考勤 / 不做行程 / 不做 IM / 不做成绩 / 不做选课
        - 不主动判定任何状态（v4.2 + v1.2 + v1.3 三重冻结）
        - 业务永远围绕 Teacher / Parent / Student，不围绕 User
        - Day 6 后先 Mid Review，再开 Sprint 2.2 班主任工作台
- **Day 4 完成：Identity（身份与三入口）**
    - **4 拍板点全部落地**（2026-07-18 刘老师最终决策）：
        1. 拍板 1 — 三入口：只做 PHONE / WECHAT / ACCOUNT；DINGTALK / FEISHU / WEWORK 删除
        2. 拍板 2 — Tag 是筛选器：Day 5 不在 DataScope 加 Tag，Tag 走 NotificationTarget
        3. 拍板 3 — Session 表 + JWT 混合：Day 6 落地，session_id 在 JWT，完整 ctx 在 session 表
        4. 拍板 4 — UserRepository 演化路径：业务 Service 禁依赖，grep 验收通过
    - **2026-07-20 最终定稿修正**（刘老师评审）：
        - `IdentityProvider` enum 从 6 砍回 3（删除 DINGTALK / FEISHU / WEWORK）
        - `LoginStrategy` → `IdentityProvider`（接口 + 实现类名统一）
        - `IIdentityAdapter` → `IIdentityProvider`，`*IdentityAdapter` → `*IdentityProvider`
        - `IdentityError` / `IdentityInput` / `IdentityResult` / `IdentityContext` 类型名统一
    - **Schema 增量 v1.3+Day 4**：
        - `IdentityProvider` 3 枚举：PHONE / WECHAT / ACCOUNT
        - `prisma format` + `prisma validate` 通过 ✅
        - Prisma Client (v5.22.0) 重新生成 ✅
    - **新增 2 条产品原则（写入 PRODUCT_PRINCIPLES.md）**：
        - 第二条：单一真实来源（SSOT）— 任何数据只能有一个权威来源
        - 第三条：系统主动推送（Push, not Pull）— 系统主动提醒老师，不让老师找信息
    - **仓储层**（1 新 + 1 重构）：
        - `IdentityRepository`（新增）— 专管 `user_identity`：findByProvider / findByUser / create / verify / disable / softDelete / updateCredentialHash
        - `UserRepository`（重构）— 只管 `user` 表：剥离 user_identity 操作
    - **身份提供方层**（1 接口 + 3 提供方 + 1 服务 = 5 文件）：
        - `identity-provider.ts` — 共享接口 + IdentityContext + IdentityResult + IdentityError
        - `phone-identity.provider.ts` — 11 位手机号 + 验证码 `123456`（mock）
        - `wechat-identity.provider.ts` — mock `openid = mock_openid_${code}`
        - `account-identity.provider.ts` — bcrypt 校验 + userType 白名单（SYSTEM_ADMIN / TEACHER）
        - `identity.service.ts` — 路由 3 提供方 + recordLogin + bindIdentity / unbindIdentity
    - **关键冻结**（不变量）：
        - ❌ 手机号登录**不**自动创建 User（拍板：必须后台预录入）
        - ❌ 微信登录**不**自动创建 User / 绑手机号（必须走绑定流程）
        - ❌ 家长**不**能用账号登录（必须走微信）
        - ❌ 业务 Service **不**能 import UserRepository（拍板 4 grep 验收通过）
        - ✅ 三个入口 → 同一 User（多次登录拿同 userId）
        - ✅ 解绑时强制保留至少 1 个 ACTIVE 身份（防孤儿 user）
    - **单元测试 14/14 通过**（test5-day4-identity.test.ts）：
        - PhoneIdentityProvider 4 用例（含未注册抛 USER_NOT_FOUND + 不创建 User）
        - WechatIdentityProvider 2 用例（含未绑定抛 WECHAT_NOT_BOUND）
        - AccountIdentityProvider 3 用例（含家长拒绝 + 密码 bcrypt 校验）
        - 同 User 原则 1 用例（最关键：手机 + 微信拿同 userId）
        - bindIdentity / unbindIdentity 4 用例
    - **总测试 44/44 通过**（Day 1-3 的 30 + Day 4 的 14）
    - **TypeScript 编译**：Day 4 新增/修改文件 0 错误
    - **设计稿定稿**：`AUTHORIZATION_CONTEXT_v1.md` — CurrentActor + AuthorizationInfo 组合 + Session 表不存 Context + 11 条不变量
- **Day 5.1 完成：Authorization（RBAC 权限体系）**
    - **刘老师 9 条设计建议全部落地**（2026-07-20 拍板）：
        1. RoleCode 统一 `ROLE_` 前缀（8 个系统角色）
        2. PermissionCode 用 `domain.action` 三级命名（28 个权限，enum 非字符串）
        3. Sprint 2 只冻结真正要开发的权限（不预留给未来 Sprint）
        4. RolePermissionMap 用 `Map<RoleCode, ReadonlySet<PermissionCode>>`（非 Object）
        5. AuthorizationService 职责缩小：只回答"有没有权限？"（hasPermission / hasRole / requirePermission / requireAnyPermission / requireAllPermissions）
        6. Builder 改名 Resolver（语义：解析数据库 → AuthorizationContext）
        7. 目录结构：`backend/src/authorization/`（6 个文件）
        8. RoleCode / PermissionCode 放 `shared/enums/`（跨端共享）
        9. PermissionCode 用 enum（IDE 自动提示，避免拼写错误）
    - **新增 6 个文件**：
        - `shared/enums/RoleCode.ts` — 8 系统角色 + RoleCodeText
        - `shared/enums/PermissionCode.ts` — 28 权限 + PermissionCodeText
        - `backend/src/authorization/role-permission.map.ts` — 冻结的 RolePermissionMap（8 角色 × 权限矩阵）
        - `backend/src/authorization/types.ts` — CurrentActor + AuthorizationInfo + AuthorizationContext + DataScope
        - `backend/src/authorization/authorization.service.ts` — 纯函数权限判断 + PermissionDeniedError
        - `backend/src/authorization/authorization.resolver.ts` — resolve(userId) → AuthorizationContext
    - **单元测试 25/25 通过**（test6-day5-authorization.test.ts）：
        - RoleCode / PermissionCode enum 值校验
        - RolePermissionMap 冻结验证（Object.isFrozen）
        - ADMIN 28 权限 / SUBJECT_TEACHER 无学生管理权限
        - AuthorizationService 11 用例（hasPermission / hasRole / requirePermission / requireAnyPermission / requireAllPermissions / PermissionDeniedError）
        - AuthorizationResolver 7 用例（SYSTEM_ADMIN / TEACHER / PARENT / STUDENT / User 不存在 / 多角色并集 / Context 结构）
    - **总测试 69/69 通过**（Day 1-4 的 44 + Day 5.1 的 25）
    - **TypeScript 编译**：Day 5.1 新增文件 0 错误
- **Day 5.2 完成：Organization + DataScope Resolver**
    - **刘老师 8 条建议全部落地**（2026-07-20 拍板）：
        1. RolePermissionMap 不导出 Map，改导出 `getPermissions(role)` 函数（避免外部误修改）
        2. AuthorizationResolver 职责收紧：只查 User/Role/Permission/Organization/DataScope，不查业务数据
        3. PermissionCode 28 个控制合理，Permission = 能力，数据范围走 DataScope
        4. RoleCode 平台固定角色约束写入 ADR：8 个值，学校自定义走 Tag
        5. AuthorizationContext 新增 `issuedAt`（用于缓存过期判断）
        6. OrganizationResolver 简化：只查 School → Grade → TeacherClassRelation
        7. DataScopeResolver 单一入口：`resolve(actor) → DataScope`，内部 switch 分发
        8. Repository 边界保持：findById/exists/count 不传 ctx，list/page 传 ctx
    - **新增 3 个文件**：
        - `backend/src/authorization/organization.resolver.ts` — `resolve(actor) → Organization`
        - `backend/src/authorization/data-scope.resolver.ts` — `resolve(actor) → DataScope`
        - `docs/ADR-005-authorization-architecture.md` — 4 条边界决策 + 6 条不变量
    - **AuthorizationResolver 升级**：调用 OrganizationResolver + DataScopeResolver，补全 AuthorizationContext
    - **单元测试 35/35 通过**（test6-day5-authorization.test.ts）：
        - OrganizationResolver 4 用例（TEACHER / PARENT / ADMIN / 无 teacherId）
        - DataScopeResolver 4 用例（ADMIN schoolWide / TEACHER classIds+gradeIds / 政教推断 / PARENT scoped）
        - AuthorizationResolver 整合 5 用例（ADMIN / TEACHER / PARENT / User 不存在 / 多角色并集）
    - **总测试 74/74 通过**（Day 1-5 全部通过）
    - **TypeScript 编译**：Day 5.2 新增文件 0 错误
    - **设计稿定稿**：`AUTHORIZATION_CONTEXT_v1.md` + `ADR-005-authorization-architecture.md`
- **Sprint 2.1 Milestone Review（Authorization Review）— 通过**
    - **5 项 Architecture grep 检查全部完成**：
        1. Repository 越权：`repositories/` 无直接 Prisma 以外的依赖 ✅
        2. Service 自判断权限：`authorization/` 外无 ROLE_ 越权（`modules/` Sprint 1 遗留，Sprint 2.2 清理）
        3. Repository 不认 Role/Permission/Tag：`repositories/` 中无任何 Role/Permission/Tag 判断 ✅
        4. DataScope 无业务逻辑：`data-scope.resolver.ts` 纯粹返回 classIds/gradeIds/isSchoolWide ✅
        5. AuthorizationContext 字段数 = 3（actor/authorization/issuedAt） ✅
    - **新增 2 个文档**：
        - `docs/ADR-006-dependency-rule.md` — 单向依赖规则 + 核心约束：Repository 是唯一允许访问 Prisma Client 的地方
        - `docs/ARCHITECTURE_CHECKLIST.md` — 29 项长期架构约束清单（8 类）+ 18 项 TD 编号 Tech Debt
    - **检查结果**：新架构 18 项通过 0 Violation + Sprint 1 遗留 18 项 Tech Debt（TD-001~TD-018）
    - **Tech Debt 归入 Sprint 2.2 "Authorization Refactor"**：Changelog 中用 `Resolved TD-XXX` 标记
    - **冻结 5 个接口**：AuthorizationContext / CurrentActor / Organization / DataScope / AuthorizationService — 变更必须走 ADR
    - **Sprint 2.2 业务模块统一模板**：Controller → Guard → Service → Repository → Timeline → Prisma
- **Sprint 2.1 正式定义为里程碑（Milestone）**
    - 冻结内容：Day 1-3 领域模型 + 数据模型、Day 4 Identity、Day 5 Authorization/Organization/DataScope
    - 冻结文档：ADR-005、ADR-006、ARCHITECTURE_CHECKLIST.md
    - 原则上不再修改底层架构；优先通过新增实现解决问题；只有架构级变更才走 ADR 版本修订
    - **ADR 使用规则**：只有 3 类情况允许新增 ADR（修改架构 / 修改数据库 / 跨模块重构），其它不写
- **SmartGrade Architecture Baseline v1.0 — Sprint 2.1 正式冻结**
    - 版本号：Architecture Baseline v1.0
    - 冻结内容：
        - Domain Rule v1.2
        - Prisma Schema v1.3
        - Authorization Architecture（Identity / Authorization / Organization / DataScope）
        - ADR-005（Role 固定 / Tag 可扩展 / Permission=能力 / DataScope=数据权限）
        - ADR-006（Dependency Rule / Repository 独占 Prisma）
        - Architecture Checklist（29 项约束 + TD-001~TD-018）
    - 五层架构基线：
        ```
        业务规则（Domain Rule）
                ↓
        领域模型（Type）
                ↓
        数据库模型（Prisma）
                ↓
        身份 / 授权（Identity / Authorization）
                ↓
        工程规范（ADR / Checklist / Tech Debt）
        ```
    - 回答："SmartGrade 的底层架构从哪个版本开始稳定？" → **Architecture Baseline v1.0**
- **Day 1 完成：领域类型 v1.2**

## Changed（调整）

- 确定采用多角色权限模型
- 确定 RBAC + Organization + Tag 权限方案
- 确定学生状态模型：
    - 在校
    - 已批准待离校
    - 已离校

## Docs（文档）

### Sprint 2 Planning 演进

- `SPRINT2_PLANNING_v1.md` — Sprint 2 初步规划（8 Step / 5 角色 / 31 权限）
- `SPRINT2_PLANNING_v2.md` — 第二轮评审（7 Step / 7 角色 / 46 权限）
- `SPRINT2_PLANNING_v3.md` — 第三轮评审（6+2 双体系 / 工作台前置）
- `SPRINT2_PLANNING_v4.md` — 第四轮产品冻结（7 实体 / 11 状态）
- `SPRINT2_PLANNING_v4.1.md` — 工程补丁（UserIdentity / 13 Timeline 事件 / 14 天）
- `SPRINT2_PLANNING_v4.2.md` — **业务规则补丁**（请假状态机 11→8 / Timeline 13→10 / 学生状态中心）
- `SPRINT2_DOMAIN_RULE_v1.md` — **业务规则冻结 v1.0**（请假/离校/通知/任务/宿舍/违纪/权限/通用 8 章）
- `SPRINT2_DOMAIN_RULE_v1.1.md` — **v4.2 Review 补充冻结 4 条**（`leave_reason_type` 6 枚举 / `StudentStatus` 6 状态 / 业务事件驱动原则 / `StudentTimeline` 21 事件）
- `SPRINT2_DOMAIN_RULE_v1.2.md` — **业务负责人最终拍板：双维度模型拆分**（`StudentStatus` 6→4 状态 / 新增 `StudentLocation` 6 位置 / 独立字段）

### v4.2 业务规则校准

请假状态机从 11 状态**冻结为 8 状态**：
- 删除 `NO_SHOW` / `EXPIRED` / `OVERDUE`（企业考勤思维）
- 保留 `DRAFT / PENDING / APPROVED / REJECTED / CANCELLED / LEFT / RETURNED / CLOSED`

LeaveTimeline 从 13 事件**冻结为 10 事件**：
- 删除 `LEAVE_NO_SHOW / LEAVE_EXPIRED / LEAVE_OVERDUE / LEAVE_LATE_RETURN`
- 新增 `LEAVE_EDITED / LEAVE_RESUBMITTED`
- 改名 `LEAVE_REVOKED → LEAVE_CANCELLED`

字段语义：
- `expected_return_time` 仅作为**参考字段**
- **不**参与任何自动状态转换
- **不**触发自动告警

产品定位重定义：
- ❌ 请假管理系统 / 学生考勤系统
- ✅ **学生在校状态中心**

### v1.2 业务规则最终拍板（双维度拆分）

- `StudentStatus` 从 6 状态**重写为 4 状态**（删除 `LEAVING` 和 `DORM`）
- **新增 `StudentLocation` 6 位置**（CLASSROOM / DORM / PLAYGROUND / GATE / OFF_CAMPUS / UNKNOWN）
- 双维度独立字段：`Student.current_status` + `Student.current_location`
- 双维度判断逻辑：`isActuallyInSchool()` / `shouldCheckInDorm()`
- 解除未来 6 大场景开发障碍：查寝 / 晚自习签到 / 课堂点名 / 活动签到 / 走读生管理 / 异常学生筛选

### v1.1 业务规则补充冻结（v4.2 Review 通过）

- `leave_reason_type` 6 枚举：ILLNESS / PERSONAL / FAMILY / SPORT / SCHOOL_ACTIVITY / OTHER（**必填**，不再仅存自由文本）
- `StudentStatus` 6 状态：ON_CAMPUS / LEAVING / OUT_OF_SCHOOL / DORM / GRADUATED / TRANSFERRED（替代 v4.1 旧枚举 `IN_SCHOOL / PENDING_LEAVE / LEFT_SCHOOL`）
- **业务事件驱动原则**：模块不直接修改 `Student.current_status`，由 `TimelineEvent` 触发状态机变更
- `StudentTimeline` 21 事件 + 聚合视图架构（`LeaveTimeline` + `DormTimeline` + `NoticeTimeline` + `IncidentTimeline` 查询时聚合），为 Sprint 3 智能校园助手预埋数据结构

## Fixed（修复）

暂无。


---

# [0.1.0] - 项目设计阶段

发布日期：

2026-07-15


## Added

### 产品设计

新增：

- README.md
- ProjectRule.md
- Glossary.md
- DomainModel.md
- PRD.md


### 用户端设计

完成：

教师端页面设计：

- 工作台
- 请假管理
- 学生管理
- 通知中心
- 文件中心
- 待办中心
- 时间轴


### 管理端设计

完成：

管理员后台页面规划：

- Dashboard
- 组织管理
- 学生管理
- 教师管理
- 权限管理
- 数据统计


### 数据设计

完成数据库设计：

核心数据表：

- Teacher
- Role
- Student
- Class
- LeaveRecord
- Timeline
- Notice
- Document
- Todo
- Incident
- OperationLog
- SystemConfig


### 权限设计

完成：

- 多角色模型
- 数据权限模型
- 标签推送模型


### AI开发规范

完成：

AI_RULE.md

用于约束：

- Trae
- Cursor
- Copilot

开发行为。


---

# [0.2.0] - 基础开发版本

状态：

Planned


## Planned

### 用户系统

计划实现：

- 微信登录
- 教师账号绑定
- 多角色加载
- 权限动态生成


### 学生管理

计划实现：

- 学生导入
- 班级绑定
- 住宿信息管理


### 请销假系统

计划实现：

- 班主任申请
- 政教审批
- 宿管通知
- 离校状态同步
- 班主任销假


---

# [0.3.0] - 核心业务版本

状态：

Planned


## Planned


### 请假流程

完成：

- LeaveRecord
- Timeline
- Todo

完整闭环。


### 宿舍管理

新增：

- 查寝
- 异常上报
- Incident处理


### 消息系统

新增：

- 通知发布
- 文件下发
- 阅读确认


---

# [0.4.0] - 数据统计版本

状态：

Planned


## Planned


新增：

- 年级数据看板
- 班级数据分析
- 请假趋势分析
- 宿舍异常统计
- 通知阅读统计


---

# [0.5.0] - 优化版本

状态：

Planned


## Planned


优化：

- 全局搜索中心
- 系统性能优化
- UI体验优化
- 移动端适配
- 操作日志完善


---

# [1.0.0] - 正式上线版本

状态：

Planned


## Added

正式发布 SmartGrade。

包含：

- 教师端小程序
- 管理后台
- 权限系统
- 请销假系统
- 通知系统
- 文件系统
- 宿舍管理
- 数据统计


---

# 版本说明

## Major

重大架构变化。

例如：

数据库重构。

权限体系变化。


## Minor

新增功能。

例如：

新增模块。

新增页面。


## Patch

小修复。

例如：

Bug修复。

UI调整。

---

# 更新规则

每次代码合并必须更新：

CHANGELOG.md


格式：

日期

版本

修改内容

影响范围


---

# End

SmartGrade Changelog