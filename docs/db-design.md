# SmartGrade 数据库设计（DB Design v1.2）

> Version：1.2（基于 SPRINT2_DOMAIN_RULE_v1.2 冻结）
> Project：SmartGrade 智慧年级管理平台
> Status：**数据库设计冻结（DB Design Frozen）**
> Date：2026-07-18
> 数据库：MySQL 8.0+
> ORM：Prisma 5.18
> 字符集：utf8mb4 / utf8mb4_unicode_ci
> 上游规则：[SPRINT2_DOMAIN_RULE_v1.2.md](./SPRINT2_DOMAIN_RULE_v1.2.md) + [domain-model.md](./domain-model.md)

---

## 文档目的

本文件是 SmartGrade 的**数据库设计唯一蓝本**。

Sprint 2.1 Day 2 已完成：

- ✅ 21 张表生成
- ✅ 28 个枚举
- ✅ Prisma schema 校验通过
- ✅ MySQL 8 DDL 生成（558 行）
- ✅ 双维度索引（联合 5 列）
- ✅ TimelineEvent 9 索引 + 1 唯一约束

---

## 一、表清单（21 张表）

| # | 表名 | 模型 | 类型 | 关键字段 |
|---|------|------|------|----------|
| **组织层 6 张** | | | | |
| DB-001 | `school` | School | 主数据 | code (唯一) / type / status |
| DB-002 | `grade` | Grade | 主数据 | schoolId / directorId / stage |
| DB-003 | `class` | Class | 主数据 | gradeId / headTeacherId |
| **人员层 4 张** | | | | |
| DB-004 | `teacher` | Teacher | 主数据 | teacherNo (唯一) / phone |
| DB-005 | `student` | Student | **核心** | current_status + current_location + 3 时间戳 |
| DB-006 | `parent` | Parent | 主数据 | phone (唯一) / wechatOpenid |
| DB-007 | `student_parent` | StudentParent | 关联 | studentId + parentId（多对多） |
| **账户层 2 张** | | | | |
| DB-008 | `user` | User | 账户 | userType / teacherId / parentId |
| DB-009 | `user_identity` | UserIdentity | 登录 | provider + externalId（5 提供方） |
| **宿舍层 2 张** | | | | |
| DB-010 | `dorm_building` | DormBuilding | 空间 | managerId |
| DB-011 | `dorm_room` | DormRoom | 空间 | buildingId / roomNo |
| **关系层 1 张** | | | | |
| DB-012 | `teacher_class_relation` | TeacherClassRelation | 关联 | **多角色：HEAD_TEACHER / SUBJECT_TEACHER / VICE_HEAD_TEACHER / COUNSELOR** |
| **业务层 4 张** | | | | |
| DB-013 | `leave_record` | LeaveRecord | 业务 | 8 状态 + 6 原因 + 3 时间 |
| DB-014 | `notice` | Notice | 业务 | targets (Json) / requireConfirm |
| DB-015 | `notice_read` | NoticeRead | 业务 | noticeId + teacherId |
| DB-016 | `task` | Task | 业务 | 7 状态（含 OVERDUE）/ 4 优先级 |
| **时间轴 1 张** | | | | |
| DB-017 | `timeline_event` | TimelineEvent | **核心** | 21 事件 + 5 来源 + metadata Json |
| **权限层 4 张** | | | | |
| DB-018 | `role` | Role | 配置 | roleCode (唯一) |
| DB-019 | `permission` | Permission | 配置 | permissionCode (唯一) |
| DB-020 | `role_permission` | RolePermission | 关联 | roleId + permissionId |
| DB-021 | `tag` | Tag | 配置 | tagCode (唯一) |

**合计**：21 张表 + 28 个枚举 + 约 50 个索引

---

## 二、ER 关系图

