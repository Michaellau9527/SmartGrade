# ADR-007: Capability 无直接副作用，Timeline 是唯一业务事实来源

> **状态**: 冻结 | **日期**: 2026-07-20 | **作者**: 刘老师

---

## 1. 背景

Sprint 2.2 C02（Student Leave Capability）验证了六层流水线：

```
Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
```

C02 证明这条链路可以完整承载业务生命周期。但 C02 遗留了一个问题：

**Leave Capability 完成时，谁负责通知 Workbench 刷新？**

如果答案是"LeaveService 写完 LeaveRecord 后再主动调 Workbench API"，
那么每新增一个 Capability，Workbench 就要改一次。

这是不可持续的。

---

## 2. 决策

### 2.1 Capability 不允许直接产生副作用

**任何 Capability（Leave / Notice / Dorm / Task / Behavior / Attendance）只负责一件事：**

> 完成自己的业务生命周期。

**不允许做的事：**
- ❌ 发送通知（Push / SMS / 微信）
- ❌ 更新 Workbench 数据
- ❌ 调用其它 Capability 的 Service
- ❌ 触发统计计算
- ❌ 触发 AI 分析
- ❌ 触发消息推送

### 2.2 Timeline 是唯一业务事实来源

**所有业务状态变更的副作用，只能通过 Timeline 来触发。**

```
Leave
  ↓
Timeline（LEAVE_CREATED / LEAVE_APPROVED / ...）
  ↓
其它模块消费 Timeline
  ├── Notice → 监听 LEAVE_APPROVED → 发送通知
  ├── Workbench → 监听 LEAVE_GATE_LEFT → 刷新数据
  ├── Statistics → 监听所有 LEAVE_* → 重新统计
  ├── AI → 监听模式 → 生成建议
  └── Message → 监听 → 推消息
```

### 2.3 为什么 Timeline 可以承载所有副作用

TimelineEvent 已包含：
- `eventType` — 事件类型（LEAVE_CREATED / NOTICE_PUBLISHED / ...）
- `studentId` / `classId` / `gradeId` / `schoolId` — 作用域
- `operatorId` / `operatorRole` — 操作人
- `metadata` — AI 友好的业务数据
- `occurredAt` — 发生时间
- `relatedEntity` — 关联实体

**这已经足够让任何下游模块做判断：**

> "当 class_001 发生 LEAVE_GATE_LEFT 事件时，刷新 Workbench。"

不需要 Leave 模块知道 Workbench 的存在。

---

## 3. 影响范围

### 受影响代码

| 模块 | 变更 |
| --- | --- |
| **所有新 Capability** | 禁止直接调用其它模块的 Service |
| **Workbench** | 未来演化为 Timeline 消费者（v2 Roadmap） |
| **Notice** | 发布通知时只写 Timeline，由订阅者消费 |
| **Statistics** | 不直接监听业务事件，只监听 Timeline |
| **Timeline 模块** | 增加订阅/消费接口（C03 或后续 Sprint） |

### 不受影响

- 已有的 C01（Workbench）和 C02（Leave）代码不改动
- TimelineEvent schema 不改动（已有字段足够）
- TimelineRepository 的禁止规则（no update / no delete）仍然有效

---

## 4. 违反后果

如果新 Capability 直接调用其它模块：

- 每新增一个 Capability，N 个模块都要改
- 循环依赖不可避免
- 无法独立测试单个 Capability
- Timeline 成为冗余，而不是唯一事实来源

---

## 5. 验证方式

```bash
# grep 检查：CapabilityService 是否调用了非本模块的 Service
grep -r "import.*Service" src/modules/*/\*.capability-service.ts | grep -v "timeline\|repository\|domain"

# 预期结果：无匹配（只允许调用 Repository、DomainService、TimelineRepository）
```

---

## 6. 演进计划

| 阶段 | 任务 |
| --- | --- |
| **当前（C02 后）** | 冻结规则，所有新 Capability 遵守 |
| **C03 / C04** | 按需增加 Timeline 消费接口（Workbench 刷新、通知触发） |
| **v2 Roadmap** | Workbench 演化为 Timeline Projection |
| **长期** | Timeline 可能成为事件溯源（Event Sourcing）的基础 |
