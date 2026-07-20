# Sprint 2.2 Plan — 班主任工作台（Today's Work）

> **上游规则**：Architecture Baseline v1.0 + ADR-005 + ADR-006 + ARCHITECTURE_CHECKLIST
> **日期**：2026-07-20
> **状态**：Feature Development 阶段（C01 已完成，进入 C02）

---

## 0. 阶段声明

**Sprint 2.2 已正式进入稳定的 Feature Development 阶段。**

从现在开始：
- ❌ 不再新增基础架构
- ❌ 不再扩充底层抽象
- ✅ 围绕 Student Timeline，把每一个业务 Capability 做成完整闭环

这是产品从"架构设计"走向"真正可用"的关键阶段。

---

## 1. Sprint 目标

**验证 Architecture Baseline v1.0 是否能支撑业务持续生长。**

不再以"Day X"推进，改以 Capability（业务能力）为单位。每个 Capability 按 DoD 验收。

---

## 2. 推进方式

一个 Capability 一个 Capability 地完成。

每完成一个 Capability，Review 通过后再开始下一个。

**禁止一次写完整个 Sprint。**

---

## 3. Capability 清单

| # | Capability | 说明 | 状态 |
| --- | --- | --- | --- |
| **C01** | Workbench（今日工作） | `GET /workbench` — 聚合首页数据 | ✅ 完成 |
| **C02** | Student Leave（学生请假） | 请假创建 → 审批 → 离校 → 返校 → 完成 | ✅ 完成 |
| **C03** | Student Notice（学生通知） | Draft → Published → Read → Acknowledged | ✅ 完成 |
| **C04** | Student Behavior（学生行为） | 行为记录 + 处理 | 待开始 |
| **C05** | Student Dorm（学生宿舍） | 查寝 → 异常 → 处理 | 待开始 |
| **C06** | Student Task（学生任务） | 任务分配 + 完成 | 待开始 |
| **C07** | Student Timeline View（学生时间线视图） | GET /students/:id/timeline — Projection，不是 Capability | 待开始 |

### 命名规范

统一使用 **Student XXX Capability** 格式：
- Student Leave / Student Notice / Student Task / Student Status
- 以后可能还有：Student Behavior / Student Dorm / Student Attendance / Student Timeline

所有 Capability 最终都会写 Timeline。

---

## 4. Capability 设计原则：Who / What / When / Result

从 C02 开始，每个 Capability 都必须回答四个问题：

| 问题 | 含义 | 对应 |
| --- | --- | --- |
| **Who?** | 谁操作？谁 affected？ | CurrentActor（操作者）+ Student（被操作学生） |
| **What?** | 现在是什么状态？ | Domain Model（Leave.status / Student.currentStatus） |
| **When?** | 什么时候发生？ | TimelineEvent.occurredAt |
| **Result?** | 结果是什么？ | TimelineEvent.metadata + Domain Model 终态 |

例如 Leave：

| 问题 | 答案 |
| --- | --- |
| Who? | 张三 |
| What? | 请假 |
| When? | 2026-07-20 |
| Result? | 已返校（CLOSED） |

这四个问题本质上就是 **StudentTimeline** 的一条记录。

以后所有 Capability 的业务变更，最终都会写成 Timeline 上的一条事实记录。Timeline 不是日志，而是业务事实。

---

## 5. C02 Student Leave Capability — 边界定义

### 唯一目标

一句话：让学生的一次请假，从开始到结束，完整地流过整个系统。

不要想着做"请假模块"，而是做"请假生命周期（Leave Lifecycle）"。

### 第一版只做主线

```
创建请假 → 审批 → 学生离校 → 学生返校 → 完成
```

这就是 Domain Rule v1.2 定义的那条主线。

### 第一版明确不做

- ❌ 统计
- ❌ 提醒
- ❌ 分析
- ❌ 批量
- ❌ 导出
- ❌ AI

### C02 Who / What / When

| 维度 | Leave 的回答 |
| --- | --- |
| **Who?** | 班主任创建 / 政教审批 / 门卫扫码离校 / 班主任确认返校 |
| **What?** | PENDING → APPROVED → LEFT → RETURNED → CLOSED |
| **When?** | 每次状态转换写 TimelineEvent（LEAVE_CREATED / LEAVE_APPROVED / LEAVE_LEFT / LEAVE_RETURNED / LEAVE_CLOSED） |

