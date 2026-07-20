# Sprint 2 业务规则冻结（Domain Rule v1.3）

> Version：1.3（v1.2 + Day 2 架构审查补充冻结）
> Project：SmartGrade 智慧年级管理平台
> Status：**业务规则冻结（Business Rule Frozen）**
> 上游文档：[SPRINT2_PLANNING_v4.2.md](./SPRINT2_PLANNING_v4.2.md)（业务规则补丁）
> Date：2026-07-18（v1.3 升级同日）
> 生效范围：Sprint 2.1 起的所有编码、测试、运维
> 版本说明：v1.3 = v1.2 + Day 2 架构审查补充 3 条冻结（业务事件驱动 / TeacherClassRelation 时间字段 / TimelineEvent 关联字段）
> 重大变更：
> 1. **第 8.1 章 R-013 加强**：Repository 层禁止暴露 `updateStatus` / `updateLocation`
> 2. **§9.1 冻结 22 条 → 25 条**：新增 TeacherClassRelation 时间字段 / TimelineEvent 关联字段 / Repository 强制规范

---

## 文档目的

本文件是 SmartGrade 的**业务规则最高冻结文档**。

v4.2 完成**业务规则校准**（删除 NO_SHOW / EXPIRED / OVERDUE 等企业考勤思维状态）后，把所有业务规则沉淀到这一份**独立、不可变**的文档。

后续所有：

- 数据模型
- 接口
- 状态机
- 角色权限
- 通知/任务/宿舍流程
- 测试用例

**必须**与本文档一致。

> ⚠️ **冻结原则**：本文件 v1.0 冻结后，任何修改必须经过：
> 1. Project Rule 修订流程
> 2. 业务评审
> 3. 版本号升级（v1.1 / v1.2 ...）

---

# 第一章 请假规则

## 1.1 产品边界

> 请假 = 学生离校前的**审批流程**。
> 请假 ≠ 行程管理 ≠ 考勤系统。

请假解决的是：**班主任发起 → 年级审批 → 门卫确认离校 → 班主任确认返校 → 销假** 这条闭环。

## 1.2 状态机（8 状态 - 强制）

| 状态 | Key | 含义 | 触发者 |
|------|-----|------|--------|
| 草稿 | `DRAFT` | 班主任填写中 | 班主任 |
| 待审批 | `PENDING` | 已提交待审核 | 系统 |
| 已批准 | `APPROVED` | 年级通过，待离校 | 年级主任 |
| 已驳回 | `REJECTED` | 年级驳回，可改后重提 | 年级主任 |
| 已取消 | `CANCELLED` | 班主任主动取消 | 班主任 |
| 已离校 | `LEFT` | 门卫/班主任确认离开 | 门卫/班主任 |
| 已返校 | `RETURNED` | 班主任确认回校 | 班主任 |
| 已销假 | `CLOSED` | 班主任销假 | 班主任 |

### 1.2.1 状态转移矩阵（冻结）

| From | To | 触发 |
|------|----|----|
| `DRAFT` | `PENDING` | 班主任提交 |
| `DRAFT` | `CANCELLED` | 班主任取消 |
| `PENDING` | `APPROVED` | 年级通过 |
| `PENDING` | `REJECTED` | 年级驳回 |
| `PENDING` | `CANCELLED` | 班主任取消 |
| `REJECTED` | `DRAFT` | 改后重提 |
| `REJECTED` | `CANCELLED` | 不再提交 |
| `APPROVED` | `LEFT` | 门卫/班主任确认离校 |
| `APPROVED` | `CANCELLED` | 班主任取消 |
| `LEFT` | `RETURNED` | 班主任确认返校 |
| `LEFT` | `CANCELLED` | 紧急撤销 |
| `RETURNED` | `CLOSED` | 班主任销假 |

### 1.2.2 禁止的状态（永久黑名单）

以下状态**永久禁止**出现在任何代码、文档、接口中：

- ❌ `NO_SHOW`（"已批准未到"）
- ❌ `EXPIRED`（"已过期"）
- ❌ `OVERDUE`（"已逾期"）
- ❌ `LATE_RETURN`（"晚归"）

> 这些是企业考勤思维，**不**符合高中请假实际。

## 1.3 字段语义（冻结）

### 1.3.1 LeaveRecord 核心字段

```typescript
interface LeaveRecord {
  id: string;                          // 唯一编号
  student_id: string;                  // 学生 ID
  leave_type: 'SICK' | 'PERSONAL' | 'OTHER';  // 请假类型（大类）
  leave_reason_type: LeaveReasonType;  // 请假原因分类（v1.1 冻结 - 必填）
  reason: string;                      // 请假原因（自由文本 - 必填）
  start_at: Date;                      // 实际开始时间（必须）
  end_at: Date;                        // 请假结束时间（必须）
  expected_return_time?: Date;         // 预计返校时间（可选，参考）
  expected_return_note?: string;       // 预计返校备注
  status: LeaveStatus;                 // 8 状态枚举
  applicant_id: string;                // 申请人（班主任）
  approver_id?: string;                // 审批人（年级主任）
  attachments?: Attachment[];          // 附件
  created_at: Date;
  updated_at: Date;
  // ❌ 禁止字段：
  // - no_show_at, expired_at, overdue_at
  // - auto_close_at, system_judge_flag
}
```

### 1.3.1.1 `leave_reason_type` 枚举（v1.1 冻结 - 必填）

> **重要**：不要只存 `reason: "肚子疼"` 这种自由文本。
> 未来需要做请假统计分析（年级主任看板、Sprint 3 数据分析）必须**结构化**。

```typescript
type LeaveReasonType =
  | 'ILLNESS'           // 身体原因（生病、受伤）
  | 'PERSONAL'          // 个人事务
  | 'FAMILY'            // 家庭原因（家中有事、直系亲属）
  | 'SPORT'             // 体育比赛 / 训练
  | 'SCHOOL_ACTIVITY'   // 学校集体活动（不是请假，但走请假流程销假）
  | 'OTHER';            // 其他
```

| 枚举值 | 中文 | 场景示例 |
|--------|------|----------|
| `ILLNESS` | 身体原因 | 胃疼、发烧、受伤 |
| `PERSONAL` | 个人事务 | 补办身份证、办理个人证件 |
| `FAMILY` | 家庭原因 | 父母有事、亲属来访 |
| `SPORT` | 体育/训练 | 市级体育比赛、专项训练 |
| `SCHOOL_ACTIVITY` | 学校活动 | 集体外出活动走请假销假 |
| `OTHER` | 其他 | 上述未覆盖 |

**规则**：

- ✅ `leave_reason_type` **必填**（请假申请时必须选择）
- ✅ `reason` **必填**（自由文本补充说明）
- ✅ 两个字段**同时**保存
- ❌ 禁止只存自由文本 `reason`
- ❌ 禁止后续业务把 `reason` 解析为 `leave_reason_type`

