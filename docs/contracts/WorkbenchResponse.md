# WorkbenchResponse Contract

> **Sprint 2.2 C01** | **Version**: 1.1 | **Status**: 冻结
> **API**: `GET /workbench`

---

## 1. 概述

Workbench 是 SmartGrade 的核心入口，围绕 **"今天"（Today's Work）** 设计。

所有端（微信小程序 / Admin / Web）共用同一份 Contract。

---

## 2. 响应结构

```typescript
interface WorkbenchResponse {
  today: WorkbenchToday;
  todos: WorkbenchTodo[];
  studentStatusSummary: StudentStatusSummary;
  recentNotices: WorkbenchNotice[];
  quickActions: QuickAction[];
}
```

---

## 3. 字段定义

### 3.1 WorkbenchToday

| 字段 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| `date` | `string` | `"2026-07-20"` | 日期 YYYY-MM-DD |
| `week` | `string` | `"Monday"` | 星期几（英文全称） |
| `semesterWeek` | `number` | `18` | 本学期第几周 |
| `isSchoolDay` | `boolean` | `true` | 是否上学日（节假日/周末/寒暑假） |

### 3.2 StudentStatusSummary

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `totalStudents` | `number` | 管理学生总数（按 DataScope 过滤） |
| `onCampus` | `number` | 在校人数 |
| `outOfSchool` | `number` | 离校人数（含请假已走） |
| `studentsLeaving` | `number` | 尚未完成离校/返校闭环的学生数 |
| `overdueReturn` | `number` | 逾期未返校 |
| `dormAbnormal` | `number` | 宿舍异常（仅宿管可见） |

### 3.3 WorkbenchTodo

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 待办 ID |
| `title` | `string` | 标题 |
| `type` | `WorkbenchTodoType` | 类型枚举 |
| `status` | `WorkbenchTodoStatus` | 状态枚举 |
| `dueAt` | `string \| null` | 截止时间（ISO 8601） |
| `sourceType` | `WorkbenchTodoSource \| null` | 关联来源 |
| `sourceId` | `string \| null` | 关联来源 ID |

**WorkbenchTodoType**: `LEAVE_APPROVE` | `TASK_COMPLETE` | `DORM_CHECK` | `INCIDENT_HANDLE` | `OTHER`

**WorkbenchTodoStatus**: `PENDING` | `IN_PROGRESS` | `COMPLETED` | `OVERDUE`

### 3.4 WorkbenchNotice

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 通知 ID |
| `title` | `string` | 标题 |
| `noticeType` | `WorkbenchNoticeType` | 类型枚举 |
| `publishedAt` | `string` | 发布时间（ISO 8601） |
| `isRead` | `boolean` | 是否已读 |

**WorkbenchNoticeType**: `NOTICE` | `URGENT` | `MEETING` | `HOLIDAY` | `TEACHING`

### 3.5 QuickAction

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `string` | 操作编码（对应 PermissionCode） |
| `label` | `string` | 显示标签 |
| `requiredPermission` | `string` | 需要的权限 |

> 图标（icon）由前端根据 `code` 映射，API 不返回。

---

## 4. Mock 示例

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
    "totalStudents": 0,
    "onCampus": 0,
    "outOfSchool": 0,
    "studentsLeaving": 0,
    "overdueReturn": 0,
    "dormAbnormal": 0
  },
  "recentNotices": [],
  "quickActions": []
}
```

---

## 5. 权限要求

- **访问权限**: `workbench.view`（所有登录用户都有）
- **quickActions 动态生成**: 根据当前用户的 `permissionSet` 过滤

---

## 6. 变更规则

API 响应结构的变更必须**先改此 Contract，再改代码**。

新增字段必须是可选字段（`?`）或赋予默认值，保证向后兼容。

删除字段需要跨 Sprint 评审，禁止在 Capability 内删除。
