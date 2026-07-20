# SmartGrade 领域模型（Domain Model）

> Version：1.2（基于 SPRINT2_DOMAIN_RULE_v1.2 冻结）
> Project：SmartGrade 智慧年级管理平台
> Status：**领域模型冻结（Domain Model Frozen）**
> Date：2026-07-18
> 维护规则：与 `SPRINT2_DOMAIN_RULE_v1.md` 同步升级

---

## 文档目的

本文件是 SmartGrade 的**领域模型唯一蓝本**。

所有 Sprint 2.1+ 的开发：

- 数据模型（Prisma / TypeORM Entity）
- API 协议（Request / Response）
- 业务逻辑（Service / Resolver）
- 单元测试

**必须**与本文档一致。

修改本文档必须同步升级 `SPRINT2_DOMAIN_RULE_v1.md`。

---

## 一、模型全景

```text
                       School（学校）
                          │
                          │ 1:N
                          ↓
                        Grade（年级）
                          │
                          │ 1:N
                          ↓
                        Class（班级）
                          │
                          │ 1:N
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                   │
        ↓                                   ↓
     Student（学生）                   Teacher（教师）
        │                                   │
        │ N:N                               │ 1:N
        ↓                                   ↓
     Parent（家长）                   User（账户）
                                            │
                                            │ 1:N
                                            ↓
                                      UserIdentity（登录方式）
        │
        │ 1:N
        ↓
   LeaveRecord（请假）
        │
        │ 1:N
        ↓
   TimelineEvent（时间轴 - 唯一历史）
```

---

## 二、实体清单（12 实体 + 1 Resolver）

| # | 实体 | 文件 | 优先级 | 状态 |
|---|------|------|--------|------|
| 1 | School | `shared/types/domain/School.ts` | P0 | ✅ v1.2 冻结 |
| 2 | Grade | `shared/types/domain/Grade.ts` | P0 | ✅ v1.2 冻结 |
| 3 | Class | `shared/types/domain/Class.ts` | P0 | ✅ v1.2 冻结 |
| 4 | Teacher | `shared/types/domain/Teacher.ts` | P0 | ✅ v1.2 冻结 |
| 5 | Student | `shared/types/domain/Student.ts` | P0 | ✅ v1.2 冻结（**双维度**） |
| 6 | Parent | `shared/types/domain/Parent.ts` | P0 | ✅ v1.2 冻结 |
| 7 | User | `shared/types/domain/User.ts` | P0 | ✅ v1.2 冻结 |
| 8 | UserIdentity | `shared/types/domain/UserIdentity.ts` | P0 | ✅ v1.2 冻结（5 提供方） |
| 9 | TimelineEvent | `shared/types/domain/TimelineEvent.ts` | P0 | ✅ v1.2 冻结（21 事件） |
| 10 | LeaveRecord | `shared/types/domain/LeaveRecord.ts` | P0 | ✅ v1.2 冻结（8 状态 + 6 原因） |
| 11 | Notice | `shared/types/domain/Notice.ts` | P0 | ✅ v1.2 冻结 |
| 12 | Task | `shared/types/domain/Task.ts` | P0 | ✅ v1.2 冻结（含 OVERDUE） |
| - | StudentStatusLocationResolver | `StudentStatusLocationResolver.ts` | P0 | ✅ v1.2 冻结（**双维度判断核心**） |

---

## 三、枚举冻结清单