**未来统计示例**（Sprint 3 数据分析）：

```typescript
interface LeaveReasonStats {
  month: string;                       // 2026-07
  grade_id: string;
  total: number;
  by_reason: {
    ILLNESS: number;                   // 62%
    PERSONAL: number;                  // 5%
    FAMILY: number;                    // 20%
    SPORT: number;                     // 3%
    SCHOOL_ACTIVITY: number;           // 8%
    OTHER: number;                     // 2%
  };
  percentage: {
    ILLNESS: number;                   // 0.62
    FAMILY: number;                    // 0.20
    OTHER: number;                     // 0.18
  };
}
```

### 1.3.2 `expected_return_time` 语义

| 用法 | 允许 |
|------|------|
| ✅ 在请假详情页显示 | 允许 |
| ✅ 在班级看板上提醒"今日待返校 N 人" | 允许 |
| ✅ 统计"按时返校率" | 允许 |
| ✅ 工作台提醒"今日有 1 名学生预计返校" | 允许 |
| ❌ 触发 `LEFT → OVERDUE` 状态转换 | **禁止** |
| ❌ 自动发送"逾期未返校"告警 | **禁止** |
| ❌ 自动强制销假 | **禁止** |

> **核心**：返校由**人**确认，不由系统计时。

## 1.4 LeaveTimeline（10 事件 - 冻结）

```typescript
type LeaveTimelineEventType =
  | 'LEAVE_CREATED'      // 班主任创建
  | 'LEAVE_SUBMITTED'    // 提交
  | 'LEAVE_APPROVED'     // 年级通过
  | 'LEAVE_REJECTED'     // 年级驳回
  | 'LEAVE_CANCELLED'    // 班主任取消
  | 'LEAVE_GATE_LEFT'    // 门卫/班主任确认离校
  | 'LEAVE_RETURNED'     // 班主任确认返校
  | 'LEAVE_CLOSED'       // 销假
  | 'LEAVE_EDITED'       // 班主任修改请假内容
  | 'LEAVE_RESUBMITTED'; // 改后重提
```

### 1.4.1 事件与状态的对应关系

| 事件 | 触发时机 | 写入的状态 |
|------|---------|-----------|
| `LEAVE_CREATED` | 班主任创建 | `DRAFT` |
| `LEAVE_SUBMITTED` | 提交 | `DRAFT → PENDING` |
| `LEAVE_APPROVED` | 年级通过 | `PENDING → APPROVED` |
| `LEAVE_REJECTED` | 年级驳回 | `PENDING → REJECTED` |
| `LEAVE_CANCELLED` | 班主任取消 | `* → CANCELLED` |
| `LEAVE_GATE_LEFT` | 门卫/班主任登记 | `APPROVED → LEFT` |
| `LEAVE_RETURNED` | 班主任确认返校 | `LEFT → RETURNED` |
| `LEAVE_CLOSED` | 销假 | `RETURNED → CLOSED` |
| `LEAVE_EDITED` | 修改请假内容 | 状态不变 |
| `LEAVE_RESUBMITTED` | 改后重提 | `REJECTED → DRAFT → PENDING` |

### 1.4.2 禁止的事件

- ❌ `LEAVE_NO_SHOW`
- ❌ `LEAVE_EXPIRED`
- ❌ `LEAVE_OVERDUE`
- ❌ `LEAVE_LATE_RETURN`
- ❌ `LEAVE_AUTO_*`（任何自动事件）

---

# 第二章 离校规则

## 2.1 离校定义

> 离校 = 学生在工作日**实际离开校园**的事实记录。
> 离校**不**是审批，**不**触发状态变化由系统自动完成。

## 2.2 离校的两种登记方式

| 方式 | 入口 | 操作人 | 状态变更 |
|------|------|--------|----------|
| 门卫扫码 | 小程序门卫端 | 门卫 | `APPROVED → LEFT` |
| 班主任手动 | 班主任工作台 | 班主任 | `APPROVED → LEFT` |

### 2.2.1 门卫扫码（首选）

```typescript
// 门卫端
interface GateScanRequest {
  student_id: string;     // 学生 ID（扫码或搜索）
  scan_type: 'LEAVE';     // 离校扫码
  scan_at: Date;          // 扫描时间
  gate_id: string;        // 门岗编号
  guard_id: string;       // 门卫 ID
}

// 系统自动校验
// 1. 学生存在有效 APPROVED 请假 → 允许
// 2. 学生无有效请假 → 拒绝（提示"未批准，不可离校"）
// 3. 校验通过 → 写入 LEAVE_GATE_LEFT 事件
```

### 2.2.2 班主任手动登记（兜底）

门卫未到岗 / 紧急情况：

- 班主任在工作台"今日待离校"卡片中
- 点击"登记离校"按钮
- 选择离校时间（默认当前时间）
- 系统写入 `LEAVE_GATE_LEFT` 事件，operator = 班主任 ID

## 2.3 离校规则

| 规则 | 描述 |
|------|------|
| R-LEAVE-01 | 只有 `APPROVED` 状态可以离校 |
| R-LEAVE-02 | 门卫**不**是审批者 |
| R-LEAVE-03 | 门卫**不**能修改请假内容 |
| R-LEAVE-04 | 门卫**不**能撤销已批准请假 |
| R-LEAVE-05 | 已 `LEFT` 状态的门卫扫码无效（提示"已离校"） |
| R-LEAVE-06 | 离校时间由扫码/手动时间决定，**不**做时间校验 |

## 2.4 学生在校状态联动

```typescript
// 状态机触发
onLeaveGateLeft(leave_id) {
  // 1. 写入 LEAVE_GATE_LEFT 事件
  // 2. Leave.status = LEFT
  // 3. Student.current_status = LEFT_SCHOOL
  // 4. 通知家长（如果已配置）
  // 5. 工作台"今日在校人数"实时 -1
}
```

---

# 第二章半 学生状态中心规则（v1.2 整体重写）

> **v1.2 整体重写**：v1.1 把"DORM"和"ON_CAMPUS"混在一个字段里是错误的。
> 状态 ≠ 位置。v1.2 拆为双维度模型。

## 2.5.0 为什么要拆分（v1.2 业务背景）

**问题**：v1.1 中 `StudentStatus` 包含 `DORM`（住宿），但 `DORM` 实际上是**场景**（晚自习后回寝），不是**状态**。

```typescript
// ❌ v1.1 错误模型
ON_CAMPUS  // 白天在校
DORM       // 晚上在宿舍
LEAVING    // 等待离校
OUT_OF_SCHOOL // 离校
```

**矛盾**：

| 场景 | 学生真实情况 | v1.1 模型 |
|------|------------|----------|
| 晚自习 21:00 | 在宿舍休息 | `DORM` |
| 早自习 06:30 | 在宿舍起床 | `DORM`？但这是"住宿"，不是"在校" |
| 白天上课 10:00 | 在教室 | `ON_CAMPUS` |
| 走读生晚 21:00 | 已离校回家 | `OUT_OF_SCHOOL`？但他不是"请假" |

