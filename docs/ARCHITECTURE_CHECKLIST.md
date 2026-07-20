# SmartGrade Architecture Checklist

> **Sprint 2.1 Milestone Review — 长期架构约束清单**
> **日期**：2026-07-20（v1.1 更新）
> **状态**：✅ 冻结
> **上游规则**：刘老师 Sprint 2.1 Milestone Review 拍板

---

## 用途

本文件记录整个项目**必须长期遵守**的架构约束。

- 不记录业务逻辑
- 不记录技术实现细节
- 只记录"不能做什么"

新增团队成员时，第一条就是：**读 ARCHITECTURE_CHECKLIST.md**。

---

## 违规处理原则

| 代码类型 | 新代码 | 历史遗留代码 |
| --- | --- | --- |
| **状态** | ❌ Violation | ⚠️ 延期修复 |
| **处理** | **不允许合并**，PR 必须修 | 归入 Tech Debt Backlog，指定 Sprint + Owner |
| **说明** | 即使小改动带入违规也不允许 | 历史代码确实违反 ADR，但允许延期治理 |

**关键原则**：不要轻易说"0 项违规"。历史代码违反 ADR 仍然属于 Violation，只是允许延期修。

---

## 约束清单

### 第一类：分层依赖（ADR-006）

| # | 规则 | 检查方式 |
| --- | --- | --- |
| **C-01** | Repository 是**唯一**允许访问 Prisma Client 的地方 | `grep 'PrismaClient' src/` — 除 `repositories/` 和 `db/` 外应为空 |
| **C-02** | Service 不允许直接注入 PrismaService | Sprint 2.2 完成后 `grep 'this.prisma' modules/` 应为空 |
| **C-03** | Guard 不允许查询业务数据（Prisma） | `grep 'prisma' common/guards/` 应为空 |
| **C-04** | Controller 不允许注入 Repository | `grep 'Repository' modules/*/` 应为空 |
| **C-05** | Controller 不判断 Role / Permission | `grep 'ROLE_\|Permission' controllers/` 应为空（@RequirePermissions 装饰器引用除外） |

### 第二类：权限边界（ADR-005）

| # | 规则 | 检查方式 |
| --- | --- | --- |
| **C-06** | Repository 不出现 Role 判断 | `grep 'ROLE_\|role' repositories/` 应为空 |
| **C-07** | Repository 不出现 Permission 判断 | `grep 'Permission\|permission' repositories/` 应为空 |
| **C-08** | Repository 不出现 Tag 判断 | `grep 'Tag\|tag' repositories/` 应为空 |
| **C-09** | Service 不自己判断 Role（统一走 AuthorizationService） | Sprint 2.2 完成后 `grep 'ROLE_' services/` 应为空 |
| **C-10** | Service 不自己拼 DataScope（统一走 DataScopeResolver） | Service 中不应有 `classIds` / `gradeIds` 硬编码 |

### 第三类：权限四维度（ADR-005）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-11** | Role 是平台固定角色，不允许学校自定义 | `RoleCode` 枚举只有 8 个值 |
| **C-12** | Tag 永远不是权限 | Tag 不出现在 RolePermissionMap |
| **C-13** | Permission 只表示能力，不表示数据范围 | PermissionCode 命名 `domain.action` |
| **C-14** | DataScope 是唯一的数据权限来源 | Repository 只认 `ctx.dataScope` |

### 第四类：状态保护（ADR-003 + Day 3）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-15** | Student.currentStatus 只能通过 Resolver 更新 | Repository 提供 `setCurrentStatus` 方法但抛 `DirectStatusUpdateError` |
| **C-16** | Student.currentLocation 只能通过 Resolver 更新 | 同上 |
| **C-17** | TimelineEvent 是所有业务事件的唯一事实来源 | 业务 Service 不直接改 Student 状态 |
| **C-18** | 请假不自动判定状态 | v4.2 冻结：无 NO_SHOW / EXPIRED / OVERDUE |

