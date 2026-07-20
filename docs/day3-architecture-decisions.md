# Day 3 架构决策记录（ADR）

> **Sprint 2.1 — Day 3**
> **日期**：2026-07-18
> **状态**：✅ 完成
> **上游规则**：[SPRINT2_DOMAIN_RULE_v1.3](../../SPRINT2_DOMAIN_RULE_v1.md)

---

## 1. 目标

按 Day 2 架构审查 5 点整改 + 实现持久层（Repository + Service + Tests），为 Sprint 2.2 Auth、Sprint 2.3 Workbench 提供稳定的数据访问底座。

---

## 2. Day 2 架构审查 5 点 — 落地结果

### 2.1 禁止直接修改 Student.current_status ✅

**决策**：在 `BaseRepository` 引入 `DirectStatusUpdateError`，所有直接改 status/location 的方法抛错。

**实现**：
- `student.repository.ts` 提供 4 个**禁止方法**：`setCurrentStatus` / `setCurrentLocation` / `updateStatus` / `updateLocation`，全部抛 `DirectStatusUpdateError`。
- 唯一合法路径：`updateStatusTimestamp(studentId, type, occurredAt)`，由 `TimelineService` 通过 Resolver 调用。
- 错误消息明确引导开发者走 TimelineService。

**测试覆盖**：
- `test4-status-protection.test.ts` — 4 个禁止方法 + 错误信息验证（5 个 it）。

### 2.2 StudentLocation 走 Resolver 驱动 ✅

**决策**：与 StudentStatus 同构 — 位置变更也必须通过 TimelineEvent 触发。

**实现**：
- `StudentStatusLocationResolver.business.ts` 统一处理**两个维度**。
- 事件 → 位置映射表（部分）：
  - `DORM_CHECKED_IN` → DORM
  - `LEAVE_GATE_LEFT` → OFF_CAMPUS
  - `LEAVE_RETURNED` → CLASSROOM
  - `STUDENT_ENROLLED` → UNKNOWN
- 每次状态变更同时写 `locationUpdatedAt` 时间戳。

**测试覆盖**：
- `test4-status-protection.test.ts` — 4 个合法路径验证（`LEAVE_GATE_LEFT` / `LEAVE_RETURNED` / `DORM_CHECKED_IN` / `NOTICE_SENT`）。

### 2.3 TeacherClassRelation 加时间字段 ✅

**决策**：增加 `startDate` / `endDate`，调岗保留历史。

**Schema 增量**：
```prisma
model TeacherClassRelation {
  // ... 原有
  startDate  DateTime  @map("start_date")
  endDate    DateTime? @map("end_date")
  // ...
}
```

**v1.3 关键方法**：
- `findCurrentHeadTeacher(classId)` — 必传 `endDate: null`
- `findCurrentRelations(teacherId)` — 同上
- `findAllRelations(teacherId)` — **不**过滤 endDate（历史用）
- `transferTeacher(...)` — `$transaction` 关闭旧关系 + 创建新关系，**保留历史 R-014**

**测试覆盖**：
- `test2-teacher-scope.test.ts` — 5 个 it，验证过滤条件 + 调岗事务。

### 2.4 expected_return_time 边界 ✅

**决策**：保留 `expected_return_time` 字段用于"今天预计返校"提醒，**不**参与自动状态判定。

**实现**：
- `LeaveRecord.expectedReturnTime` 字段已存在（v1.2 schema）。
- `LeaveRepository.autoMarkOverdue` / `autoMarkNoShow` / `autoMarkExpired` / `autoCloseOverdueReturns` 全部**禁止**（抛 v4.2 错误）。
- `LeaveService` 状态机走法：APPROVED → LEFT → RETURNED → CLOSED，无超时自动判定。

**测试覆盖**：
- `test4-status-protection.test.ts` — 4 个禁止自动状态判定方法。

### 2.5 TimelineEvent 加 relatedType/relatedId ✅

**决策**：增加 `relatedType` + `relatedId` 字段（v1.3），支持"按业务记录反查"。

