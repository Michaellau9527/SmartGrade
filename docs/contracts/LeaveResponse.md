# LeaveResponse Contract

> **Sprint 2.2 C02** | **Version**: 1.0 | **Status**: 冻结
> **Capability**: Student Leave（学生请假生命周期）

---

## 1. 概述

Leave Capability 围绕"请假生命周期"设计，不是 CRUD。

主线流程：
```
创建请假 → 审批 → 学生离校 → 学生返校 → 完成
```

---

## 2. API 列表

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/leaves` | 创建请假 | `leave.create` |
| GET | `/leaves` | 请假列表（按 DataScope） | `leave.read` |
| GET | `/leaves/:id` | 请假详情（含 Timeline） | `leave.read` |
| POST | `/leaves/:id/approve` | 审批通过 | `leave.approve` |
| POST | `/leaves/:id/reject` | 驳回 | `leave.approve` |
| POST | `/leaves/:id/confirm-left` | 确认离校 | `leave.confirmLeft` |
| POST | `/leaves/:id/confirm-returned` | 确认返校 | `leave.confirmReturn` |
| POST | `/leaves/:id/close` | 销假完成 | `leave.close` |
| POST | `/leaves/:id/cancel` | 取消请假 | `leave.create` |

---

## 3. 生命周期

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

每次状态转换写 TimelineEvent（强一致，同事务）。

---

## 4. Timeline 事件映射

| 状态转换 | TimelineEventType | 说明 |
| --- | --- | --- |
| → PENDING | `LEAVE_CREATED` | 创建请假 |
| PENDING → APPROVED | `LEAVE_APPROVED` | 审批通过 |
| PENDING → REJECTED | `LEAVE_REJECTED` | 驳回 |
| APPROVED → LEFT | `LEAVE_GATE_LEFT` | 确认离校 |
| LEFT → RETURNED | `LEAVE_RETURNED` | 确认返校 |
| RETURNED → CLOSED | `LEAVE_CLOSED` | 销假完成 |
| PENDING → CANCELLED | `LEAVE_CANCELLED` | 取消 |

---

## 5. 响应结构

### LeaveResponse

```typescript
interface LeaveResponse {
  id: string;
  leaveNo: string;
  status: LeaveStatus;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  expectedReturnTime: string | null;
  actualLeftAt: string | null;
  actualReturnedAt: string | null;
  closedAt: string | null;
  applicantId: string;
  applicantName: string;
  approverId: string | null;
  approverName: string | null;
  approveRemark: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  cancelReason: string | null;
  timeline: LeaveTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}
```

### LeaveListItem

```typescript
interface LeaveListItem {
  id: string;
  leaveNo: string;
  status: LeaveStatus;
  studentId: string;
  studentName: string;
  className: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  startAt: string;
  endAt: string;
  applicantName: string;
  createdAt: string;
}
```

---

## 6. 六层流水线

```
Controller
    ↓
LeaveCapabilityService（编排：创建 + Timeline + 事务）
    ↓
LeaveDomainService（规则：状态机校验）
    ↓
LeaveRepository + TimelineRepository
    ↓
TimelineEvent（强一致）
    ↓
Prisma
```

---

## 7. 变更规则

API 响应结构的变更必须**先改此 Contract，再改代码**。

新增字段必须是可选字段（`?`）或赋予默认值，保证向后兼容。

删除字段需要跨 Sprint 评审，禁止在 Capability 内删除。