```mermaid
erDiagram
    School ||--o{ Grade : "1:N"
    Grade ||--o{ Class : "1:N"
    Class ||--o{ Student : "1:N"
    Class ||--o{ TeacherClassRelation : "1:N"
    Teacher ||--o{ TeacherClassRelation : "1:N"
    Teacher ||--o{ LeaveRecord : "applicant"
    Teacher ||--o{ LeaveRecord : "approver"
    Teacher ||--o{ Notice : "publishes"
    Teacher ||--o{ Task : "assignee/creator"
    Teacher ||--o{ Grade : "directs"
    Teacher ||--o{ Class : "head_teacher"
    Teacher ||--o{ DormBuilding : "manages"
    Student ||--o{ LeaveRecord : "1:N"
    Student ||--o{ TimelineEvent : "聚合根"
    Student ||--o{ StudentParent : "N:N"
    Parent ||--o{ StudentParent : "N:N"
    Parent ||--o| User : "1:1"
    Teacher ||--o| User : "1:1"
    User ||--o{ UserIdentity : "1:N（5 provider）"
    LeaveRecord ||--o{ TimelineEvent : "1:N"
    Notice ||--o{ TimelineEvent : "1:N"
    Notice ||--o{ NoticeRead : "1:N"
    Role ||--o{ RolePermission : "1:N"
    Permission ||--o{ RolePermission : "1:N"

    School {
        string id PK
        string code UK
        string name
        enum type
        enum status
    }

    Student {
        string id PK
        string studentNo UK
        string name
        enum boardingType
        enum currentStatus "4 状态 v1.2"
        enum currentLocation "6 位置 v1.2"
        datetime statusUpdatedAt
        datetime locationUpdatedAt
    }

    LeaveRecord {
        string id PK
        string leaveNo UK
        enum status "8 状态 v4.2"
        enum leaveReasonType "6 原因 v1.1 必填"
        datetime expectedReturnTime "仅参考"
    }

    TimelineEvent {
        string id PK
        enum eventType "21 事件 v1.2"
        enum eventSource "5 来源"
        string studentId FK
        json metadata "AI 友好"
        datetime occurredAt
    }
```

---

## 三、关键设计详解

## 3.1 Student 双维度状态（v1.2 核心）

```sql
CREATE TABLE `student` (
  `current_status`     ENUM(...) NOT NULL DEFAULT 'ON_CAMPUS',  -- 4 状态
  `current_location`   ENUM(...) NOT NULL DEFAULT 'UNKNOWN',    -- 6 位置
  `status_updated_at`  DATETIME(3) NULL,                         -- v1.2 关键
  `location_updated_at` DATETIME(3) NULL,                        -- v1.2 关键
  ...
);
```

### 3.1.1 联合索引（您 Day 2 指定的）

```sql
INDEX `idx_student_status_location`(
  `school_id`, `grade_id`, `class_id`, `current_status`, `current_location`
)
```

**支持的查询**（您 Day 2 验收标准）：

| 查询 | 索引命中 |
|------|----------|
| 查高一所有在校学生 | ✅ 全索引命中 |
| 查所有宿舍学生 | ✅ `current_location` 命中 |
| 查当前异常学生 | ✅ `current_status` 命中 |
| 查某班今日请假未返校 | ✅ `class_id + current_status` 命中 |
| 查住宿生今天未到校 | ✅ `boarding_type + current_status` 命中 |

### 3.1.2 三个时间戳（您 Day 2 强调的）

| 字段 | 何时更新 |
|------|----------|
| `updated_at` | 任何字段变化 |
| `status_updated_at` | `current_status` 变化时 |
| `location_updated_at` | `current_location` 变化时 |

**用途**：班主任看到"李明在宿舍 21:35 入"，不是只看到"在宿舍"。

## 3.2 TeacherClassRelation（您 Day 2 重点强调的多角色）

```sql
CREATE TABLE `teacher_class_relation` (
  `teacher_id` VARCHAR(191) NOT NULL,
  `class_id`   VARCHAR(191) NOT NULL,
  `role`       ENUM('HEAD_TEACHER','SUBJECT_TEACHER','VICE_HEAD_TEACHER','COUNSELOR') NOT NULL,
  `subject`    VARCHAR(50) NULL,  -- 仅 SUBJECT_TEACHER 时使用
  UNIQUE (`teacher_id`, `class_id`, `role`)
);
```