| 枚举 | 取值数 | 冻结版本 | 关键规则 |
|------|--------|----------|----------|
| `StudentStatus` | 4 | v1.2 | 替代 v1.1 的 6 状态（删除 `LEAVING` 和 `DORM`） |
| `StudentLocation` | 6 | v1.2 | **新增**字段（CLASSROOM / DORM / PLAYGROUND / GATE / OFF_CAMPUS / UNKNOWN） |
| `LeaveStatus` | 8 | v4.2 | 删除 `NO_SHOW` / `EXPIRED` / `OVERDUE` |
| `LeaveReasonType` | 6 | v1.1 | **必填**，不再仅存自由文本 |
| `LeaveType` | 3 | v1.2 | 大类（病假/事假/其他） |
| `TimelineEventType` | 21 | v1.2 | 10 Leave + 3 Dorm + 2 Notice + 2 Incident + 4 Student |
| `TimelineEventSource` | 5 | v1.2 | LEAVE / DORM / NOTICE / INCIDENT / STUDENT |
| `NoticeType` | 5 | v1.2 | 普通 / 紧急 / 会议 / 放假 / 教研 |
| `NoticeStatus` | 3 | v1.2 | DRAFT / PUBLISHED / ARCHIVED |
| `NotificationTargetType` | 8 | v4 | 推送目标类型 |
| `TaskStatus` | 7 | v1.0 | **含 OVERDUE**（唯一允许的自动状态） |
| `TaskPriority` | 4 | v1.0 | URGENT / HIGH / NORMAL / LOW |
| `TaskSource` | 5 | v1.0 | 年级主任 / 班主任 / 系统模板 / 跨部门 / 其他 |
| `UserType` | 4 | v1.2 | SYSTEM_ADMIN / TEACHER / STUDENT / PARENT |
| `IdentityProvider` | 5 | v1.2 | PHONE / WECHAT / ACCOUNT / DINGTALK / FEISHU |
| `Gender` | 3 | v1.2 | MALE / FEMALE / OTHER |
| `BoardingType` | 2 | v1.2 | BOARDING / DAY_STUDENT |
| `ParentRelation` | 6 | v1.2 | 父亲 / 母亲 / 祖父 / 祖母 / 监护人 / 其他 |
| `NotifyPreference` | 4 | v1.2 | ALL / IMPORTANT_ONLY / LEAVE_ONLY / NONE |
| `SchoolType` | 4 | v1.2 | HIGH_SCHOOL / JUNIOR_HIGH / NINE_YEAR / COMPLETE |
| `SchoolStatus` | 2 | v1.2 | ACTIVE / ARCHIVED |
| `GradeStage` | 4 | v1.2 | GRADE_10 / GRADE_11 / GRADE_12 / GRADUATED |
| `GradeStatus` | 3 | v1.2 | ACTIVE / GRADUATED / ARCHIVED |
| `ClassStatus` | 3 | v1.2 | ACTIVE / GRADUATED / ARCHIVED |
| `TeacherStatus` | 3 | v1.2 | ACTIVE / ON_LEAVE / RESIGNED |
| `UserStatus` | 3 | v1.2 | ACTIVE / FROZEN / LOCKED |
| `IdentityStatus` | 2 | v1.2 | ACTIVE / DISABLED |
| `ParentStatus` | 2 | v1.2 | ACTIVE / FROZEN |
| `ReturnJudgment` | 4 | v1.2 | ON_TIME / EARLY / DELAYED / NOT_SET |

**合计**：28 个枚举 / 约 110 个枚举值。

---

## 四、核心设计原则

## 4.1 双维度状态模型（v1.2 关键）

```
Student
  ├── current_status: StudentStatus   (4 状态)
  │     ├── ON_CAMPUS      在校
  │     ├── OUT_OF_SCHOOL  离校
  │     ├── GRADUATED      已毕业
  │     └── TRANSFERRED    已转学
  │
  └── current_location: StudentLocation  (6 位置)
        ├── CLASSROOM      教室
        ├── DORM           宿舍
        ├── PLAYGROUND     操场
        ├── GATE           校门
        ├── OFF_CAMPUS     校外
        └── UNKNOWN        未知
```

### 4.1.1 双维度组合示例

| 场景 | Status | Location |
|------|--------|----------|
| 上午上课 | ON_CAMPUS | CLASSROOM |
| 课间操 | ON_CAMPUS | PLAYGROUND |
| 晚自习后住宿生 | ON_CAMPUS | DORM |
| 晚自习后走读生 | ON_CAMPUS | OFF_CAMPUS |
| 请假已批准 | ON_CAMPUS | GATE |
| 离校后未返校 | OUT_OF_SCHOOL | OFF_CAMPUS |
| 返校过程 | OUT_OF_SCHOOL | GATE |
| 销假后 | ON_CAMPUS | CLASSROOM |

## 4.2 业务事件驱动（v1.2 核心）

> ❌ 模块不直接改 `Student.current_status` 或 `current_location`。
> ✅ 业务事件 → Resolver → 状态变更。

```text
模块（Leave / GateRecord / Dorm / RollCall ...）
   ↓ 写入 TimelineEvent
StudentStatusLocationResolver
   ↓ 触发
Student.current_status + current_location
```

### 4.2.1 触发矩阵（v1.2 冻结）

| 业务事件 | StudentStatus | StudentLocation |
|----------|---------------|-----------------|
| `LEAVE_CREATED` | 不变 | 不变 |
| `LEAVE_APPROVED` | 不变 | `→ GATE` |
| `LEAVE_GATE_LEFT` | `→ OUT_OF_SCHOOL` | `→ OFF_CAMPUS` |
| `LEAVE_RETURNED` | `→ ON_CAMPUS` | `→ GATE` |
| `LEAVE_CLOSED` | 不变 | `→ CLASSROOM` |
| `LEAVE_CANCELLED` | 不变 | `→ CLASSROOM` |
| `DORM_CHECKED_IN` | 不变 | `→ DORM` |
| `DORM_CHECKED_OUT` | 不变 | `→ CLASSROOM` |
| `ROLL_CALL_PRESENT` | 不变 | `→ CLASSROOM` |
| `STUDENT_GRADUATED` | `→ GRADUATED` | `→ OFF_CAMPUS` |
| `STUDENT_TRANSFERRED` | `→ TRANSFERRED` | `→ OFF_CAMPUS` |
| 系统日终（22:00 住宿生） | 不变 | `→ DORM` |
| 系统日初（06:00 走读生） | 不变 | `→ OFF_CAMPUS` |