**问题**：`DORM` 是位置，`ON_CAMPUS/OUT_OF_SCHOOL` 是状态。混在一起导致：

- ❌ 查寝时无法判断"应到未到"
- ❌ 晚自习签到无法区分"在校 vs 在寝"
- ❌ 走读生没有 DORM 状态，逻辑错误
- ❌ 未来"课堂点名""活动签到"全部会错

**解决**（v1.2 方案）：拆为双维度。

## 2.5.1 双维度模型（v1.2 冻结）

```text
Student
  ├── StudentStatus    // 状态：人在校园与否（业务决定）
  │     ├── ON_CAMPUS
  │     ├── OUT_OF_SCHOOL
  │     ├── GRADUATED
  │     └── TRANSFERRED
  │
  └── StudentLocation  // 位置：当前具体地点（场景决定）
        ├── CLASSROOM     // 教室
        ├── DORM          // 宿舍
        ├── PLAYGROUND    // 操场
        ├── GATE          // 校门（离校/返校过程中）
        ├── OFF_CAMPUS    // 校外
        └── UNKNOWN       // 未知（系统未登记）
```

### 2.5.1.1 `StudentStatus` 枚举（4 状态 - 冻结）

> `StudentStatus` 只回答一个问题：**学生与学校的关系**。

```typescript
type StudentStatus =
  | 'ON_CAMPUS'        // 在校（默认）
  | 'OUT_OF_SCHOOL'    // 离校（请假中）
  | 'GRADUATED'        // 已毕业
  | 'TRANSFERRED';     // 已转学
```

| 状态 | Key | 含义 | 何时进入 |
|------|-----|------|----------|
| 在校 | `ON_CAMPUS` | 正常在校 | 默认状态 / 销假后 |
| 离校 | `OUT_OF_SCHOOL` | 请假中 | Leave `GATE_LEFT` 事件触发 |
| 已毕业 | `GRADUATED` | 毕业离校 | 年级主任确认 |
| 已转学 | `TRANSFERRED` | 转学 | 管理员登记 |

> **v1.2 关键变更**：删除 `LEAVING`（合并入 `ON_CAMPUS`，因为已批准未离校 = 还在学校）。
> 已批准请假 = `ON_CAMPUS` + `Location.GATE`（等待离校，物理位置在校园内）。

### 2.5.1.2 `StudentLocation` 枚举（6 位置 - 冻结）

> `StudentLocation` 只回答一个问题：**学生物理上在哪**。

```typescript
type StudentLocation =
  | 'CLASSROOM'        // 教室
  | 'DORM'             // 宿舍
  | 'PLAYGROUND'       // 操场
  | 'GATE'             // 校门
  | 'OFF_CAMPUS'       // 校外
  | 'UNKNOWN';         // 未知
```

| 位置 | Key | 含义 | 何时进入 |
|------|-----|------|----------|
| 教室 | `CLASSROOM` | 上课中 | 上课时间段 / 课堂签到 |
| 宿舍 | `DORM` | 宿舍中 | 查寝 / 晚自习后 |
| 操场 | `PLAYGROUND` | 操场上 | 体育课 / 课间操 |
| 校门 | `GATE` | 校门位置 | 离校/返校过程中 |
| 校外 | `OFF_CAMPUS` | 校外 | `LEAVE_GATE_LEFT` 事件触发 |
| 未知 | `UNKNOWN` | 系统未登记 | 默认值 / 离校后未返校 |

> **v1.2 新增字段**：`Student.current_location`（v1.1 无此字段）。

## 2.5.2 双维度组合示例（v1.2 核心）

| 场景 | StudentStatus | StudentLocation | 备注 |
|------|---------------|-----------------|------|
| 上午上课 | `ON_CAMPUS` | `CLASSROOM` | 正常 |
| 课间操 | `ON_CAMPUS` | `PLAYGROUND` | 正常 |
| 晚自习后住宿生 | `ON_CAMPUS` | `DORM` | 住宿生晚上 |
| 晚自习后走读生 | `ON_CAMPUS` | `OFF_CAMPUS` | 走读生回家 |
| 请假已批准 | `ON_CAMPUS` | `GATE` | 在校但准备离校 |
| 离校后未返校 | `OUT_OF_SCHOOL` | `OFF_CAMPUS` | 物理离校 |
| 返校过程 | `OUT_OF_SCHOOL` | `GATE` | 校门刷脸/登记 |
| 销假后 | `ON_CAMPUS` | `CLASSROOM` | 恢复在校 |
| 新生未登记 | `ON_CAMPUS` | `UNKNOWN` | 默认 |
| 毕业后 | `GRADUATED` | `OFF_CAMPUS` | 不可逆 |
| 转学后 | `TRANSFERRED` | `OFF_CAMPUS` | 不可逆 |

## 2.5.3 业务事件驱动原则（v1.2 保留 - 加强）

> **核心**：
> ❌ 模块不直接改 `Student.current_status` 或 `Student.current_location`。
> ✅ 业务事件**触发**双维度状态变更。

```text
模块（Leave / GateRecord / Dorm / RollCall ...）
   ↓ 写入业务事件
TimelineEvent（LEAVE_GATE_LEFT / DORM_CHECKED_IN / ROLL_CALL_ABSENT ...）
   ↓ 事件订阅
状态机（StudentStatusLocationResolver）
   ↓ 触发
Student.current_status + Student.current_location
```

**触发矩阵（v1.2 冻结）**：

| 业务事件 | StudentStatus | StudentLocation | 说明 |
|----------|---------------|-----------------|------|
| `LEAVE_CREATED` | 不变 | 不变 | 草稿 |
| `LEAVE_APPROVED` | 不变 | `→ GATE` | 状态仍在校，位置移到校门（待离校） |
| `LEAVE_GATE_LEFT` | `→ OUT_OF_SCHOOL` | `→ OFF_CAMPUS` | 物理离校 |
| `LEAVE_RETURNED` | `→ ON_CAMPUS` | `→ GATE` | 返校过程 |
| `LEAVE_CLOSED` | 不变 | `→ CLASSROOM` | 销假后位置 = 教室 |
| `LEAVE_CANCELLED` | 不变 | `→ CLASSROOM` | 取消后位置恢复 |
| `DORM_CHECKED_IN` | 不变 | `→ DORM` | 晚自习后回寝 |
| `DORM_CHECKED_OUT` | 不变 | `→ CLASSROOM` | 早自习前离寝 |
| `ROLL_CALL_PRESENT` | 不变 | `→ CLASSROOM` | 课堂点名 |
| `STUDENT_GRADUATED` | `→ GRADUATED` | `→ OFF_CAMPUS` | 毕业 |
| `STUDENT_TRANSFERRED` | `→ TRANSFERRED` | `→ OFF_CAMPUS` | 转学 |
| 系统日终（22:00 住宿生） | 不变 | `→ DORM` | 住宿生日终 |
| 系统日初（06:00 走读生） | 不变 | `→ OFF_CAMPUS` | 走读生日初回家 |