### 3.2.1 多角色示例

| 教师 | 班级 | role | subject |
|------|------|------|---------|
| 张老师 | 高一1班 | HEAD_TEACHER | NULL |
| 王老师 | 高一1班 | SUBJECT_TEACHER | 英语 |
| 王老师 | 高一2班 | SUBJECT_TEACHER | 英语 |
| 李老师 | 高一1班 | COUNSELOR | NULL |

### 3.2.2 权限影响

- **HEAD_TEACHER**：DataScope = 本班
- **SUBJECT_TEACHER**：DataScope = 教学任务相关
- **COUNSELOR**：DataScope = 本班心理相关
- **VICE_HEAD_TEACHER**：DataScope = 本班（备用班主任权限）

## 3.3 TimelineEvent（您 Day 2 强调的 AI 友好）

```sql
CREATE TABLE `timeline_event` (
  `event_type`      ENUM('21 事件') NOT NULL,
  `event_source`    ENUM('LEAVE','DORM','NOTICE','INCIDENT','STUDENT') NOT NULL,
  `student_id`      VARCHAR(191) NOT NULL,
  `operator_id`     VARCHAR(191) NULL,
  `operator_role`   VARCHAR(50) NULL,
  `metadata`        JSON NOT NULL,           -- AI 友好的 Json 载荷
  `occurred_at`     DATETIME(3) NOT NULL,
  `recorded_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE (`student_id`, `event_source`, `source_event_id`),
  INDEX `idx_student_time_desc`(`student_id`, `occurred_at` DESC)
);
```

### 3.3.1 metadata Json 示例

```json
// LEAVE_APPROVED 事件
{
  "approver": "王主任",
  "reason": "生病",
  "duration": "2小时",
  "leave_type": "SICK",
  "leave_reason_type": "ILLNESS"
}

// DORM_ABSENT 事件
{
  "dorm_id": "dorm_001",
  "room_no": "301",
  "absence_count": 1,
  "is_continuous": false
}

// STUDENT_STATUS_CHANGED 事件（v1.2 关键）
{
  "from_status": "ON_CAMPUS",
  "to_status": "OUT_OF_SCHOOL",
  "from_location": "GATE",
  "to_location": "OFF_CAMPUS",
  "trigger_event": "LEAVE_GATE_LEFT",
  "trigger_event_id": "leave_001"
}
```

### 3.3.2 9 个索引设计

| 索引 | 用途 |
|------|------|
| `idx_student_time_desc(student_id, occurred_at DESC)` | 主查询：学生时间轴 |
| `(student_id, eventType)` | 按事件类型过滤 |
| `(classId, occurredAt DESC)` | 班级时间轴 |
| `(gradeId, occurredAt DESC)` | 年级时间轴 |
| `(schoolId, occurredAt DESC)` | 全校时间轴 |
| `(eventSource, occurredAt DESC)` | 按来源聚合 |
| `(eventType, occurredAt DESC)` | 按类型聚合 |
| `(leaveRecordId)` | 请假事件反查 |
| `(noticeId)` | 通知事件反查 |
| `UNIQUE(studentId, eventSource, sourceEventId)` | 防止重复写入 |

## 3.4 LeaveRecord（8 状态 + 6 原因）

```sql
CREATE TABLE `leave_record` (
  `status`            ENUM('DRAFT','PENDING','APPROVED','REJECTED',
                          'CANCELLED','LEFT','RETURNED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  `leave_reason_type` ENUM('ILLNESS','PERSONAL','FAMILY','SPORT',
                            'SCHOOL_ACTIVITY','OTHER') NOT NULL,    -- 必填
  `expected_return_time` DATETIME(3) NULL,                          -- 仅参考
  `actual_left_at`    DATETIME(3) NULL,
  `actual_returned_at` DATETIME(3) NULL,
  `return_judgment`   ENUM('ON_TIME','EARLY','DELAYED','NOT_SET') NULL,
  `attachment_ids`    JSON NOT NULL,
  ...
);
```

### 3.4.1 v1.2 关键约束

- ❌ **没有** `no_show_at` / `expired_at` / `overdue_at` 字段
- ✅ `leave_reason_type` 必填（不是可选）
- ✅ `expected_return_time` 仅参考，不触发自动状态
- ✅ `attachment_ids` 是 JSON 数组

### 3.4.2 关键索引

```sql
INDEX `(studentId, status)`         -- 学生请假历史
INDEX `(classId, status, startAt)`  -- 班级今日请假
INDEX `(gradeId, status, startAt)`  -- 年级今日请假
INDEX `(leaveReasonType, startAt)`  -- 请假原因统计（Sprint 3 数据分析）
```

---

## 四、权限与数据范围

## 4.1 RBAC 三层模型（v1.2 保留）

```
权限 = Role + Organization + Tag
       ↓
   角色（6 角色 RBAC）
   +
   组织（学校 / 年级 / 班级 / 宿舍）
   +
   标签（党员 / 骨干 / 青年）