## 4.3 Timeline 唯一历史来源（R-013）

> 任何历史查询必须来自 Timeline。
> 不得查询多个业务表后拼接。

### 4.3.1 21 事件聚合

StudentTimeline（聚合视图，查询时合并）：

| 来源 | 事件数 | 事件 |
|------|--------|------|
| LeaveTimeline | 10 | LEAVE_CREATED / LEAVE_SUBMITTED / LEAVE_APPROVED / LEAVE_REJECTED / LEAVE_CANCELLED / LEAVE_GATE_LEFT / LEAVE_RETURNED / LEAVE_CLOSED / LEAVE_EDITED / LEAVE_RESUBMITTED |
| DormTimeline | 3 | DORM_ABSENT / DORM_LATE / DORM_CHECKED_IN |
| NoticeTimeline | 2 | NOTICE_SENT / NOTICE_READ |
| IncidentTimeline | 2 | INCIDENT_RECORDED / INCIDENT_HANDLED |
| Student 自身 | 4 | STUDENT_ENROLLED / STUDENT_GRADUATED / STUDENT_TRANSFERRED / STUDENT_STATUS_CHANGED |

### 4.3.2 永久留痕（R-014）

> Timeline 允许新增，**禁止修改，禁止删除**。

## 4.4 永久黑名单（禁止使用的旧枚举）

| 旧枚举 | 冻结版本 | 替代 |
|--------|----------|------|
| `IN_SCHOOL` | v4.1 → v1.2 删除 | `ON_CAMPUS` |
| `PENDING_LEAVE` | v4.1 → v1.2 删除 | `ON_CAMPUS + Location.GATE` |
| `LEFT_SCHOOL` | v4.1 → v1.2 删除 | `OUT_OF_SCHOOL` |
| `LEAVING` | v1.1 → v1.2 删除 | `ON_CAMPUS + Location.GATE` |
| `DORM`（StudentStatus 中） | v1.1 → v1.2 删除 | `Location.DORM` |
| `NO_SHOW` | v4.2 删除 | 不存在 |
| `EXPIRED` | v4.2 删除 | 不存在 |
| `OVERDUE` | v4.2 删除（Leave 中） | 仅 Task 可用 |
| `FINISHED` | Sprint 1 → v1.2 删除 | `CLOSED` |
| `LATE_RETURN` | v4.2 删除 | 改统计字段 `ReturnJudgment` |

---

## 五、领域用例

## 5.1 班主任工作台加载

```typescript
import { StudentStatusLocationResolver } from '@smartgrade/shared/types/domain';

async function loadClassWorkbench(classId: string, teacherId: string) {
  // 1. 加载班级学生
  const students = await studentService.findByClass(classId);

  // 2. 班主任视角统计
  const stats = {
    total: students.length,
    inSchool: StudentStatusLocationResolver.filterActuallyInSchool(students).length,
    outOfSchool: students.filter(s =>
      StudentStatusLocationResolver.isOutOfSchool(s)
    ).length,
    abnormal: students.filter(s =>
      StudentStatusLocationResolver.isAbnormal(s)
    ).length,
  };

  // 3. 加载今日待办
  const todos = await todoService.findByAssignee(teacherId, { status: 'PENDING' });

  // 4. 加载最近通知
  const notices = await noticeService.findByTeacher(teacherId, { limit: 5 });

  return { students, stats, todos, notices };
}
```

## 5.2 宿管查寝列表

```typescript
import { StudentStatusLocationResolver } from '@smartgrade/shared/types/domain';

async function loadDormCheckList(dormId: string) {
  // 1. 加载该宿舍所有学生
  const students = await studentService.findByDorm(dormId);

  // 2. v1.2 核心：自动过滤
  const shouldCheckList = StudentStatusLocationResolver.filterShouldCheckInDorm(students);

  // 3. 已登记学生
  const checked = await dormService.findCheckedIn(dormId, new Date());

  return {
    shouldCheck: shouldCheckList,
    checked: checked,
    absent: shouldCheckList.filter(s => !checked.includes(s.id)),
  };
}
```

## 5.3 请假 → 状态自动联动