## 2.5.4 双维度判断逻辑（v1.2 核心方法）

```typescript
class StudentStatusLocationResolver {
  // 判断"今日实到"
  isActuallyInSchool(student: Student, atTime: Date): boolean {
    // 1. Status 必须是 ON_CAMPUS
    if (student.current_status !== 'ON_CAMPUS') return false;
    // 2. Location 必须在校园内
    return ['CLASSROOM', 'DORM', 'PLAYGROUND', 'GATE'].includes(
      student.current_location
    );
  }

  // 查寝应到学生（晚自习后）
  shouldCheckInDorm(student: Student, atTime: Date): boolean {
    // 1. Status = ON_CAMPUS
    if (student.current_status !== 'ON_CAMPUS') return false;
    // 2. 必须是住宿生
    if (student.boarding_type !== 'BOARDING') return false;
    // 3. 不在校外
    if (student.current_location === 'OFF_CAMPUS') return false;
    return true;
  }

  // 走读生
  isDayStudent(student: Student): boolean {
    return student.boarding_type === 'DAY_STUDENT';
  }
}
```

## 2.5.5 v1.1 → v1.2 字段变更表

| v1.1 | v1.2 | 说明 |
|------|------|------|
| `StudentStatus` 6 状态 | `StudentStatus` 4 状态 | 删除 `LEAVING` 和 `DORM` |
| 无 `StudentLocation` | `StudentLocation` 6 位置 | **新增**字段 |
| `Student.current_status` | `Student.current_status` | 保留 |
| — | `Student.current_location` | **新增** |
| `LEAVING` 状态 | `ON_CAMPUS + Location.GATE` | 状态不变，位置移到校门 |

## 2.5.6 禁止的状态/位置（永久黑名单）

**StudentStatus 永久禁止**：

- ❌ `IN_SCHOOL`（v4.1 旧枚举，已被 `ON_CAMPUS` 替代）
- ❌ `PENDING_LEAVE`（v4.1 旧枚举，已被 `ON_CAMPUS + GATE` 组合替代）
- ❌ `LEFT_SCHOOL`（v4.1 旧枚举，已被 `OUT_OF_SCHOOL` 替代）
- ❌ `LEAVING`（v1.1 引入，已被 `ON_CAMPUS + Location.GATE` 组合替代）
- ❌ `DORM`（v1.1 引入，已被 `Location.DORM` 替代）

**StudentLocation 永久禁止**：

- ❌ `OTHER`（位置必须明确，不能"其他"）
- ❌ `HOME`（走读生回家 = `OFF_CAMPUS`）
- ❌ 模块直接修改 `Student.current_status` 或 `Student.current_location`（违反事件驱动）

## 2.5.7 班主任视角（每日一问 - v1.2 升级）

> **班主任每天真正关心的是**：
> 「我的学生现在**在哪里**？有没有**异常**？我今天还有**什么事情没完成**？」

v1.2 让这个问题的答案更清晰：

| 班主任视角 | 回答 | 数据 |
|-----------|------|------|
| 我的学生现在在哪？ | `Student.current_location` | 6 位置精确回答 |
| 我的学生在不在学校？ | `Student.current_status = ON_CAMPUS` | 4 状态精确回答 |
| 有没有异常？ | Timeline 中最近的 Incident | Timeline |
| 今天还干什么？ | WorkbenchTodos | Todo |

> **状态中心 = Status（在校状态） + Location（具体位置） + Timeline（历史） + Todo（待办）** 四者合一。

## 2.5.8 未来场景支撑（v1.2 解锁）

| 场景 | v1.1 实现难度 | v1.2 实现难度 |
|------|------------|--------------|
| 查寝 | ❌ 复杂（DORM 混在状态里） | ✅ 简单（`Location.DORM` 应到名单） |
| 晚自习签到 | ❌ 困难 | ✅ 简单（`Location.CLASSROOM` 应到） |
| 课堂点名 | ❌ 困难 | ✅ 简单（`Location.CLASSROOM` + `RollCall`） |
| 活动签到 | ❌ 困难 | ✅ 简单（`Location.PLAYGROUND`） |
| 走读生管理 | ❌ 困难（DORM 不适用） | ✅ 简单（`boarding_type = DAY_STUDENT` + `OFF_CAMPUS`） |
| 异常学生筛选 | ⚠️ 需要拼接 | ✅ `isActuallyInSchool()` 一行 |

---

# 第三章 通知规则

## 3.1 通知 vs 待办（强分离）

| 维度 | 通知 (Notice) | 待办 (Todo) |
|------|--------------|------------|
| 是否必须完成 | ❌ 不必须 | ✅ 必须 |
| 生命周期 | 发 → 阅 → 归档 | 创建 → 完成 |
| 提醒 | 弱 | 强 |
| 统计 | 已读率 | 完成率 |
| 示例 | 会议通知、放假通知 | 审批、文件确认 |

## 3.2 通知生命周期

```text
DRAFT → PUBLISHED → ARCHIVED
        ↓
        └─→ 推送（按 NotificationTarget）
              ↓
              ├─→ 已读
              ├─→ 未读
              └─→ 强制已读（仅关键通知）
```

## 3.3 NotificationTarget 8 类型（冻结）

```typescript
type NotificationTargetType =
  | 'ALL_TEACHERS'        // 全校教师
  | 'GRADE'               // 指定年级
  | 'CLASS'               // 指定班级
  | 'TEACHING_GROUP'      // 教研组
  | 'TAG'                 // 标签（如党员、英语组）
  | 'ROLE'                // 角色（如全体班主任）
  | 'STUDENT_PARENT'      // 学生家长（按学生 ID 展开）
  | 'INDIVIDUAL_TEACHER'; // 指定教师
```

## 3.4 通知强制已读规则

| 通知类型 | 是否强制已读 | 截止时间 |
|----------|-------------|----------|
| 紧急通知（如停课） | ✅ 强制 | 1 小时内 |
| 会议通知 | ✅ 强制 | 会议前 30 分钟 |
| 放假通知 | ❌ 自愿 | 无 |
| 教研通知 | ❌ 自愿 | 无 |
| 学生请假通知（家长） | ❌ 自愿 | 无 |

> **关键**：强制已读**仅**用于关键通知，避免家长被骚扰。

## 3.5 通知与请假联动

| 请假事件 | 通知目标 | 通知类型 |
|----------|---------|----------|
| `LEAVE_APPROVED` | 学生家长 | 普通 |
| `LEAVE_GATE_LEFT` | 学生家长 | 普通 |
| `LEAVE_RETURNED` | 学生家长 | 普通 |
| `LEAVE_CLOSED` | 年级主任 + 班主任 | 提醒（无需确认） |
| `LEAVE_REJECTED` | 班主任 | 强提醒 |