---

## 5.1 冻结规则：六层流水线

从 C02 起，所有 Capability 固定采用六层流水线：

```
Controller
    ↓
Capability Service（业务编排）
    ↓
Domain Service（业务规则）
    ↓
Repository
    ↓
Timeline
    ↓
Prisma
```

| 层 | 职责 | 不允许 |
| --- | --- | --- |
| **Controller** | 接收 HTTP 请求，调用 CapabilityService | ❌ 业务逻辑 |
| **CapabilityService** | "这一件事情怎么完成"——编排多步骤 | ❌ 直接查 Prisma |
| **DomainService** | "业务规则是什么"——状态机校验、规则判断 | ❌ 改 Student 状态 |
| **Repository** | 数据读写 | ❌ 判断业务规则 |
| **Timeline** | 记录事件 | ❌ update / delete |
| **Prisma** | 数据库 | — |

---

## 5.2 冻结规则：Timeline 强一致

**任何业务状态发生变化，TimelineEvent 必须写成功，否则整个事务回滚。**

```
创建请假
    ↓
LeaveRecord 创建
    ↓
Timeline 写 LEAVE_CREATED     ← 必须成功
    ↓
Commit
```

Timeline 不是"尽量记录"，而是**业务事实（Business Fact）**。

以后 AI、统计、行为分析都依赖 Timeline，所以它必须完整。

**实现方式**：LeaveRecord 更新 + TimelineEvent 创建在同一个 Prisma 事务内完成。

---

## 5.3 冻结规则：Leave 生命周期

```
PENDING（已创建，待审批）
    │
    ▼
APPROVED（已审批）
    │
    ▼
LEFT（已离校）
    │
    ▼
RETURNED（已返校）
    │
    ▼
CLOSED（已结束）

异常分支：
PENDING → REJECTED（审批拒绝）
PENDING → CANCELLED（申请人取消）
```

**简化原则**：
- 不使用 DRAFT 状态（创建即提交）
- 状态机只允许正向流转 + 两个取消分支
- 任何非法转换由 DomainService 抛出错误

---

## 5.4 冻结规则：Domain Service 不允许改 Student

继续坚持 Day 3 的原则：

```
❌ 错误：
leaveService.approve()
student.currentStatus = ...

✅ 正确：
LeaveService
    ↓
StudentStatusResolver（决定是否需要改状态）
    ↓
Timeline（记录事件）
    ↓
Student.updateStatusTimestamp（仅更新时间戳）
```

Student 永远只有一个入口。

---

## 5.5 C02 Definition of Done（精简版）

只要六条：

| # | 检查项 |
| --- | --- |
| **D-01** | 能创建请假 |
| **D-02** | 能审批请假 |
| **D-03** | 能办理离校 |
| **D-04** | 能办理返校 |
| **D-05** | Timeline 完整 |
| **D-06** | 全链路测试通过 |

达到这六条，就结束 C02。

---

## 5.6 里程碑：Capability Flow 图

从 C02 开始，每个 Capability 最后都补一张 Capability Flow 图：

```
学生提交请假
        │
        ▼
班主任审批
        │
        ▼
学生离校
        │
        ▼
学生返校
        │
        ▼
Timeline
        │
        ▼
Workbench 自动刷新
```

这张图的价值：
- README 可以直接展示
- 新成员可以快速理解业务
- 将来接入 AI，也能直接根据流程图定位事件节点

---

## 6. C03 Student Notice Capability — 边界定义

### 唯一目标

一句话：让一次通知，从发布到被确认阅读，完整地流过整个系统。

**不是做"通知模块"，而是做"通知生命周期（Notice Lifecycle）"。**

### 第一版只做生命周期

```
Draft（草稿） → Published（已发布） → Read（已读） → Acknowledged（已确认）
```

**不是 CRUD。** Notice 不是文章，而是一次通知事件。

### 第一版明确不做