**Schema 增量**：
```prisma
model TimelineEvent {
  // ... 原有
  relatedType RelatedEntityType? @map("related_type")
  relatedId   String?            @map("related_id")
  // ...
}

enum RelatedEntityType {
  LEAVE
  NOTICE
  TASK
  DORM
  INCIDENT
  STUDENT
}
```

**v1.3 关键方法**：
- `TimelineService.createEvent()` — 必须支持 relatedType/relatedId
- `TimelineRepository.findByRelated(relatedType, relatedId)` — 反查

**测试覆盖**：
- `test3-leave-timeline.test.ts` — 验证 `relatedType: 'LEAVE'` + `relatedId: leave_id` 被正确写入。

---

## 3. 持久层结构

### 3.1 目录

```
backend/src/
├── db/
│   └── prisma.client.ts          # Prisma 单例（globalThis 缓存）
├── repositories/                 # 数据访问层（无业务逻辑）
│   ├── base.repository.ts        # 基础类 + DirectStatusUpdateError
│   ├── student.repository.ts     # 核心（双维度查询 + 禁止方法）
│   ├── timeline.repository.ts    # 核心（21 事件 + 永久留痕）
│   ├── leave.repository.ts       # 核心（8 状态机 + 禁止自动判定）
│   ├── user.repository.ts        # 核心（4 UserType + 5 IdentityProvider）
│   ├── teacher.repository.ts     # 核心（v1.3 调岗事务）
│   ├── notice.repository.ts      # 第二批
│   ├── task.repository.ts        # 第二批
│   └── dorm.repository.ts        # 第二批（查寝应到）
├── services/                     # 业务编排层
│   ├── StudentStatusLocationResolver.business.ts
│   ├── timeline.service.ts       # 唯一事件入口
│   ├── student-status.service.ts # 班主任工作台 + 查寝
│   └── leave.service.ts          # 请假 8 状态机
└── __tests__/                    # 单元测试
    ├── helpers/mock-prisma.ts
    ├── test1-organization-chain.test.ts
    ├── test2-teacher-scope.test.ts
    ├── test3-leave-timeline.test.ts
    └── test4-status-protection.test.ts
```

### 3.2 分层规则（v1.3 强制）

```
Controller
  ↓
Service（业务编排 + 状态机 + Timeline 事件创建）
  ↓
Repository（数据访问 + 业务规则查询）
  ↓
Prisma Client
  ↓
Database
```

**❌ 禁止**：
- Controller 直接操作 Prisma
- Service 直接 setCurrentStatus
- Repository 包含跨表业务逻辑

### 3.3 Repository 设计原则

| 特性 | 实现 |
| --- | --- |
| 命名 | `<Entity>Repository`，单例导出 `<entity>Repository` |
| 继承 | `extends BaseRepository` |
| 写库 | `protected get db() { return prisma; }`（getter 支持 mock） |
| 软删 | `softDelete(id)` 只设 `deletedAt`（R-012） |
| 永久留痕 | Timeline 不提供 update/delete（R-014） |
| 状态保护 | 抛 `DirectStatusUpdateError`（v1.3 §8.1.1） |

### 3.4 Service 设计原则

| 特性 | 实现 |
| --- | --- |
| 命名 | `<Domain>Service`，单例导出 `<domain>Service` |
| 状态机 | Service 校验，Repository 不管 |
| Timeline 写入 | **唯一入口** `TimelineService.createEvent()` |
| 事务 | `$transaction` 包裹"事件 + 状态变更" |
| 业务事件 | 每次状态转换必须 emit Timeline |

---

## 4. 测试结果

### 4.1 单元测试（30/30 ✅）

| Suite | Tests | 状态 |
| --- | --- | --- |
| test1-organization-chain | 4 | ✅ |
| test2-teacher-scope | 5 | ✅ |
| test3-leave-timeline | 4 | ✅ |
| test4-status-protection | 17 | ✅ |
| **Total** | **30** | **✅** |

### 4.2 验收测试 4 项