### 第五类：AuthorizationContext 控制

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-19** | AuthorizationContext 字段数不超过 3 个（actor / authorization / issuedAt） | 超过则拆分 |
| **C-20** | AuthorizationContext 不缓存业务实体（Teacher / Student / Leave 等） | 只缓存身份 + 权限 + 组织 + 数据范围 |
| **C-21** | Session 表不存储 AuthorizationContext | Session 只存 userId / sessionId / loginAt / expireAt / device / tokenVersion |

### 第六类：Resolver 职责

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-22** | AuthorizationResolver 只查 User / Role / Permission / Organization / DataScope | 不查 Student / Leave / Notice / Task |
| **C-23** | OrganizationResolver 只有一个公开方法 `resolve(actor)` | 不要分散成多个方法 |
| **C-24** | DataScopeResolver 只有一个公开方法 `resolve(actor)` | 不要分散成 resolveHeadTeacher / resolveParent / resolveAdmin |
| **C-25** | AuthorizationService 只回答"有没有权限" | 不构建 Context |

### 第七类：业务模块统一模板（Sprint 2.2 起生效）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-26** | 每个业务模块统一结构：Controller → Guard → Service → Repository → Timeline → Prisma | 所有模块结构一致，维护成本低 |
| **C-27** | 业务模块必须经过 Guard 才能到达 Service | 不允许绕过 Guard 直接调用 Service |

### 第八类：冻结接口变更流程

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-28** | 5 个冻结接口的变更必须走 ADR 流程 | AuthorizationContext / CurrentActor / Organization / DataScope / AuthorizationService |
| **C-29** | 优先通过新增实现解决问题，不推翻已有设计 | 只有架构级变更才走 ADR 版本修订 |

### 第九类：Capability 副作用控制（ADR-007）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-30** | Capability 不允许直接产生副作用 | Leave 不负责通知 Workbench / 发送消息 / 触发统计。副作用通过 Timeline 触发 |
| **C-31** | Timeline 是所有业务事件的唯一事实来源 | 下游模块（Workbench / Notice / Statistics / AI）只消费 Timeline，不直接监听业务事件 |

### 第十类：架构层级冻结（Baseline v1.1）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-32** | 任何新增 Capability，不允许新增新的架构层级 | 禁止新增 Manager / Facade / Helper / UtilService / Middleware / Processor 等中间层 |
| **C-33** | Capability 必须落在固定六层内 | Controller → CapabilityService → DomainService → Repository → Timeline → Prisma |

### 第十一类：Projection Rule（ADR-008）

| # | 规则 | 说明 |
| --- | --- | --- |
| **C-34** | Projection 只读 Timeline，不修改业务数据 | Workbench / Dashboard / Statistics / AI / Timeline View 都是 Projection |
| **C-35** | Projection 不走六层流水线 | Projection = Controller + ProjectionService + TimelineRepository（只读） |
| **C-36** | Projection 不允许反向调用 Capability | 禁止 Workbench → 修改 Leave，禁止 Timeline View → 修改 Student |
| **C-37** | 新模块必须明确角色（Capability / Projection / Timeline） | 不允许存在"模糊角色"的模块 |

---

## 使用方式

### Code Review 时

每次 PR 合并前，对照 Checklist 检查新增代码是否违反约束。

### 新人入职时

第一条任务：**读 ARCHITECTURE_CHECKLIST.md + ADR-005 + ADR-006**。

### Sprint 里程碑时

每完成一个 Sprint，逐项检查 Checklist，记录状态。Changelog 中用 `Resolved TD-XXX` 标记已清理的 Tech Debt。

---

## 当前状态（Sprint 2.1 Milestone Review）

### 新架构代码（Day 4–5）

| # | 规则 | 状态 |
| --- | --- | --- |
| C-01 | Repository 唯一访问 Prisma Client | ✅ 通过 |
| C-04 | Controller 不注入 Repository | ✅ 通过 |
| C-05 | Controller 不判断 Role | ✅ 通过 |
| C-06~C-08 | Repository 不认 Role/Permission/Tag | ✅ 通过 |
| C-11~C-14 | 权限四维度 | ✅ 通过 |
| C-15~C-18 | 状态保护 | ✅ 通过 |
| C-19~C-21 | AuthorizationContext 控制 | ✅ 通过 |
| C-22~C-25 | Resolver 职责 | ✅ 通过 |
| C-26~C-29 | 模板 + 冻结流程 | ✅ 通过（冻结） |