- ❌ 通知编辑器（富文本、附件上传）
- ❌ 定时发布
- ❌ 通知模板
- ❌ 阅读统计（Dashboard）
- ❌ 未读提醒
- ❌ 通知撤回（Publish 后不可撤回）

### C03 Who / What / When / Result

| 维度 | Notice 的回答 |
| --- | --- |
| **Who?** | 班主任发布 / 家长/学生阅读并确认 |
| **What?** | DRAFT → PUBLISHED → READ → ACKNOWLEDGED |
| **When?** | 每次状态转换写 TimelineEvent |
| **Result?** | ACKNOWLEDGED（家长已确认阅读） |

### Timeline Validation

C03 必须验证以下 Timeline 事件完整写入：

| 检查项 | 事件类型 |
| --- | --- |
| ✅ | NOTICE_CREATED |
| ✅ | NOTICE_PUBLISHED |
| ✅ | NOTICE_READ |
| ✅ | NOTICE_ACKNOWLEDGED |

### C03 Definition of Done

| # | 检查项 |
| --- | --- |
| **D-01** | 能创建通知草稿 |
| **D-02** | 能发布通知 |
| **D-03** | 能标记已读 |
| **D-04** | 能确认阅读（Acknowledge） |
| **D-05** | Timeline 完整（4 种事件） |
| **D-06** | 全链路测试通过 |

达到这六条，就结束 C03。

---

## 7. 架构三元组（ADR-007 + ADR-008）

```
Capability（业务能力） → Timeline（事实记录） → Projection（消费展示）
```

| 角色 | 职责 | 示例 |
| --- | --- | --- |
| **Capability** | 产生业务事实 | Leave / Notice / Dorm / Behavior / Task |
| **Timeline** | 记录业务事实 | TimelineEvent（唯一事实来源） |
| **Projection** | 消费业务事实 | Workbench / Dashboard / Statistics / Timeline View / AI |

**数据流向永远单向。** Projection 不修改业务数据。

---

## 8. Workbench API 设计（C01 已完成）

### `GET /workbench`

```json
{
  "today": {
    "date": "2026-07-20",
    "week": "Monday",
    "semesterWeek": 18,
    "isSchoolDay": true
  },
  "todos": [],
  "studentStatusSummary": {
    "totalStudents": 45,
    "onCampus": 43,
    "outOfSchool": 1,
    "studentsLeaving": 1,
    "overdueReturn": 0,
    "dormAbnormal": 0
  },
  "recentNotices": [],
  "quickActions": [
    { "code": "leave.create", "label": "发起请假", "requiredPermission": "leave.create" },
    { "code": "notice.publish", "label": "发布通知", "requiredPermission": "notice.publish" }
  ]
}
```

### Workbench 聚合器架构

```
WorkbenchService（纯聚合器，永远只是组合）
    ├── TodoProvider          → TaskRepository
    ├── StudentStatusProvider  → StudentRepository
    ├── NoticeProvider         → NoticeRepository
    └── QuickActionProvider    → permissionSet 动态过滤
```

以后新增 AIActionProvider / DormActionProvider / EmergencyActionProvider 都不会动 WorkbenchService。

---

## 7. Baseline 验证规则（每个 Capability 必须证明）

开始做任何业务模块前，先回答以下问题：

| # | 检查项 | Workbench | Student Leave |
| --- | --- | --- | --- |
| B-01 | 是否使用 `AuthorizationContext`？ | ✅ | ✅ |
| B-02 | 是否使用 `Timeline`？ | ✅（只读） | ✅（强一致） |
| B-03 | 是否使用 `Repository`？ | ✅ | ✅ |
| B-04 | 是否不直接改 `StudentStatus`？ | ✅（只读） | ✅（只更新时间戳） |
| B-05 | 是否不直接查 `Prisma`？ | ✅ | ✅ |
| B-06 | 是否不新增 `Role`？ | ✅ | ✅ |
| B-07 | 是否不新增 `Permission`？ | ✅ | ✅ |
| B-08 | 是否不新增架构层级？ | ✅ | ✅ |
| B-09 | Capability 是否无直接副作用？ | — | ✅ |

**如果全部满足 → Baseline 成功。否则 → 不是改业务，而是回来修 Architecture。**

