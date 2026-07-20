# AuthorizationContext v1 — 授权上下文设计稿

> **状态**：刘老师拍板确认（2026-07-20）
> **上游**：PRODUCT_PRINCIPLES.md + SPRINT2_DAY4-6_PLAN.md
> **下游**：Day 5.1 RBAC → Day 5.2 Organization → Day 5.3 DataScope Resolver

---

## 1. 三个问题，三个层次

Sprint 2 的授权体系回答三个不同的问题。它们不是同一层。

```
Identity（Day 4）      → 你是谁？
Authorization（Day 5） → 你能做什么？
DataScope（Day 5）      → 你能看到哪些数据？
```

Identity 回答"身份"，Authorization 回答"能力"，DataScope 回答"范围"。三者合在一起构成 `AuthorizationContext`——Sprint 2 起所有业务模块都依赖它。

---

## 2. 设计决策（刘老师 2026-07-20 最终拍板）

### 2.1 拆分为两个对象

`AuthorizationContext` 不是一个大对象，而是 **组合**：`CurrentActor` + `AuthorizationInfo`。

原因：Timeline / Audit / OperationLog 99% 只需要 `actor`，完全不关心 `permission`。不要每次传一大坨对象。

### 2.2 Session 表不存 AuthorizationContext

Session 表只存：
- userId
- sessionId
- loginAt / expireAt
- device
- tokenVersion

`AuthorizationContext` **每次请求动态解析**。

原因：以后老师调班、班主任变更、权限变化，不用强制所有 Session 失效。如果担心性能，可在 Redis 做短时间缓存（如 5 分钟），但不固化到 Session 数据里。

### 2.3 Context 不存业务展示数据

- `organization` 不存 schoolName / gradeName / className
- `actor` 只存 id，不存 name / teacherNo

Context 生命周期很长（登录后 8 小时），不缓存业务数据。展示层需要 Name 时从数据库实时查。

### 2.4 roles / permissions 用 Set

O(1) 查询：
- `ctx.authorization.roleSet.has('HEAD_TEACHER')`
- `ctx.authorization.permissionSet.has('leave:approve')`

序列化到 JSON 时自动变成数组，反序列化时 `new Set(array)` 回来。

### 2.5 DataScope 有 version 无 source

- `version: number` — 权限算法升级时 +1，Session 重建时比对，旧版本强制重建
- **无 source** — source 是调试信息，走日志，不进 Context。Context 越纯越好。

### 2.6 Repository 按需传 ctx

- **不传 ctx**：findById / exists / count（纯查询，不涉及范围）
- **传 ctx**：findList / findPage / statistics（涉及数据范围）
- **修改操作**：Service 层先判断 permission，Repository 只做数据

### 2.7 TeacherClassRole 冻结

`TeacherClassRole` 4 枚举 **永不扩展**：HEAD_TEACHER / SUBJECT_TEACHER / VICE_HEAD_TEACHER / COUNSELOR。

新增业务身份走 `TeacherTag`。

---

## 3. CurrentActor（操作者）

Timeline / OperationLog / AuditLog 统一记录"谁做了这件事"。

```typescript
/**
 * CurrentActor — 当前操作者
 *
 * 用途：
 * - TimelineEvent.operatorId / operatorType
 * - OperationLog.actor
 * - AuditLog.who
 *
 * 以后任何需要"谁"的地方，传 CurrentActor，不散传 userId + teacherId + parentId。
 */
export interface CurrentActor {
  /** User.id（必填） */
  userId: string;

  /** 业务身份 ID（按 userType 只有一个非 null） */
  teacherId: string | null;
  parentId: string | null;

  /** User.userType */
  userType: UserType;
}
```

**设计原则**：CurrentActor 是 AuthorizationContext 的子集。它可以独立存在（比如 Timeline 只需要知道"谁"），也可以作为 ctx 的一部分。

---

## 4. AuthorizationInfo（授权信息）

```typescript
/**
 * AuthorizationInfo — 授权信息（能力 + 组织 + 数据范围）
 *
 * Day 5.1 RBAC 产出 roleSet + permissionSet
 * Day 5.2 Organization 产出 organization
 * Day 5.3 DataScope Resolver 产出 dataScope
 */
export interface AuthorizationInfo {
  // ============================================================
  // 能力层（Day 5.1 RBAC 产出）
  // ============================================================

  /** 角色集合（Set，O(1) 查询） */
  roleSet: Set<RoleCode>;

  /** 能力集合（Set，O(1) 查询） */
  permissionSet: Set<PermissionCode>;

  // ============================================================
  // 组织层（Day 5.2 Organization 产出）
  // ============================================================

  organization: {
    /** 当前学校 ID */
    schoolId: string;
    /** 当前年级 ID 列表（多年级管理员可能有多个） */
    gradeIds: string[];
    /** 当前班级 ID 列表（DataScope 派生） */
    classIds: string[];
  };

  // ============================================================
  // 数据范围层（Day 5.3 DataScope Resolver 产出）
  // ============================================================

  dataScope: DataScope;
}
```

---

## 5. AuthorizationContext（组合对象）

```typescript
/**
 * AuthorizationContext — 授权上下文（Sprint 2 核心对象）
 *
 * 任何 Service 拿到 ctx 就拥有完整的：
 * - 我是谁（actor）
 * - 我能做什么（authorization）
 *
 * Sprint 2.2 起所有业务模块都依赖它。
 */
export interface AuthorizationContext {
  /** 当前操作者 */
  actor: CurrentActor;

  /** 授权信息（能力 + 组织 + 数据范围） */
  authorization: AuthorizationInfo;
}
```

**使用示例**：