---

# 第四章 任务规则

## 4.1 任务定义

> 任务 = 需要在**指定截止时间**前完成的具体工作。
> 任务 = 强提醒 + 强完成。

## 4.2 任务生命周期

```text
DRAFT → PENDING → IN_PROGRESS → COMPLETED
                  ↓
                  ├─→ DEFERRED   (延期)
                  ├─→ CANCELLED  (取消)
                  └─→ OVERDUE    (超时未完成)
```

> ⚠️ **唯一允许的"自动"状态**：`PENDING/IN_PROGRESS → OVERDUE`
> 但 OVERDUE 只用于**任务**，**不**用于请假。

## 4.3 任务创建来源

| 来源 | 角色 | 任务类型 |
|------|------|----------|
| 年级主任下发 | 年级主任 | 资料收集、统计上报 |
| 班主任指派 | 班主任 | 班级事务 |
| 系统模板 | 系统 | 周报、月报、节假日提醒 |
| 跨部门协同 | 部门负责人 | 联合任务 |

## 4.4 任务催办规则

| 状态 | 提醒频率 | 提醒方式 |
|------|---------|----------|
| `PENDING` 未读 | 0 次 | 仅首次推送 |
| `IN_PROGRESS` | 每日 1 次 | 工作台红点 |
| 距离截止 1 小时 | 1 次 | 强提醒 |
| `OVERDUE` | 每日 2 次 | 强提醒 + 通知发起人 |

## 4.5 任务优先级

```typescript
type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
```

| 优先级 | 工作台位置 | 通知强度 |
|--------|-----------|----------|
| `URGENT` | 顶部红色横幅 | 弹窗 |
| `HIGH` | 第一位 | 强提醒 |
| `NORMAL` | 默认 | 静默 |
| `LOW` | 折叠 | 静默 |

## 4.6 任务统计

```typescript
interface TaskStats {
  teacher_id: string;
  total: number;
  completed: number;
  overdue: number;
  completion_rate: number;     // 完成率
  on_time_rate: number;        // 按时完成率
}
```

---

# 第五章 宿舍规则

## 5.1 宿舍管理边界

> 宿舍 = 学生的**住宿**信息。
> 宿舍**不**参与请假审批。
> 宿管**不**是请假流程的角色。

## 5.2 查寝规则

### 5.2.1 查寝对象自动过滤

```typescript
// 查寝列表
function getDormCheckList(date: Date): Student[] {
  return students.filter(s => {
    // 1. 住宿生
    if (s.boarding_type !== 'BOARDING') return false;
    // 2. 排除今日已批准离校且未返校的学生
    const leave = getActiveLeave(s.id, date);
    if (leave && leave.status === 'LEFT') return false;
    if (leave && leave.status === 'APPROVED' && isToday(date)) return false;
    return true;
  });
}
```

### 5.2.2 缺寝登记

```text
查寝 → 标记未到 → 写 Timeline（Incident）→ 通知班主任
```

## 5.3 宿舍异常（Incident）

| 异常类型 | 触发 | 通知 |
|----------|------|------|
| 缺寝 | 查寝时学生不在 | 班主任 |
| 夜不归宿 | 连续 2 次缺寝 | 班主任 + 年级主任 + 家长 |
| 私自离寝 | 异常登记 | 班主任 + 宿管 |
| 宿舍违规 | 宿管登记 | 班主任 |

> 宿舍异常**不**影响请假状态机。
> 宿舍异常**不**写 LeaveTimeline，写 DormIncidentTimeline。

## 5.4 宿舍与请假的关系

```text
请假（已批准+已离校）→ 宿管查寝时**自动过滤**该学生
请假（已返校+已销假）→ 宿管查寝时**正常查寝**

两者互不干扰，但共享 Student.current_status。
```

---

# 第六章 违纪规则

## 6.1 违纪定义

> 违纪 = 学生在校期间的**纪律事件**。
> 违纪是独立的生命周期，**不**与请假耦合。

## 6.2 违纪状态机

```text
DRAFT → PENDING_CONFIRM → CONFIRMED → HANDLED → CLOSED
                            ↓
                            └─→ APPEALED → RE_OPENED
```

## 6.3 违纪角色

| 角色 | 职责 |
|------|------|
| 政教教师 | 登记、初步定性 |
| 班主任 | 确认、谈话 |
| 年级主任 | 复核、申诉处理 |
| 家长 | 仅接收通知 |

## 6.4 家长端展示规则

> 家长端**禁止**使用「违纪」字样。

| 内部 | 家长端 |
|------|--------|
| 违纪 | ❌ **学生行为记录** |
| 处分 | ❌ **学校反馈** |
| 严重违纪 | ❌ **重要反馈** |

```typescript
// 家长端映射
const parentIncidentStatusMap = {
  DRAFT: '记录中',
  PENDING_CONFIRM: '学校反馈',
  CONFIRMED: '学校反馈',
  HANDLED: '已处理',
  CLOSED: '已完结',
  APPEALED: '处理中',
  RE_OPENED: '重新处理中'
};
```

## 6.5 违纪通知

| 违纪状态 | 通知家长 | 通知内容 |
|----------|----------|----------|
| `CONFIRMED` | ✅ | "您的孩子有新的学校反馈" |
| `HANDLED` | ✅ | "学校反馈已处理" |
| `CLOSED` | ❌ | （不通知，避免反复提醒） |
| `APPEALED` | ❌ | （不通知，等最终结果） |

---

# 第七章 权限规则（6+2 双体系）

## 7.1 管理端 RBAC（6 角色 - 冻结）

| # | 角色 | Key | 主要权限范围 |
|---|------|-----|------------|
| 1 | 系统管理员 | `SYSTEM_ADMIN` | 全部 |
| 2 | 年级主任 | `GRADE_DIRECTOR` | 年级 |
| 3 | 政教教师 | `DISCIPLINE_TEACHER` | 违纪 + 全年级通知 |
| 4 | 班主任 | `HEAD_TEACHER` | 班级 |
| 5 | 宿舍管理员 | `DORM_MANAGER` | 宿舍 |
| 6 | 普通教师 | `TEACHER` | 教学任务 |

## 7.2 用户端能力位（2 个 - 冻结）

| # | 角色 | Key | 能力范围 |
|---|------|-----|----------|
| 1 | 学生 | `STUDENT` | 查看自己的状态/请假 |
| 2 | 家长 | `PARENT` | 查看孩子的状态/请假 |

## 7.3 权限 = 角色 + 组织 + 标签

```typescript
interface Permission {
  role: Role;                // 角色
  organization: Organization; // 组织（学校/年级/班级/宿舍）
  tag?: Tag;                 // 标签（党员、英语组、骨干）
}

function checkPermission(user: User, action: string, resource: any): boolean {
  // R-007：角色 + 组织 + 标签 三者交集
}
```

## 7.4 数据范围

