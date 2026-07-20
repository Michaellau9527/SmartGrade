# ADR-005: Authorization 架构决策（Role / Permission / DataScope 边界）

> **Sprint 2.1 — Day 5.2**
> **日期**：2026-07-20
> **状态**：✅ 冻结
> **上游规则**：docs/10-Permission.md §16 权限矩阵 + Sprint 2.1 Day 5.1/5.2 刘老师拍板

---

## 1. 背景

Sprint 2.1 Day 5.1 完成了 RBAC（Role + Permission + RolePermissionMap + AuthorizationService），Day 5.2 完成了 OrganizationResolver + DataScopeResolver。在交付前，刘老师提出 8 条关键设计建议，核心诉求是：**把权限系统的四个维度彻底拆清，防止后续膨胀和混乱**。

本 ADR 记录这四条边界决策，作为 Sprint 2 及后续所有权限相关开发的不可变约束。

---

## 2. 决策

### 2.1 Role 是平台固定角色，不允许学校自定义

**决策**：SmartGrade 的 `RoleCode` 是平台级枚举，共 8 个值，**永远不扩展为 per-school 自定义角色**。

```typescript
export enum RoleCode {
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_GRADE_DIRECTOR = 'ROLE_GRADE_DIRECTOR',
  ROLE_POLITICAL = 'ROLE_POLITICAL',
  ROLE_HEADMASTER = 'ROLE_HEADMASTER',
  ROLE_SUBJECT_TEACHER = 'ROLE_SUBJECT_TEACHER',
  ROLE_DORM_MANAGER = 'ROLE_DORM_MANAGER',
  ROLE_PARENT = 'ROLE_PARENT',
  ROLE_STUDENT = 'ROLE_STUDENT',
}
```

**为什么**：
- 一旦允许学校自定义 Role，Permission 矩阵、DataScope 规则、前端菜单渲染全部需要动态配置，复杂度指数级增长。
- 学校的个性化需求（如"英语组长""党员教师"）用 **Tag** 解决，不走 Role。

**约束**：
- ❌ 数据库 `role` 表仅用于存储教师与平台角色的关联，**不**存储学校自定义角色。
- ❌ 任何 PR 不得引入 `ROLE_XXX` 之外的新角色枚举值，除非经过产品负责人（刘老师）书面批准。
- ✅ 学校个性化分组 → `Tag`（标签系统）。

---

### 2.2 Tag 是业务标签，可扩展

**决策**：`Tag` 是业务层面的筛选器，**不参与权限判断**，仅用于通知精准推送和数据筛选。

**与 Role 的区别**：

| 维度 | Role | Tag |
| --- | --- | --- |
| 数量 | 8 个，固定 | 无限，可扩展 |
| 来源 | 平台枚举 | 学校后台配置 |
| 用途 | 能力授权 + 数据范围 | 通知筛选 + 数据分组 |
| 参与权限判断 | ✅ 是 | ❌ 否 |
| 参与 DataScope | ✅ 是（通过 Role 推导） | ❌ 否 |
| 示例 | ROLE_HEADMASTER | "英语组"、"党员教师" |

**约束**：
- ❌ Tag **不得**出现在 `RolePermissionMap` 中。
- ❌ Tag **不得**用于决定 DataScope。
- ✅ Tag 仅用于 `NotificationTargetType.TAG` 通知推送。

---

### 2.3 Permission 只表示能力，不表示数据范围

**决策**：`PermissionCode` 的语义是 **"能不能做这个动作"**，不是 **"能不能看到这条数据"**。

**正确示例**：
```typescript
PermissionCode.LEAVE_CREATE   // 能不能发起请假
PermissionCode.LEAVE_APPROVE  // 能不能审批请假
PermissionCode.NOTICE_PUBLISH // 能不能发布通知
PermissionCode.STUDENT_READ   // 能不能查看学生信息
```

**错误示例（禁止）**：
```typescript
// ❌ 禁止：把数据范围混进 Permission
PermissionCode.GRADE_10_VIEW    // 不能看十年级的"能力"
PermissionCode.CLASS_1_VIEW     // 不能看一班的"能力"
PermissionCode.ONLY_MY_STUDENTS // 不能看"只有自己学生"的"能力"
```

**为什么**：
- 如果把数据范围写进 Permission，每个新班级、新年级都要新增 Permission， Permission 数量会爆炸（28 → 200+）。
- DataScope 是独立的维度，用 `classIds` / `gradeIds` / `isSchoolWide` / `isParentScoped` 表达，与 Permission 解耦。

**约束**：
- ❌ PermissionCode 命名必须遵循 `domain.action`（如 `leave.create`），**不得**包含组织标识。
- ❌ Repository 的数据范围过滤 **必须**依赖 `AuthorizationContext.dataScope`，**不得**依赖 PermissionCode。
- ✅ `PermissionCode.STUDENT_READ` 表示"有查看学生的能力"，至于"看哪些学生"由 DataScope 决定。

---

### 2.4 DataScope 是唯一的数据权限来源

**决策**：所有涉及"查哪些行"的 Repository 方法，数据范围 **唯一**来源是 `AuthorizationContext.dataScope`。

**DataScope 结构**：
```typescript
interface DataScope {
  classIds: string[];        // 可管理的班级
  gradeIds: string[];        // 可管理的年级
  isSchoolWide: boolean;     // 是否可看全校
  isParentScoped: boolean;   // 是否仅限个人（家长）
  version: number;           // 权限算法版本
}
```

**Resolver 分层**：