```typescript
// 判断权限
if (ctx.authorization.permissionSet.has('leave:approve')) {
  // 允许审批
}

// 数据范围过滤
const classIds = ctx.authorization.dataScope.classIds;

// Timeline 记录操作者
const operator = ctx.actor; // 只取 actor，不取 authorization
```

---

## 6. DataScope（数据范围）

```typescript
/**
 * DataScope — 数据范围（Day 5.3 产出）
 *
 * 所有涉及"查哪些行"的 Repository 方法都依赖它。
 * 由 DataScopeResolver 从 TeacherClassRelation 派生。
 */
export interface DataScope {
  /** 可管理的班级 ID 列表（核心） */
  classIds: string[];

  /** 可管理的年级 ID 列表（年级主任） */
  gradeIds: string[];

  /** 是否可看全校（校长 / 管理员） */
  isSchoolWide: boolean;

  /** 是否仅限个人（家长只看自己孩子） */
  isParentScoped: boolean;

  /**
   * 权限算法版本号
   *
   * 初始值 = 1。以后权限算法升级时 +1。
   * Session 重建时比对版本——如果算法变了，强制重建 Context。
   */
  version: number;
}
```

### 6.1 DataScope 派生规则

| 角色 | classIds 来源 | isSchoolWide | isParentScoped |
| --- | --- | --- | --- |
| 班主任（HEAD_TEACHER） | TeacherClassRelation(role=HEAD, endDate=null) → classId | false | false |
| 任课教师（SUBJECT_TEACHER） | TeacherClassRelation(role=SUBJECT, endDate=null) → classId | false | false |
| 年级主任（GRADE_DIRECTOR） | Grade.directorId → gradeId → grade 下所有 classId | false | false |
| 宿管（DORM_MANAGER） | DormBuilding.managerId → building 下所有 dorm → dorm 下所有 student → student.classId | false | false |
| 管理员（SYSTEM_ADMIN） | 全校所有 classId | true | false |
| 家长（PARENT） | StudentParent.parentId → studentId → student.classId | false | true |

---

## 7. Repository ctx 传参规则

**不是所有 Repository 方法都需要 ctx**。只有涉及"查哪些行"的方法才传。

### 需要传 ctx 的方法（涉及数据范围）

| 方法模式 | 例子 | 为什么需要 |
| --- | --- | --- |
| findList / findPage | `leaveRepository.findList(ctx, query)` | 按班级过滤 |
| statistics | `studentRepository.statistics(ctx, query)` | 按权限范围统计 |

### 不需要传 ctx 的方法（纯查询 / 存在性检查）

| 方法模式 | 例子 | 为什么不需要 |
| --- | --- | --- |
| findById | `studentRepository.findById(id)` | 已有唯一 ID，不涉及范围 |
| exists | `leaveRepository.exists(id)` | 存在性检查 |
| count | `schoolRepository.count()` | 全局统计 |

### 修改操作（Service 层先判断 permission）

```typescript
// Service 层
async approveLeave(ctx: AuthorizationContext, leaveId: string) {
  // 1. 先判断权限
  if (!ctx.authorization.permissionSet.has('leave:approve')) {
    throw new ForbiddenError('无审批权限');
  }

  // 2. Repository 只做数据
  return this.leaveRepository.approve(leaveId, ctx.actor.userId);
}
```

**原则**：Service 层负责权限判断，Repository 负责数据。边界清晰。

---

## 8. Day 5 三阶段

### Day 5.1 RBAC

只回答：有没有 `leave:create` / `leave:approve` / `notice:create`。

不碰 DataScope。产出 `roleSet` + `permissionSet`。

### Day 5.2 Organization

回答：属于哪个学校 / 哪个年级 / 哪个班。

```
Teacher
  ↓
TeacherClassRelation
    ↓
Grade → School
```

不谈 Permission。产出 `organization`。

### Day 5.3 DataScope Resolver

把 RBAC + Organization 融合，得到 DataScope。

```
DataScopeResolver.resolve(teacherId) → DataScope
```

所有 Repository 的 findList / findPage / statistics 统一调用 DataScopeResolver。不每个 Service 自己拼 SQL。

---

## 9. TeacherClassRole 冻结

`TeacherClassRole` 冻结为 4 个枚举，**永不扩展**。

```
HEAD_TEACHER       ← 班主任
SUBJECT_TEACHER    ← 任课教师
VICE_HEAD_TEACHER  ← 副班主任
COUNSELOR          ← 心理辅导员
```

以后出现"德育导师 / 社团老师 / 备课组长"走 `TeacherTag`（灵活标签）。

```
TeacherRole（严格枚举，决定权限）     TeacherTag（灵活标签，决定筛选/通知）
  ├── 班主任                            ├── 英语组
  ├── 任课教师                          ├── 党员
  ├── 副班主任                          ├── 值班
  └── 心理辅导员                        ├── 德育导师
                                        ├── 备课组长
                                        └── 社团
```

Role 决定"能不能审批请假"。Tag 决定"给英语组所有教师发通知"。

---

## 10. 不变量（设计冻结后不可违反）

1. **Session 表不存 AuthorizationContext**：每次请求动态解析，Redis 可缓存 5 分钟
2. **Context 不存 Name**：改名字不影响 Session
3. **Context 不存业务数据**：actor 只放 id
4. **roles / permissions 用 Set**：O(1) 查询
5. **DataScope 无 source**：调试走日志，不进 Context
6. **DataScope 有 version**：算法升级可检测
7. **Repository 按需传 ctx**：findById 不传，findList 传
8. **Service 层判断 permission**：Repository 只做数据
9. **TeacherClassRole 永不扩展**：新增业务身份走 TeacherTag
10. **CurrentActor 统一操作者**：Timeline / AuditLog / OperationLog 全用它
11. **AuthorizationContext 是单点授权入口**：所有业务模块通过它拿权限，不自己查库