| 角色 | 数据范围 |
|------|----------|
| 系统管理员 | 全校 |
| 年级主任 | 本年级 |
| 政教教师 | 全年级（但只读班主任数据） |
| 班主任 | 本班 |
| 宿舍管理员 | 本宿舍 |
| 普通教师 | 教学任务相关 |
| 学生 | 自己 |
| 家长 | 自己的孩子 |

## 7.5 多角色账户

> 一个教师**允许**拥有多个角色。
> 例如：班主任 + 年级主任 + 英语教师
> 登录一次即可获得全部权限。

---

# 第八章 通用规则

## 8.1 Timeline 唯一历史来源（R-013 + v1.3 强化）

> 任何历史查询必须来自 Timeline。
> 不得查询多个业务表后拼接。

### 8.1.1 v1.3 新增：Repository 层强制规范

> **v1.3 关键加强**（Day 2 架构审查点 #1、#2）

**禁止**的 Repository 方法（编译时通过命名约定 + 静态检查保证）：

```typescript
// ❌ StudentRepository 不允许暴露：
class StudentRepository {
  updateStatus(studentId, status);              // ❌ 禁止
  updateLocation(studentId, location);          // ❌ 禁止
  setCurrentStatus(studentId, status);          // ❌ 禁止
  changeLocation(studentId, location);          // ❌ 禁止
  markAsOutOfSchool(studentId);                 // ❌ 禁止
  setLocationToDorm(studentId);                // ❌ 禁止
}

// ✅ 唯一允许的状态变更路径：
class StudentStatusService {
  // 必须经过 Timeline 事件 → Resolver
  async handleEvent(event: TimelineEvent) {
    // 1. 写 Timeline 事件
    await timelineRepo.create(event);
    // 2. Resolver 决定状态变更
    const result = StudentStatusLocationResolver.resolve(event);
    if (result) {
      // 3. 通过 StudentRepository.updateStatusTimestamp（只更新时间戳）
      await studentRepo.updateStatusTimestamp(studentId, result.status, result.statusAt);
    }
  }
}
```

**核心约束**：

| 层级 | 允许 | 禁止 |
|------|------|------|
| Controller | ❌ 不直接调 Prisma | 直接 Prisma 操作 |
| Service | ✅ 业务流程编排 | 直接 Prisma 操作 |
| Repository | ✅ CRUD（含时间戳更新） | ❌ 暴露 `updateStatus` / `updateLocation` 业务方法 |
| Resolver | ✅ 状态变更唯一入口 | ❌ 任何其他入口 |

**Lint 规则建议**（Day 3 实施）：

```typescript
// eslint rule: no-student-direct-status-update
// 检测代码中包含以下任一模式即报错：
//   studentRepository.updateStatus
//   studentRepository.updateLocation
//   studentRepository.setCurrentStatus
//   studentRepository.changeLocation
//   prisma.student.update({ data: { currentStatus: ... } })
//   prisma.student.update({ data: { currentLocation: ... } })
```

### 8.1.2 v1.3 新增：TeacherClassRelation 时间字段

> **v1.3 关键变更**（Day 2 架构审查点 #3）

**冻结字段**：

```typescript
interface TeacherClassRelation {
  id: string;
  teacher_id: string;
  class_id: string;
  role: TeacherClassRole;
  subject?: string;                  // 仅 SUBJECT_TEACHER
  start_date: Date;                  // ✅ v1.3 新增（必填）
  end_date?: Date;                   // ✅ v1.3 新增（可选；空 = 当前有效）
  created_at: Date;
  updated_at: Date;
}
```

**业务规则**：

| 场景 | 规则 |
|------|------|
| 当前班主任 | `end_date IS NULL` |
| 历史班主任 | `end_date IS NOT NULL` |
| 查询"2026-09 时高一1班班主任" | `start_date <= '2026-09-30' AND (end_date IS NULL OR end_date >= '2026-09-01')` |
| 教师调岗 | 旧关系 `UPDATE end_date = today`；新关系 `INSERT start_date = today, end_date = NULL` |
| 历史调岗记录 | **永久保留**（R-014 永久留痕） |

**禁止**：

- ❌ 删除旧关系（物理删除）
- ❌ 修改历史 `start_date`（只能新插入修正记录）

### 8.1.3 v1.3 新增：TimelineEvent 关联字段

> **v1.3 关键变更**（Day 2 架构审查点 #5）

**冻结字段**：

```typescript
interface TimelineEvent {
  // ... 已有字段
  
  // v1.3 新增
  related_type?: RelatedEntityType;  // 关联实体类型
  related_id?: string;               // 关联实体 ID
}

type RelatedEntityType =
  | 'LEAVE'           // 关联到 LeaveRecord
  | 'NOTICE'          // 关联到 Notice
  | 'TASK'            // 关联到 Task
  | 'DORM'            // 关联到 DormRoom
  | 'INCIDENT'        // 关联到 Incident
  | 'STUDENT';        // 关联到 Student
```

**业务价值**：

- ✅ 一条 Timeline 事件可以反向跳转到原业务记录
- ✅ 班主任看学生时间轴，点击"LEAVE_APPROVED"直接跳转到请假详情
- ✅ 未来 AI 分析：聚合学生相关业务，无需 join 多个表

**已存在字段 vs 新增字段**：

| 字段 | 含义 | v1.3 处理 |
|------|------|----------|
| `sourceEventId` | 业务源 ID（按 source 类型不同含义） | ✅ 保留 |
| `leaveRecordId` | 关联到 LeaveRecord | ✅ 保留 |
| `noticeId` | 关联到 Notice | ✅ 保留 |
| `related_type` | 通用关联类型 | ✅ **新增**（统一） |
| `related_id` | 通用关联 ID | ✅ **新增**（统一） |

> 旧字段（`leaveRecordId` / `noticeId`）保留兼容，新代码建议使用 `related_type` + `related_id`。

```typescript
// ✅ 正确
const history = await getTimelineByStudent(studentId);

// ❌ 错误
const history = merge([
  await getLeaveHistory(studentId),
  await getDormHistory(studentId),
  await getNoticeHistory(studentId)
]);
```

## 8.2 Timeline 不允许修改（R-014）

> Timeline 允许新增，禁止修改，禁止删除。

## 8.3 永久留痕（R-012）

> 不得物理删除业务数据。
> 统一使用 Logical Delete。

## 8.4 三次点击原则（R-008）

> 教师完成任何高频操作，最多 3 次点击。
> 工作台 → 发起请假 → 提交

## 8.5 工作台优先（R-009）

> 教师所有高频操作必须能从工作台直接进入。

## 8.6 少输入原则（R-010）

> 优先：点击、选择、自动关联、自动带出。
> 禁止：重复输入。

## 8.7 命名规范（R-024）