```typescript
import {
  LeaveRecord,
  TimelineEvent,
  StudentStatusLocationResolver,
} from '@smartgrade/shared/types/domain';

// 1. 班主任提交请假
async function submitLeave(leave: LeaveRecord, teacherId: string) {
  // 写入 Leave 记录
  await leaveService.create(leave);

  // 写入 Timeline 事件
  const event: TimelineEvent = {
    id: generateUUID(),
    event_type: 'LEAVE_SUBMITTED',
    event_source: 'LEAVE',
    source_event_id: leave.id,
    student_id: leave.student_id,
    payload: { leave_id: leave.id },
    operator_id: teacherId,
    operator_name: '刘老师',
    occurred_at: new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    class_id: leave.class_id,
    grade_id: leave.grade_id,
    school_id: leave.school_id,
    is_system: false,
  };
  await timelineService.append(event);

  // ❌ 不要在这里改 student.status
}

// 2. Resolver 监听事件
class StudentStatusLocationResolver {
  @OnEvent('LEAVE_APPROVED')
  static async onLeaveApproved(event: TimelineEvent) {
    // ✅ 这里更新状态
    await studentService.updateLocation(event.student_id, 'GATE');
  }

  @OnEvent('LEAVE_GATE_LEFT')
  static async onLeaveGateLeft(event: TimelineEvent) {
    await studentService.updateStatusAndLocation(
      event.student_id,
      'OUT_OF_SCHOOL',
      'OFF_CAMPUS'
    );
  }
}
```

---

## 六、目录结构

```text
shared/types/domain/
├── index.ts                              # 统一导出
├── StudentStatusLocationResolver.ts      # v1.2 核心工具
│
├── School.ts                             # 学校
├── Grade.ts                              # 年级
├── Class.ts                              # 班级
├── Teacher.ts                            # 教师
├── Student.ts                            # 学生（双维度）
├── Parent.ts                             # 家长
├── User.ts                               # 账户
├── UserIdentity.ts                       # 登录身份
├── TimelineEvent.ts                      # 时间轴（21 事件）
├── LeaveRecord.ts                        # 请假（8 状态 + 6 原因）
├── Notice.ts                             # 通知
├── Task.ts                               # 待办（含 OVERDUE）
│
└── enums/
    ├── StudentStatus.ts                  # 4 状态
    ├── StudentLocation.ts                # 6 位置
    ├── UserType.ts                       # 4 类型
    ├── IdentityProvider.ts               # 5 提供方
    ├── TimelineEventType.ts              # 21 事件
    ├── TimelineEventSource.ts            # 5 来源
    ├── LeaveStatus.ts                    # 8 状态
    ├── LeaveType.ts                      # 3 大类
    ├── LeaveReasonType.ts                # 6 原因
    ├── NoticeType.ts                     # 5 类型
    ├── NoticeStatus.ts                   # 3 状态
    ├── NotificationTargetType.ts         # 8 目标
    ├── TaskStatus.ts                     # 7 状态
    ├── TaskPriority.ts                   # 4 优先级
    └── TaskSource.ts                     # 5 来源
```

---

## 七、版本管理

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-15 | Sprint 1 初始版（6 实体 + Sprint 1 旧枚举） |
| v1.1 | 2026-07-18 | v4.2 Review 补充：`leave_reason_type` / `StudentStatus` 6 状态 / 业务事件驱动 / StudentTimeline 21 事件 |
| **v1.2** | **2026-07-18** | **业务负责人最终拍板：双维度模型拆分**<br>1. `StudentStatus` 6 → 4 状态（删除 `LEAVING` 和 `DORM`）<br>2. **新增** `StudentLocation` 6 位置<br>3. `StudentStatusLocationResolver` 工具类<br>4. 12 实体全部冻结 |

---

## 八、Sprint 2.1 Day 1-3 实施计划

### Day 1：类型层（已完成）

- ✅ 12 实体 TypeScript 定义
- ✅ 28 个枚举
- ✅ `StudentStatusLocationResolver`
- ✅ `docs/domain-model.md`

### Day 2：数据库层

- Prisma schema.prisma（MySQL 8）
- 12 张实体表
- 4 张关联表（Student ↔ Parent / User ↔ UserIdentity / Class ↔ Student / 等）
- 4 张枚举表
- 索引设计：`student.current_status + current_location` 联合索引

### Day 3：Repository 层

- 12 个 Entity Repository
- 单元测试（jest）
- Mock 数据（`STUDENT_MOCK` / `LEAVE_RECORD_MOCK` 等）

### Day 4-6：Auth（手机 / 微信 / 账号）

### Day 7-10：Workbench API

### Day 11-14：小程序 Demo

---

## 九、关键提醒

- ⚠️ **不要修改已冻结的枚举**（业务规则 v1.2 锁定）
- ⚠️ **不要让模块直接改 Student.current_status / current_location**
- ⚠️ **不要新增 Timeline 顶层事件**（21 事件冻结）
- ⚠️ **不要把 `expected_return_time` 用作自动触发**
- ✅ **所有状态变更通过 Timeline 事件 → Resolver**

---

**v1.2 领域模型冻结。Sprint 2.1 Day 1 已完成。**

— End of Domain Model —