```
User → CurrentActor
  ↓
OrganizationResolver.resolve(actor) → Organization { schoolId, gradeIds, classIds }
  ↓
DataScopeResolver.resolve(actor) → DataScope { classIds, gradeIds, isSchoolWide, isParentScoped, version }
  ↓
Repository.findMany(ctx) → WHERE classId IN ctx.dataScope.classIds OR ctx.dataScope.isSchoolWide
```

**约束**：
- ❌ **禁止**在 Repository 中根据 `RoleCode` 直接推导数据范围。
- ❌ **禁止**在 Service 中根据 `PermissionCode` 推导数据范围。
- ✅ 数据范围 **必须**通过 `DataScopeResolver` 统一解析，然后写入 `AuthorizationContext.dataScope`。
- ✅ Repository 只认 `ctx.dataScope`，不认角色。

**Repository 边界（刘老师拍板）**：

| 方法类型 | 是否传 ctx | 说明 |
| --- | --- | --- |
| `findById()` | ❌ 否 | 单条查询，无数据范围 |
| `exists()` | ❌ 否 | 存在性检查，无数据范围 |
| `count()` | ❌ 否 | 计数（如需范围，在 Service 层过滤） |
| `list()` / `page()` | ✅ 是 | 列表/分页，必须按 DataScope 过滤 |

---

## 3. 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    AuthorizationResolver                     │
│  resolve(userId) → AuthorizationContext                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User/Role/   │    │ Organization    │    │  DataScope      │
│  Permission   │    │   Resolver      │    │   Resolver      │
│  (RBAC)       │    │                 │    │                 │
│               │    │ School→Grade→   │    │ classIds/       │
│ roleSet       │    │ TeacherClass    │    │ gradeIds/       │
│ permissionSet │    │ Relation        │    │ isSchoolWide    │
└───────────────┘    └─────────────────┘    └─────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AuthorizationContext                            │
│  { actor, authorization: { roleSet, permissionSet,           │
│    organization, dataScope }, issuedAt }                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌─────────────────┐                       ┌─────────────────┐
│ Authorization   │                       │   Repository    │
│   Service       │                       │   (list/page)   │
│                 │                       │                 │
│ hasPermission() │                       │ WHERE classId   │
│ hasRole()       │                       │   IN ctx.data   │
│ requirePermission()                     │   Scope.classIds│
└─────────────────┘                       └─────────────────┘
```

---

## 4. 文件清单

| 文件 | 职责 | 边界 |
| --- | --- | --- |
| `shared/enums/RoleCode.ts` | 8 平台角色 | 冻结，不扩展 |
| `shared/enums/PermissionCode.ts` | 28 能力 | 只表示能力，不表示数据范围 |
| `backend/src/authorization/role-permission.map.ts` | 角色→权限映射 | 内部 Map，只导出 `getPermissions()` |
| `backend/src/authorization/types.ts` | CurrentActor + AuthorizationInfo + DataScope + AuthorizationContext | `issuedAt` 用于缓存过期判断 |
| `backend/src/authorization/authorization.service.ts` | 能力判断 | 只回答"有没有权限" |
| `backend/src/authorization/organization.resolver.ts` | 组织归属解析 | School → Grade → TeacherClassRelation |
| `backend/src/authorization/data-scope.resolver.ts` | 数据范围解析 | 唯一公开方法 `resolve(actor)` |
| `backend/src/authorization/authorization.resolver.ts` | 授权上下文组装 | 调用 Org + DataScope Resolver |

---

## 5. 测试结果

| Suite | Tests | 覆盖点 |
| --- | --- | --- |
| test6-day5-authorization | 35 | RoleCode / PermissionCode / getPermissions / AuthorizationService / OrganizationResolver / DataScopeResolver / AuthorizationResolver 整合 |
| **Total Day 5.1–5.2** | **35** | **全部通过** |
| **总测试 Sprint 2.1** | **74** | **Day 1–5 全部通过** |

---

## 6. 不变量（Invariants）

以下约束在 Sprint 2 及后续开发中**永远不变**：

1. **Role 固定**：`RoleCode` 只有 8 个值，学校自定义需求走 Tag。
2. **Tag 不参权**：Tag 只用于通知筛选，不参与权限判断和数据范围。
3. **Permission = 能力**：PermissionCode 命名 `domain.action`，不包含组织标识。
4. **DataScope 独权**：数据范围唯一来源是 `DataScopeResolver`，Repository 只认 `ctx.dataScope`。
5. **Resolver 单一入口**：`OrganizationResolver.resolve(actor)` 和 `DataScopeResolver.resolve(actor)` 各只有一个公开方法。
6. **Service 纯判断**：`AuthorizationService` 只回答"有没有权限"，不构建 Context。

---

## 7. 风险与后续

| 项 | 描述 | 解决时机 |
| --- | --- | --- |
| 政教 DataScope 精确性 | 当前用"无班级关系 → isSchoolWide"推断政教，未来需更精确的角色标记 | Sprint 2.3 班主任工作台 |
| 宿管 DataScope | 宿管只看住宿生，当前简化处理，未来需按 boardingType 过滤 | Sprint 3 宿舍管理 |
| OrganizationResolver 真实依赖 | 当前为接口，需接入真实 Repository（TeacherRepository.findCurrentRelations） | Sprint 2.2 登录流程 |
| DataScope 缓存 | `issuedAt` 已预留，未来可缓存 Context 5 分钟 | Sprint 2.3 |

---

**Day 5.2 完成。Identity → Authorization → DataScope 链条已打通。** ✅