| 类型 | 规范 | 示例 |
|------|------|------|
| 数据库 | snake_case | `student_id`, `leave_status` |
| 前端 | camelCase | `studentName`, `leaveStatus` |
| 类 | PascalCase | `StudentService`, `LeaveController` |
| 业务术语 | 中文 | 请假、销假、查寝 |
| API | 英文 | `/api/v1/leaves` |

## 8.8 时间规范

- 时区：`Asia/Shanghai`
- 格式：`YYYY-MM-DD HH:mm:ss`
- 示例：`2026-07-18 09:15:30`

## 8.9 AI 不得修改业务规则（R-025）

> AI 只能实现业务。
> 不得修改业务流程。
> 不得自行增加功能。
> 不得改变审批流程。

---

# 第九章 业务规则冻结清单

## 9.1 已冻结（不可修改）

| # | 规则 | 冻结版本 |
|---|------|----------|
| 1 | 请假状态机 8 状态 | v4.2 |
| 2 | LeaveTimeline 10 事件 | v4.2 |
| 3 | `expected_return_time` 仅参考 | v4.2 |
| 4 | 6+2 双体系角色 | v4 |
| 5 | 52+9 权限点 | v4.1 |
| 6 | 7 实体（School/Grade/Class/User/Teacher/Student/Parent） | v4 |
| 7 | UserIdentity 实体 | v4.1 |
| 8 | AuthRequest 3 策略 | v4.1 |
| 9 | NotificationTarget 8 类型 | v4 |
| 10 | 家长端"学生行为记录"展示 | v4.1 |
| 11 | 8 项排除（成绩管理等） | v4 |
| 12 | 14 天开发顺序 | v4.1 |
| 13 | 任务状态机（含 OVERDUE） | v1.0 |
| 14 | 违纪状态机 + 家长端映射 | v1.0 |
| 15 | 通知生命周期 + 强制已读规则 | v1.0 |
| 16 | `leave_reason_type` 6 枚举（ILLNESS / PERSONAL / FAMILY / SPORT / SCHOOL_ACTIVITY / OTHER） | v1.1 |
| 17 | `StudentStatus` 6 状态（ON_CAMPUS / LEAVING / OUT_OF_SCHOOL / DORM / GRADUATED / TRANSFERRED） | v1.1 → **v1.2 改为 4 状态** |
| 18 | 业务事件驱动原则（模块不直接改 StudentStatus） | v1.1 |
| 19 | StudentTimeline 21 事件 + 聚合视图架构 | v1.1 |
| **20** | **`StudentLocation` 6 位置**（CLASSROOM / DORM / PLAYGROUND / GATE / OFF_CAMPUS / UNKNOWN） | v1.2 |
| **21** | **双维度模型**（`StudentStatus` 4 状态 + `StudentLocation` 6 位置，独立字段） | v1.2 |
| **22** | **Repository 层强制规范**（禁止 `updateStatus` / `updateLocation` 业务方法，必须走 Resolver） | **v1.3** |
| **23** | **TeacherClassRelation 时间字段**（`start_date` 必填 / `end_date` 可空 / 历史记录永久保留） | **v1.3** |
| **24** | **TimelineEvent 关联字段**（`related_type` 6 枚举 + `related_id` 用于反向跳转） | **v1.3** |

## 9.2 评审结论

- [x] 8 状态请假机冻结
- [x] 10 事件 LeaveTimeline 冻结
- [x] 6+2 双体系角色冻结
- [x] 通知生命周期冻结
- [x] 任务规则冻结
- [x] 宿舍规则冻结
- [x] 违纪规则冻结
- [x] 通用规则冻结
- [x] **leave_reason_type 6 枚举冻结**（v1.1）
- [x] **StudentStatus 6 状态冻结**（v1.1）→ v1.2 重写为 4 状态
- [x] **业务事件驱动原则冻结**（v1.1）
- [x] **StudentTimeline 21 事件冻结**（v1.1）
- [x] **StudentLocation 6 位置冻结**（v1.2）
- [x] **双维度模型冻结**（v1.2）
- [x] **Repository 层强制规范冻结**（v1.3）
- [x] **TeacherClassRelation 时间字段冻结**（v1.3）
- [x] **TimelineEvent 关联字段冻结**（v1.3）

> **本文件 v1.3 已完成业务规则冻结（共 25 条）。**
> **Sprint 2.1 启动条件已满足。**

## 9.3 后续修改流程

任何对本文件的修改必须：

1. 提交修订申请（业务评审）
2. 版本号升级（v1.1 / v1.2 ...）
3. 更新 CHANGELOG
4. 同步通知所有团队成员

> 不得口头修改、不得部分修改、不得绕过流程。

---

# 第十章 StudentTimeline 整体冻结（v1.1 新增）

> **v1.1 新增章节**：未来所有模块都会进入 StudentTimeline。
> 这是整个系统的**数据生命线**。

## 10.1 StudentTimeline 设计哲学

```text
学生李明
  │
  ├─ 2026-09-01  入学
  ├─ 2026-09-10  班主任登记请假
  │   └─ 2026-09-10 09:30  年级审批通过
  ├─ 2026-09-10 10:00  门卫确认离校
  ├─ 2026-09-10 15:00  返校
  ├─ 2026-09-12      宿舍缺寝
  └─ 2026-09-15      行为记录（迟到）
```

**未来 AI 可回答**（Sprint 3 智能助手）：

> 「这个学生最近一个月异常情况？」

**答案全部来自**：`StudentTimeline`。

## 10.2 StudentTimeline 与 LeaveTimeline 的关系

| Timeline | 范围 | 事件来源 |
|----------|------|----------|
| **LeaveTimeline** | 一次请假的完整事件 | Leave 状态机（10 事件） |
| **DormIncidentTimeline** | 宿舍异常事件 | Dorm 模块（4 事件） |
| **NoticeTimeline** | 通知发布/阅读事件 | Notice 模块 |
| **IncidentTimeline** | 违纪事件 | Discipline 模块 |
| **StudentTimeline** | **学生全维度时间线（聚合视图）** | **上述所有 + Student 自身事件** |

> StudentTimeline = LeaveTimeline + DormIncidentTimeline + NoticeTimeline + IncidentTimeline + Student 自身事件 的**聚合视图**。
> 它**不**是新的事件存储，而是**查询时聚合**。

## 10.3 StudentTimeline 事件类型（冻结）

```typescript
type StudentTimelineEventType =
  // 来自 LeaveTimeline
  | 'LEAVE_CREATED'
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'LEAVE_GATE_LEFT'
  | 'LEAVE_RETURNED'
  | 'LEAVE_CLOSED'
  | 'LEAVE_EDITED'
  | 'LEAVE_RESUBMITTED'
  // 来自 DormIncidentTimeline
  | 'DORM_ABSENT'           // 缺寝
  | 'DORM_LATE'             // 晚归
  | 'DORM_CHECKED_IN'       // 归寝
  // 来自 NoticeTimeline
  | 'NOTICE_SENT'           // 通知发送
  | 'NOTICE_READ'           // 通知已读
  // 来自 IncidentTimeline（违纪）
  | 'INCIDENT_RECORDED'     // 违纪登记
  | 'INCIDENT_HANDLED'      // 违纪处理
  // Student 自身事件
  | 'STUDENT_ENROLLED'      // 入学
  | 'STUDENT_GRADUATED'     // 毕业
  | 'STUDENT_TRANSFERRED'   // 转学
  | 'STUDENT_STATUS_CHANGED'; // 状态变化（由状态机写入）
```

