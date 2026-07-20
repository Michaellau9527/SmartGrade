# ADR-006: Dependency Rule（单向依赖，禁止反向）

> **Sprint 2.1 — Milestone Review**
> **日期**：2026-07-20（v1.1 更新）
> **状态**：✅ 冻结
> **上游规则**：刘老师 Sprint 2.1 Milestone Review 拍板

---

## 1. 背景

SmartGrade 后端已形成清晰的五层架构：

```
Identity（你是谁）
      ↓
Authorization（你能干什么）
      ↓
Organization（你属于哪里）
      ↓
DataScope（你能看到什么）
      ↓
Business Modules（业务模块）
```

为防止层次混乱，需要明确规定**单向依赖规则**。

---

## 2. 决策

### 依赖方向（唯一合法）

```
Controller
    ↓
Guard / Decorator
    ↓
Service（业务编排）
    ↓
AuthorizationService / AuthorizationResolver
    ↓
Repository（数据访问）
    ↓
Prisma Client
    ↓
Database
```

**规则：依赖只能从上到下，禁止反向。**

### 核心约束

> **Repository 是唯一允许访问 Prisma Client 的地方。**
>
> 以后新人看到这句话，就知道不能在 Service 写 `this.prisma.student.findMany()`。

### 具体约束

| 源 | 允许依赖 | 禁止依赖 |
| --- | --- | --- |
| **Controller** | Guard、Decorator、Service | Prisma、Repository |
| **Guard** | AuthorizationService、AuthorizationContext | Prisma、Service 业务逻辑 |
| **Service** | AuthorizationService、Repository | Prisma（直接调用） |
| **AuthorizationService** | AuthorizationContext（types） | Prisma、Repository、业务实体 |
| **AuthorizationResolver** | Repository（deps 接口）、getPermissions() | 业务 Service、业务实体 |
| **OrganizationResolver** | Repository（deps 接口） | AuthorizationService |
| **DataScopeResolver** | Repository（deps 接口） | AuthorizationService |
| **Repository** | Prisma | Authorization、Service、Guard |

### 三条红线

**红线 1：Service 不直接调用 Prisma**

```typescript
// ❌ 禁止
class LeaveService {
  constructor(private prisma: PrismaService) {}
  async list() { return this.prisma.leaveRecord.findMany(...); }
}

// ✅ 正确
class LeaveService {
  constructor(private leaveRepo: LeaveRepository) {}
  async list() { return this.leaveRepo.findMany(...); }
}
```

**红线 2：Repository 不认识 Role / Permission / Tag**

```typescript
// ❌ 禁止：Repository 中出现 Role 判断
class StudentRepository {
  async findMany(role: string) {
    if (role === 'ROLE_HEADMASTER') { ... } // ❌
  }
}

// ✅ 正确：Repository 只认 DataScope
class StudentRepository {
  async findMany(scope: DataScope) {
    if (scope.isSchoolWide) { ... } // ✅
  }
}
```

**红线 3：Guard 不查业务数据**

```typescript
// ❌ 禁止：Guard 中查数据库
class PermissionGuard {
  async canActivate() {
    const user = await this.prisma.user.findUnique(...); // ❌
  }
}

// ✅ 正确：Guard 只检查 AuthorizationContext
class PermissionGuard {
  async canActivate() {
    return this.authzService.requirePermission(ctx, perm); // ✅
  }
}
```

---

## 3. Sprint 1 遗留问题（Tech Debt）

当前 `modules/` 目录下全部 Service 直接注入 `PrismaService`，违反红线 1。

详细清单见 `ARCHITECTURE_CHECKLIST.md` TD-001 ~ TD-018，全部归入 Sprint 2.2 "Authorization Refactor" 清理。

---

## 4. 不变量

1. **依赖单向**：上层可以依赖下层，下层不得反向依赖上层。
2. **Repository 独占 Prisma**：Repository 是**唯一**允许访问 Prisma Client 的地方。Service、Guard、Controller 禁止直接使用 Prisma。
3. **Repository 不认权限**：Repository 只认 DataScope，不认 Role / Permission / Tag。
4. **Guard 不查数据**：Guard 只检查 AuthorizationContext，不查业务数据。
5. **Authorization 层纯净**：AuthorizationService / Resolver 不导入业务实体。