**新架构：18/18 通过。0 Violation。**

### Sprint 1 遗留代码

| TD 编号 | 违反规则 | 涉及文件 | Owner | Sprint |
| --- | --- | --- | --- | --- |
| **TD-001** | C-02 Service 直接注入 PrismaService | `modules/leave/leave.service.ts`（~30 处） | Sprint 2.2 | Authorization Refactor |
| **TD-002** | C-02 Service 直接注入 PrismaService | `modules/notice/notice.service.ts`（~25 处） | Sprint 2.2 | Authorization Refactor |
| **TD-003** | C-02 Service 直接注入 PrismaService | `modules/student/student.service.ts`（~15 处） | Sprint 2.2 | Authorization Refactor |
| **TD-004** | C-02 Service 直接注入 PrismaService | `modules/todo/todo.service.ts`（~10 处） | Sprint 2.2 | Authorization Refactor |
| **TD-005** | C-02 Service 直接注入 PrismaService | `modules/dorm/dorm.service.ts`（~8 处） | Sprint 2.2 | Authorization Refactor |
| **TD-006** | C-02 Service 直接注入 PrismaService | `modules/auth/auth.service.ts`（~5 处） | Sprint 2.2 | Authorization Refactor |
| **TD-007** | C-02 Service 直接注入 PrismaService | `modules/teacher/teacher.service.ts`（~8 处） | Sprint 2.2 | Authorization Refactor |
| **TD-008** | C-02 Service 直接注入 PrismaService | `modules/statistics/statistics.service.ts`（~10 处） | Sprint 2.2 | Authorization Refactor |
| **TD-009** | C-02 Service 直接注入 PrismaService | `modules/timeline/timeline.service.ts`（~8 处） | Sprint 2.2 | Authorization Refactor |
| **TD-010** | C-02 Service 直接注入 PrismaService | `modules/role/role.service.ts`（~6 处） | Sprint 2.2 | Authorization Refactor |
| **TD-011** | C-02 Service 直接注入 PrismaService | `modules/permission/permission.service.ts`（~5 处） | Sprint 2.2 | Authorization Refactor |
| **TD-012** | C-09 Service 自判断 Role | `leave.service.ts`（16 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-013** | C-09 Service 自判断 Role | `notice.service.ts`（3 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-014** | C-09 Guard 自判断 Role | `jwt.strategy.ts`（5 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-015** | C-03 Guard 查 Prisma + C-09 Guard 自判断 Role | `data-scope.guard.ts`（7 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-016** | C-09 Service 自判断 Role | `statistics.service.ts`（1 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-017** | C-09 Service 自判断 Role | `todo.service.ts`（1 处 ROLE_） | Sprint 2.2 | Authorization Refactor |
| **TD-018** | C-10+C-14 Service 自拼 DataScope | `data-scope.guard.ts` | Sprint 2.2 | Authorization Refactor |

**历史代码：18 项 Tech Debt。全部归入 Sprint 2.2 "Authorization Refactor" 清理。**

---

## Tech Debt 清理计划

| TD 编号 | 清理方式 | 优先级 |
| --- | --- | --- |
| TD-001~TD-011 | Service 从 PrismaService 迁移到对应 Repository | P1：Leave / Notice / Student 优先 |
| TD-012~TD-017 | ROLE_ 判断改为 AuthorizationService.hasRole / requirePermission | P1：随模块迁移同步清理 |
| TD-015 / TD-018 | data-scope.guard.ts 替换为 DataScopeResolver | P1：最先清理（Guard 是所有请求入口） |

**清理原则**：Sprint 2.2 每做一个新模块（如工作台），同时清理该模块对应的 Tech Debt。Changelog 中标记 `Resolved TD-XXX`。
