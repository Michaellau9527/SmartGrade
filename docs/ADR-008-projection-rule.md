# ADR-008: Projection Rule — 所有 View/Dashboard/Statistics/AI 都是 Projection

> **状态**: 冻结 | **日期**: 2026-07-20 | **作者**: 刘老师

---

## 1. 背景

C02（Student Leave）完成后，Architecture Baseline v1.1 确认了六层流水线：

```
Controller → CapabilityService → DomainService → Repository → Timeline → Prisma
```

但一个关键问题尚未回答：

> **Workbench、Dashboard、Statistics、AI 分析、Timeline View 这些"展示层"，在架构中扮演什么角色？**

如果它们也走 CapabilityService → DomainService → Repository 这条链路，
那么它们就变成了"伪 Capability"——只读不写，却占用了完整六层。

这会导致架构层级膨胀，违背 Baseline v1.1 "禁止新增架构层级"的规则。

---

## 2. 决策

### 2.1 架构三元组

将整个系统划分为三个角色：

```
Capability（业务能力） → Timeline（事实记录） → Projection（消费展示）
```

| 角色 | 职责 | 示例 |
| --- | --- | --- |
| **Capability** | 产生业务事实 | Leave / Notice / Dorm / Behavior / Task |
| **Timeline** | 记录业务事实 | TimelineEvent（唯一事实来源） |
| **Projection** | 消费业务事实 | Workbench / Dashboard / Statistics / Timeline View / AI |

### 2.2 Projection 的定义

**Projection 是 Timeline 的只读消费者。**

特征：
- ✅ 只读 TimelineEvent，不修改任何业务数据
- ✅ 可以有缓存（Redis、内存），但缓存 miss 时从 Timeline 重建
- ✅ 可以聚合、过滤、分页、排序
- ✅ 不拥有自己的生命周期（没有 Create / Approve / Close）

**Projection 不是 Capability，因为它不产生业务事实。**

### 2.3 数据流向（单向）

```
Leave          Notice         Dorm
  │              │              │
  └──────┬───────┘              │
         ▼                       │
      Timeline  ────────────────┘
         │
    ┌────┼────┬────────┬────────┐
    ▼    ▼    ▼        ▼        ▼
Workbench  Dashboard  Statistics  Timeline View  AI
```

**箭头永远单向。绝不允许反向。**

❌ 禁止：Workbench → 修改 Leave
❌ 禁止：Timeline View → 修改 Student
❌ 禁止：Statistics → 修改 Notice
❌ 禁止：AI → 修改任何业务数据

### 2.4 Projection 的架构层级

Projection 不走六层流水线，因为它不产生业务事实：

```
ProjectionController（GET /projections/*）
    ↓
ProjectionService（聚合 TimelineEvent）
    ↓
TimelineRepository（只读）
    ↓
Prisma
```

只有两层：Controller + ProjectionService + Repository。
不需要 DomainService（没有业务规则判断），不需要 Timeline 写入。

### 2.5 Workbench 的演化路线

**当前（C01）**：
```
WorkbenchService → StudentRepository / TaskRepository / NoticeRepository
```

**未来 v2（Projection 模式）**：
```
WorkbenchProjectionService → TimelineRepository（聚合今日事件）
```

Workbench 从"查业务表"演化为"聚合 Timeline"。
这是长期目标，当前 Sprint 不执行。

---

## 3. 影响范围

### 已有模块归类

| 模块 | 角色 | 说明 |
| --- | --- | --- |
| Leave | Capability | 产生 LEAVE_* 事件 |
| Notice | Capability | 产生 NOTICE_* 事件 |
| Workbench | Projection（当前混合模式） | C01 直接查 Repository，v2 改为 Timeline 聚合 |
| Timeline View | Projection | C07：GET /students/:id/timeline |
| Dashboard | Projection | 未来 Sprint |
| Statistics | Projection | 未来 Sprint |
| AI | Projection | 未来 Sprint |

### 禁止的行为

| 行为 | 后果 |
| --- | --- |
| Projection 调用 CapabilityService | 循环依赖，破坏单向流 |
| Projection 直接修改业务表 | Timeline 不再是唯一事实来源 |
| Projection 写 Timeline | Timeline 只能由 Capability 写入 |

---

## 4. 违反后果

如果 Projection 反向修改业务数据：

- Timeline 记录与业务状态不一致
- 无法追溯"谁在什么时候改了什么"
- AI/统计基于错误数据做决策
- 审计链条断裂

---

## 5. 验证方式

```bash
# grep 检查：Projection 模块是否 import 了业务 Repository
grep -r "import.*Repository" src/modules/workbench/*.ts | grep -v "timeline\|base"

# 预期结果：Workbench 外，其他 Projection 模块不 import LeaveRepository / NoticeRepository 等
```

```bash
# grep 检查：Projection 模块是否调用了 write 方法
grep -r "\.create\|\.update\|\.delete\|\.save" src/projections/*/

# 预期结果：无匹配（Projection 只读）
```

---

## 6. 演进计划

| 阶段 | 任务 |
| --- | --- |
| **当前（C03 起）** | 冻结规则，所有新模块明确角色（Capability / Projection） |
| **C07** | Student Timeline View（第一个纯 Projection） |
| **Sprint 3** | Dashboard / Statistics Projection |
| **v2 Roadmap** | Workbench 从混合模式演化为纯 Projection |
| **长期** | AI Projection（基于 Timeline 做行为分析） |