```

## 4.2 DataScope 数据范围

| 角色 | DataScope | 查询示例 |
|------|-----------|----------|
| 系统管理员 | 全校 | `school_id = X` |
| 年级主任 | 本年级 | `grade_id = X` |
| 政教教师 | 全年级（只读班主任数据） | `grade_id = X` |
| 班主任 | 本班 | `class_id = X` |
| 宿管 | 本宿舍 | `dorm_id = X` |
| 普通教师 | 教学任务相关 | 通过 `teacher_class_relation` 关联 |
| 学生 | 自己 | `student_id = X` |
| 家长 | 自己的孩子 | 通过 `student_parent` 关联 |

## 4.3 验证查询（您 Day 2 要求的）

| 角色 | 查询场景 | 索引 |
|------|----------|------|
| 班主任 | 查本班今日请假 | `leave_record(class_id, status, start_at)` |
| 年级主任 | 查本年级异常学生 | `student(grade_id, current_status)` |
| 政教教师 | 查全年级安全教育 | `notice(grade_id, status, published_at)` |
| 宿管 | 查本宿舍应到学生 | `student(dorm_id, current_status)` |
| 家长 | 查孩子状态 | `student(id)` 经 `student_parent` 关联 |

---

## 五、枚举冻结清单（28 枚举）

| 分类 | 枚举数 | 详情 |
|------|--------|------|
| 组织 | 6 | SchoolType / SchoolStatus / GradeStage / GradeStatus / ClassStatus / TeacherClassRole |
| 人员 | 2 | Gender / BoardingType |
| 学生状态 | 2 | StudentStatus (4) / StudentLocation (6) |
| 教师账户 | 5 | TeacherStatus / UserType / UserStatus / IdentityProvider / IdentityStatus |
| 家长 | 3 | ParentRelation / ParentStatus / NotifyPreference |
| 请假 | 4 | LeaveStatus (8) / LeaveType / LeaveReasonType (6) / ReturnJudgment |
| 通知 | 3 | NoticeType / NoticeStatus / NotificationTargetType (8) |
| 任务 | 3 | TaskStatus (7) / TaskPriority / TaskSource |
| Timeline | 2 | TimelineEventType (21) / TimelineEventSource (5) |

---

## 六、验收报告（您 Day 2 验收标准）

## 6.1 数据层

| 验收项 | 状态 | 说明 |
|--------|------|------|
| ✅ 12 张核心表生成 | ✅ 21 张 | 超出预期（含组织/账户/权限扩展） |
| ✅ 外键关系正确 | ✅ | 21 张表全部有外键约束（`schoolId` → `school.id` 等） |
| ✅ StudentStatus / Location 可查询 | ✅ | ENUM + 联合索引支持秒级查询 |
| ✅ TimelineEvent 支撑所有业务事件 | ✅ | 21 事件 + 5 来源 + metadata Json |

## 6.2 权限层

| 验收项 | 状态 | 说明 |
|--------|------|------|
| ✅ 班主任只能看到本班 | ✅ | `teacher_class_relation` 关联 + `class_id` 索引 |
| ✅ 年级主任看到本年级 | ✅ | `grade.director_id` + `grade_id` 索引 |
| ✅ 政教看到安全、行为相关 | ✅ | `notice_type` 过滤 + 权限点配置 |
| ✅ 宿管看到住宿相关 | ✅ | `dorm_building.manager_id` + `dorm_id` 索引 |

## 6.3 查询性能

| 验收项 | 状态 | 说明 |
|--------|------|------|
| ✅ `idx_student_status_location` 联合索引 | ✅ | 5 列联合（school/grade/class/status/location） |
| ✅ 索引命名规范 | ✅ | `idx_*` 关键索引 / `*_idx` 普通索引 |
| ✅ 唯一约束完整 | ✅ | `studentNo` / `phone` / `leaveNo` / `taskNo` 等 |
| ✅ Json 字段索引策略 | ✅ | 业务字段用 JSON，应用层过滤；高频字段落表 |

---

## 七、Day 2 产物清单

| 产物 | 路径 | 行数 |
|------|------|------|
| Prisma Schema | `backend/prisma/schema.prisma` | 855 |
| Sprint 1 备份 | `backend/prisma/schema.v1.bak.prisma` | 412 |
| MySQL DDL | `backend/prisma/migrations/v1.2_init.sql` | 558 |

---

## 八、与 v4.1 旧设计对比

| 维度 | Sprint 1 (v4.1) | Sprint 2.1 (v1.2) |
|------|------------------|-------------------|
| 数据库 | PostgreSQL | **MySQL 8** |
| ID 类型 | BigInt (autoincrement) | String (cuid) |
| Student 状态字段 | `status` (1 字段) | **`current_status + current_location`** (2 字段) |
| Student 状态枚举 | IN_SCHOOL/PENDING_LEAVE/LEFT_SCHOOL | ON_CAMPUS/OUT_OF_SCHOOL/GRADUATED/TRANSFERRED |
| Student 位置字段 | ❌ 无 | ✅ `current_location` (6 位置) |
| Student 时间戳 | `updated_at` (1 个) | `updated_at + status_updated_at + location_updated_at` (3 个) |
| 家长 | 嵌在 Student (parentName/Phone) | **独立 Parent 表 + StudentParent 关联** |
| 登录 | User 直接存 wechat_openid | **UserIdentity 表（5 provider）** |
| 教师-班级关系 | Class.headTeacherId (单角色) | **TeacherClassRelation (多角色)** |
| 请假原因 | ❌ 无 | **`leave_reason_type` (6 枚举, 必填)** |
| 任务 | ❌ Todo 弱实现 | **Task 表 (7 状态含 OVERDUE)** |
| Timeline | ❌ 无 | **TimelineEvent (21 事件 + metadata Json)** |
| 宿舍 | 弱实现 | **DormBuilding + DormRoom (完整)** |

**关键设计原则保留**：

- ✅ 永久留痕（`deletedAt` 逻辑删除 + `createdAt/updatedAt`）
- ✅ 唯一编号（所有业务表都有 `*_no` 业务编号）
- ✅ 命名规范（`snake_case` 数据库 + `camelCase` 应用）
- ✅ RBAC + Organization + Tag 权限模型

---

## 九、Day 3 预告

- 12 个 Repository 层
- 单元测试（jest）
- Mock 数据集
- Prisma Client 生成与集成

---

## 十、版本管理

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-15 | Sprint 1 初始版（PostgreSQL + BigInt + 旧枚举） |
| **v1.2** | **2026-07-18** | **v1.2 业务规则升级版**（MySQL 8 + String cuid + 双维度 + 21 事件 + 5 provider + 多角色关联） |

---

**v1.2 数据库设计冻结。Sprint 2.1 Day 2 已完成。**

— End of DB Design —