## 10.4 StudentTimeline 存储模型

```typescript
interface StudentTimeline {
  id: string;
  student_id: string;                      // 聚合的根：学生
  event_type: StudentTimelineEventType;
  event_source: 'LEAVE' | 'DORM' | 'NOTICE' | 'INCIDENT' | 'STUDENT';
  source_event_id: string;                 // 源事件 ID（关联原表）
  payload: Record<string, any>;            // 业务载荷
  operator_id?: string;                    // 操作人
  occurred_at: Date;                       // 业务发生时间
  recorded_at: Date;                       // 系统记录时间
  class_id: string;                        // 冗余：班级
  grade_id: string;                       // 冗余：年级
}
```

## 10.5 StudentTimeline 写入规则

| 规则 | 描述 |
|------|------|
| 单一来源 | 各业务模块写各自的 Timeline（Leave / Dorm / Notice / Incident） |
| 聚合视图 | StudentTimeline 是**查询时**聚合，**不**独立存储 |
| 永久留痕 | R-014：不允许修改、不允许删除 |
| 唯一性 | `(student_id, source_event_id)` 唯一 |
| 索引 | `student_id + occurred_at DESC` 是主查询路径 |

## 10.6 StudentTimeline 查询 API

```typescript
// 1. 学生时间轴（按时间倒序）
GET /api/v1/students/:id/timeline?limit=50&offset=0
  → StudentTimeline[]

// 2. 学生某月异常统计
GET /api/v1/students/:id/timeline/stats?month=2026-09
  → {
      leave_count: 2,
      dorm_absent_count: 1,
      incident_count: 0,
      notice_read_rate: 0.85
    }

// 3. 全班某月异常学生
GET /api/v1/classes/:id/students-abnormal?month=2026-09
  → StudentAbnormalReport[]
```

## 10.7 AI 应用（v1.1 预埋 - Sprint 3 启用）

> StudentTimeline 是 Sprint 3 「**智能校园助手**」的数据基础。

**Sprint 3 典型问答**：

| 用户提问 | 答案来源 |
|----------|---------|
| 「李明最近一个月异常？」 | `STUDENT_TIMELINE` 聚合查询 |
| 「张三这学期请假几次？」 | `STUDENT_TIMELINE.LEAVE_*` 过滤 |
| 「本周哪些学生缺寝？」 | `STUDENT_TIMELINE.DORM_ABSENT` 聚合 |
| 「班级整体纪律情况？」 | `STUDENT_TIMELINE.INCIDENT_*` 聚合 |

> **v1.1 冻结**：StudentTimeline 表结构、事件类型、索引策略。
> v1.1 不实现 Sprint 3 AI 部分，但**数据结构必须先冻结**。

---

# 附录 A：术语锁定

| 术语 | 锁定值 | 反例 |
|------|--------|------|
| 产品定位 | **学生在校状态中心** | ❌ 请假管理系统 |
| 请假状态数 | **8** | ❌ 11（含 NO_SHOW/EXPIRED/OVERDUE） |
| Timeline 事件 | **10**（LeaveTimeline）<br>**21**（StudentTimeline 聚合） | ❌ 13 / 任何散落表 |
| 返校确认 | **班主任手动** | ❌ 系统自动 |
| 离校登记 | **门卫 + 班主任兜底** | ❌ 仅门禁 |
| 家长端违纪 | **学生行为记录** | ❌ 违纪 |
| 角色体系 | **6+2 双体系** | ❌ 单一 RBAC |
| 任务超时 | **OVERDUE** | ✅ 唯一允许的自动异常 |
| 请假超时 | **不存在** | ❌ 不允许自动异常 |
| 请假原因分类 | **6 枚举**（ILLNESS / PERSONAL / FAMILY / SPORT / SCHOOL_ACTIVITY / OTHER） | ❌ 仅自由文本 |
| 学生状态 | **4 状态 + 6 位置**（双维度）| ❌ 单维度（6 状态混位置） |
| 状态字段 | **`current_status` + `current_location`**（独立） | ❌ 单字段 `current_status` |
| 状态变更触发 | **业务事件**（Leave / Gate / Dorm / Notice / Incident） | ❌ 模块直接改 Student.current_status |
| Timeline 来源 | **单一来源**（LeaveTimeline / DormTimeline / NoticeTimeline / IncidentTimeline） | ❌ 业务表直接查询拼接 |
| AI 启用 | **Sprint 3 启用** | ❌ Sprint 2 提前做 AI |

---

# 附录 B：版本管理

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-18 | 业务规则首次冻结（基于 v4.2 业务规则补丁） |
| v1.1 | 2026-07-18 | v4.2 Review 通过后补充 4 条：<br>1. `leave_reason_type` 6 枚举<br>2. `StudentStatus` 6 状态（替代 v4.1 旧枚举）<br>3. 业务事件驱动原则（模块不直接改状态）<br>4. `StudentTimeline` 21 事件 + 聚合视图架构 |
| v1.2 | 2026-07-18 | v4.2 Review 双维度模型拆分：<br>1. `StudentStatus` 从 6 状态**重写为 4 状态**（删除 `LEAVING` 和 `DORM`）<br>2. **新增** `StudentLocation` 6 位置（CLASSROOM / DORM / PLAYGROUND / GATE / OFF_CAMPUS / UNKNOWN）<br>3. 双维度组合判断逻辑（`isActuallyInSchool` / `shouldCheckInDorm`）<br>4. 解除未来 6 大场景的开发障碍（查寝/晚自习/课堂点名/活动签到/走读生/异常筛选） |
| **v1.3** | **2026-07-18** | **Day 2 架构审查补充 3 条**：<br>1. **Repository 层强制规范**（§8.1.1）：禁止 `StudentRepository.updateStatus` / `updateLocation` 业务方法；只能通过 `TimelineEvent` → `StudentStatusLocationResolver` → `updateStatusTimestamp`<br>2. **TeacherClassRelation 时间字段**（§8.1.2）：`start_date` 必填 / `end_date` 可空（空=当前有效） / 历史调岗永久保留<br>3. **TimelineEvent 关联字段**（§8.1.3）：`related_type` 6 枚举（LEAVE/NOTICE/TASK/DORM/INCIDENT/STUDENT）+ `related_id` 用于反向跳转业务记录 |

---

**v1.3 业务规则冻结（共 25 条）。Sprint 2.1 Day 3 可启动。**

— End of SPRINT2_DOMAIN_RULE_v1.md —