| 测试 | 验证点 | 状态 |
| --- | --- | --- |
| 测试 1 | 学校→年级→班级→学生 创建链 | ✅ |
| 测试 2 | 班主任只能看到本班（endDate=null 过滤） | ✅ |
| 测试 3 | 请假自动产生 `LEAVE_CREATED` TimelineEvent | ✅ |
| 测试 4 | 禁止直接 setCurrentStatus（必须走 Resolver） | ✅ |

### 4.3 TypeScript 编译

```
✅ 8 个 Repository 文件 — 0 错误
✅ 4 个 Service 文件 — 0 错误
✅ 1 个 Resolver 文件 — 0 错误
```

### 4.4 Prisma 校验

```
✅ prisma format
✅ prisma validate (DATABASE_URL 已设)
```

---

## 5. 关键文件清单

| 文件 | 行数 | 职责 |
| --- | --- | --- |
| `db/prisma.client.ts` | 22 | Prisma 单例（globalThis 缓存） |
| `repositories/base.repository.ts` | 36 | 基类 + DirectStatusUpdateError |
| `repositories/student.repository.ts` | 195 | 学生 + 双维度查询 + 状态保护 |
| `repositories/timeline.repository.ts` | 167 | 时间轴 + 永久留痕 |
| `repositories/leave.repository.ts` | 254 | 请假 8 状态机 + 禁止自动判定 |
| `repositories/user.repository.ts` | 156 | 用户 + 4 身份 |
| `repositories/teacher.repository.ts` | 175 | 教师 + v1.3 调岗 |
| `repositories/notice.repository.ts` | 220 | 通知 |
| `repositories/task.repository.ts` | 190 | 任务 |
| `repositories/dorm.repository.ts` | 145 | 宿舍 + 查寝应到 |
| `services/StudentStatusLocationResolver.business.ts` | 140 | 事件→状态映射 |
| `services/timeline.service.ts` | 130 | 唯一事件入口 |
| `services/student-status.service.ts` | 200 | 工作台 + 查寝 |
| `services/leave.service.ts` | 320 | 请假 8 状态机 |
| `__tests__/test1-organization-chain.test.ts` | 80 | 验收 1 |
| `__tests__/test2-teacher-scope.test.ts` | 130 | 验收 2 |
| `__tests__/test3-leave-timeline.test.ts` | 120 | 验收 3 |
| `__tests__/test4-status-protection.test.ts` | 230 | 验收 4 |
| `__tests__/helpers/mock-prisma.ts` | 130 | Mock 工厂 |
| **Total** | **~3140** | — |

---

## 6. v1.3 新增冻结项摘要

详见 `SPRINT2_DOMAIN_RULE_v1.md` §8.1：

1. **§8.1.1 Repository 层强制规范** — 禁止方法必须抛错，状态变更走 Timeline。
2. **§8.1.2 TeacherClassRelation 时间字段** — startDate/endDate 必填，保留调岗历史。
3. **§8.1.3 TimelineEvent 关联字段** — relatedType/relatedId，支持业务反查。
4. **§2.5.4 Timeline 是唯一状态来源** — 任何业务表都不能直接改 Student 状态。

---

## 7. 下一阶段（Sprint 2.2 Day 4-6）

按 Sprint 2.1 计划：
- Day 4-6：Auth（账号/手机号/微信/钉钉/飞书 5 通道登录）
- 依赖：UserRepository + UserIdentity 已就绪 ✅
- 新增：`AuthService` + JWT 工具 + 登录态

---

## 8. 风险与遗留

| 项 | 描述 | 解决时机 |
| --- | --- | --- |
| 集成测试 | 单元测试 mock Prisma，未连真数据库 | Sprint 4 接 MySQL 后补 E2E |
| Sprint 1 旧代码 | `src/modules/` 是旧 v4.1 设计，与 v1.3 不兼容 | Sprint 2.2 前清理 |
| 性能基准 | 5 列联合索引 `idx_student_status_location` 未压测 | Sprint 4 |
| 唯一性约束 | `(studentId, eventSource, sourceEventId)` 复合唯一键 schema 未加 | Sprint 2.2 |
| Database URL | 沙箱无 MySQL，未做真实迁移 | 部署时执行 `v1.3_init.sql` |

---

**Day 3 完成。底座已经就绪。** ✅