---

## 8. 验收标准（4 项精简版）

从 C01 起，每完成一个 Capability，只检查四件事：

1. **业务是否闭环**（用户能不能真正使用）
2. **是否复用了已有能力**（不要重复写逻辑）
3. **是否破坏 Baseline**（架构边界是否保持）
4. **测试是否通过**

不再花大量时间写新的 ADR 或设计文档，除非确实发生了架构级变化。

---

## 9. Definition of Done（DoD）

每个 Capability 完成后，按以下清单验收：

| # | 检查项 | 说明 |
| --- | --- | --- |
| **D-01** | API 完成 | Controller + 路由 + DTO 定义 |
| **D-02** | Service 完成 | 业务编排，不直接用 Prisma |
| **D-03** | Repository 完成 | 数据访问，只认 DataScope |
| **D-04** | Timeline 接入 | 业务变更产生 TimelineEvent |
| **D-05** | Authorization 接入 | Guard 拦截 + requirePermission |
| **D-06** | DataScope 接入 | 列表/统计按 DataScope 过滤 |
| **D-07** | 单元测试 | Service + Repository 测试通过 |
| **D-08** | Mock 数据 | 可脱离前端独立验证 API |
| **D-09** | CHANGELOG | 记录 Capability 完成内容 |
| **D-10** | Architecture Checklist 无新增 Violation | `grep` 检查通过 |

**10 项全部打勾 → Capability 完成。**

---

## 10. 冻结内容

Architecture Baseline **v1.1** 冻结，Sprint 2.2 不修改底层架构。

**v1.1 新增规则**：任何新增 Capability，不允许新增新的架构层级（禁止 Manager / Facade / Helper / UtilService / Middleware / Processor 等中间层）。Capability 必须落在固定六层内。

如果发现 Baseline 真正影响开发效率的问题，通过 ADR 演进（只有 3 类情况允许：修改架构 / 修改数据库 / 跨模块重构）。

---

## 11. C01 完成记录

- **WorkbenchService**：纯聚合器，依赖 4 个 Provider 接口
- **Provider 模式**：TodoProvider / StudentStatusProvider / NoticeProvider / QuickActionProvider
- **测试**：20/20 通过（test7）
- **总测试**：50/50 通过（test6 + test7）
- **明确不做**：Redis / Dashboard / 实时推送 / WebSocket / 图表 / AI / 自定义工作台

---

## 12. C02 完成记录

- **DoD 6 项全部达成**：
  - ✅ 能创建请假（PENDING）
  - ✅ 能审批请假（APPROVED / REJECTED）
  - ✅ 能办理离校（LEFT）
  - ✅ 能办理返校（RETURNED → CLOSED）
  - ✅ Timeline 完整（7 种事件类型，同事务强一致）
  - ✅ 全链路测试通过（33/33）
- **六层流水线首次落地**：Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
- **新增 ADR-007**：Capability 无直接副作用，Timeline 是唯一业务事实来源
- **Capability Flow 图**：学生提交请假 → 班主任审批 → 学生离校 → 学生返校 → Timeline → Workbench 自动刷新
- **测试**：33/33 通过（test8），总测试 83/83 通过（test6 + test7 + test8）
- **明确不做**：统计 / 提醒 / 分析 / 批量 / 导出 / AI

---

## 13. C03 完成记录

- **DoD 6 项全部达成**：
  - ✅ 能创建通知草稿（DRAFT）
  - ✅ 能发布通知（PUBLISHED）
  - ✅ 能标记已读（READ）
  - ✅ 能确认阅读（ACKNOWLEDGED）
  - ✅ Timeline 完整（4 种事件类型，同事务强一致）
  - ✅ 全链路测试通过（33/33）
- **六层流水线再次验证**：Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
- **Capability Flow 图**：班主任创建通知草稿 → 发布通知 → 教师阅读 → 确认阅读 → Timeline → Workbench 自动刷新
- **测试**：33/33 通过（test9），总测试 116/116 通过（test6 + test7 + test8 + test9）
- **明确不做**：通知编辑器 / 定时发布 / 通知模板 / 阅读统计 / 未读提醒 / 通知撤回
