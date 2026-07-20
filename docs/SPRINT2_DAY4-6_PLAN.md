# Sprint 2.1 Day 4-6：身份与访问

> **刘老师 Day 3 反馈后重写**（2026-07-18）
> **上游**：[PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) + [SPRINT2_DOMAIN_RULE_v1.md](./SPRINT2_DOMAIN_RULE_v1.md)
> **状态**：⏸ 等待刘老师确认本计划后再启动 Day 4

---

## 1. 改了什么

原计划 Day 4-6 = "Auth"（登录）。刘老师指出这不够。

**新计划**：

| Day | 主题 | 真正解决的问题 |
| --- | --- | --- |
| Day 4 | Identity（身份） | 一个老师/家长/学生，多入口（手机/微信/后台）都对应同一 User |
| Day 5 | Access（访问控制） | 同样是班主任，权限一样但 DataScope 不同（高一 1 班 vs 高一 8 班） |
| Day 6 | Session（会话） | Workbench 直接拿 `ctx.classIds` 而不是每个模块重查 |

整体目标：**Identity & Access（身份与访问）**。不是"Auth"。

---

## 2. Day 4：Identity（身份）

### 目标

> **一个老师，三个入口，都进同一个 User。**

业务场景：
- 张老师手机号登录（家长端扫码后第一次登录）
- 张老师微信登录（公众号菜单进入）
- 张老师后台账号登录（管理后台 Web 端）

三个入口应当：
- 拿到同一个 `User`（不是三个）
- 拿到同一个 `Teacher`（业务身份）
- 拿到同一条 `UserIdentity` 记录（每入口一条），通过 `userId` 关联

### 交付物

| 文件 | 职责 |
| --- | --- |
| `IdentityProvider` 枚举扩展 | 5 种：PHONE / WECHAT / ACCOUNT / DINGTALK / FEISHU（v1.2 已冻结） |
| `IdentityService.ts` | 核心：登录、绑定、合并、解绑 |
| `IdentityRepository.ts` | 数据访问（从 `user_identity` 表，已存在） |
| `PhoneLoginStrategy.ts` | 手机号 + 验证码登录 |
| `WechatLoginStrategy.ts` | 微信 OAuth 登录（Mock） |
| `AccountLoginStrategy.ts` | 后台账号 + 密码登录 |
| `LoginLogService.ts` | 登录日志（`last_login_at` / `last_login_ip` 已存在字段） |

### 关键冻结

- ✅ **同 User 原则**：三个入口 → 同一 user_id
- ❌ **不做**：手机号自动注册（必须 Teacher/Parent 已存在）
- ❌ **不做**：微信自动创建用户（必须走绑定流程）
- ✅ **强制要求**：每个 Identity 必须 `verified = true` 才能登录

### 验收标准

测试 1：手机号登录
- 输入：手机号 + 验证码
- 期望：返回 `User` + `Teacher`（如已绑定）
- 不期望：创建新 User

测试 2：微信登录
- 输入：微信 code（Mock）
- 期望：如已绑定 → 返回 User；如未绑定 → 提示"请先绑定手机号"
- 不期望：自动创建 User

测试 3：账号登录
- 输入：username + password
- 期望：返回 User + UserType = SYSTEM_ADMIN 或 TEACHER
- 不期望：家长通过账号登录

测试 4：多身份同 User
- 前提：张老师已绑定手机号 + 微信
- 操作：先手机登录拿到 User，再微信登录
- 期望：两次拿到同一 user_id

---

## 3. Day 5：Access（访问控制）

### 目标

> **同样都是班主任，权限一样；但 DataScope 由"班主任是谁 + 任教哪个班"动态决定。**

业务场景：
- 张老师是高一 1 班班主任 → 只能看高一 1 班学生
- 李老师是高一 8 班班主任 → 只能看高一 8 班学生
- 王老师既是高一 1 班任课老师又是高一 2 班任课老师 → 看高一 1 班 + 高一 2 班

### 核心模型：5 层 Access

```
Permission（能力）
    ↓ 组合
Role（角色：HEAD_TEACHER / SUBJECT_TEACHER / ...）
    ↓ 限定
Organization（组织：School / Grade / Class）
    ↓ 通过
Tag（标签：教学组 / 学科 / 临时分组）
    ↓ 派生
DataScope（数据范围：哪些 student_id 集合）
```

### 交付物

| 文件 | 职责 |
| --- | --- |
| `Permission` 枚举 | 能力（`leave:approve` / `notice:publish` / `student:read` / ...） |
| `Role` 枚举 | 6+2 双体系（沿用 v1.1） |
| `RolePermissionMap.ts` | 角色 → 能力映射（v1.1 冻结） |
| `AccessService.ts` | 核心：判断"某 user 在某 context 能否做某事" |
| `DataScopeResolver.ts` | 把 `userId` → `classIds[]`（核心） |
| `AccessGuard.ts` | NestJS Guard（`@RequirePermission('leave:approve')`） |

### 关键冻结

- ✅ **DataScope 来源**：`TeacherClassRelation.endDate IS NULL`（v1.3 已建）
- ✅ **班主任 = HEAD_TEACHER role + 当前有效 relation**（v1.3 已建）
- ❌ **不做**：权限继承（年级主任自动拥有下属班主任权限）—— v1.1 已明确不做
- ❌ **不做**：按 Tag 派生的 DataScope（v1.2 暂不实现，留到 Sprint 4）
- ✅ **强制要求**：任何 List API 必须强制传 `dataScope` 参数，不传 = 拒绝

### DataScope 解析算法

```typescript
// 简化版伪代码
function resolveDataScope(teacherId: string): DataScope {
  const relations = teacherClassRelationRepository.findCurrentRelations(teacherId);
  // HEAD_TEACHER 角色 → 整个班的学生
  // SUBJECT_TEACHER 角色 → 班 + 学科维度（v1.2 不细化，TODO Sprint 4）
  return {
    classIds: relations.filter(r => r.role === 'HEAD_TEACHER' || r.role === 'SUBJECT_TEACHER')
                        .map(r => r.classId),
    gradeIds: [],  // 暂时不派生 gradeIds（v1.2 不做）
    schoolId: schoolFromClass(relations[0]?.classId),
  };
}
```

### 验收标准

测试 1：班主任 DataScope
- 张老师（高一 1 班 HEAD_TEACHER）
- 调用 `resolveDataScope(张老师.id)`
- 期望：`classIds = [高一1班]`

测试 2：多班任课 DataScope
- 王老师（高一 1 班 SUBJECT_TEACHER + 高一 2 班 SUBJECT_TEACHER）
- 调用 `resolveDataScope(王老师.id)`
- 期望：`classIds = [高一1班, 高一2班]`

测试 3：调岗后 DataScope 变化
- 9 月：张老师是高一 1 班班主任
- 11 月：张老师调到高一 8 班
- 调用 `resolveDataScope(张老师.id)`
- 期望：`classIds = [高一8班]`，**高一 1 班通过历史关系仍可查（但不进 DataScope）**

测试 4：跨班访问拒绝
- 张老师（高一 1 班）调用 `studentRepository.findById(高一8班某学生.id)`
- 期望：AccessGuard 拒绝（无权限查看非本班学生）

---

## 4. Day 6：Session（会话）

### 目标

> **Workbench 直接拿 `ctx.classIds`，不重新查数据库。**

业务场景：
- 班主任打开小程序 → 后端在登录时已把 DataScope / Role / School / Grade / Class 全部装入 Session
- 任何后续 API 调 `ctx.classIds` 即可，不用每个 Service 重新查 `TeacherClassRelation`

### SessionContext 完整接口

```typescript
interface SessionContext {
  // === 身份 ===
  userId: string;            // User.id
  userType: UserType;        // SYSTEM_ADMIN / TEACHER / STUDENT / PARENT
  
  // === 业务身份 ===
  teacherId?: string;        // Teacher.id（如有）
  studentId?: string;        // Student.id（如有）
  parentId?: string;         // Parent.id（如有）
  
  // === 当前组织（直接冻结，不查库）===
  schoolId: string;          // 当前学校
  schoolName: string;
  gradeIds: string[];        // 当前年级（多年级管理员可能有多个）
  gradeNames: string[];
  classIds: string[];        // 当前班级（DataScope 派生）
  classNames: string[];
  
  // === 权限 ===
  roles: string[];           // 角色列表
  permissions: string[];     // 能力列表
  
  // === 时间戳 ===
  loginAt: Date;
  expiresAt: Date;
  
  // === 元数据 ===
  loginProvider: IdentityProvider;
  sessionId: string;         // Session.id（用于撤销）
}
```

### 交付物

| 文件 | 职责 |
| --- | --- |
| `SessionContext.ts` | 类型定义（共享给前后端） |
| `SessionService.ts` | 创建 / 读取 / 续期 / 撤销 Session |
| `SessionRepository.ts` | 数据访问（新建 `session` 表） |
| `SessionContextBuilder.ts` | 从 `User` + `Access` 构建完整 ctx（Day 4+5 整合） |
| `SessionContext.current(teacherId)` | 静态方法：从 ctx 拿到 DataScope |
| `SessionGuard.ts` | NestJS Guard（强制要求 ctx 存在） |

### 关键冻结

- ✅ **Session 存哪**：`session` 表（新建），存完整 ctx JSON + expiresAt
- ✅ **Token 格式**：JWT（`sessionId` + `userId`），`ctx` 不放 JWT（太大）
- ✅ **续期策略**：滑动窗口，活跃 30 分钟自动续期，最长 8 小时
- ❌ **不做**：分布式 Session（v1.2 单实例，TODO Sprint 4 接 Redis）
- ❌ **不做**：单点登录（v1.2 不做）
- ✅ **强制要求**：任何 Service 方法如未声明 `ctx: SessionContext`，编译告警

### 新表：`session`

```prisma
model Session {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  userType      UserType @map("user_type")
  context       Json     // SessionContext 完整 JSON
  loginProvider IdentityProvider @map("login_provider")
  loginAt       DateTime @map("login_at")
  expiresAt     DateTime @map("expires_at")
  lastActiveAt  DateTime @map("last_active_at")
  ip            String?
  userAgent     String?  @map("user_agent") @db.VarChar(500)
  revoked       Boolean  @default(false)
  revokedAt     DateTime? @map("revoked_at")
  revokeReason  String?  @map("revoke_reason") @db.VarChar(100)
  createdAt     DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, revoked])
  @@index([expiresAt])
  @@map("session")
}
```

### 验收标准

测试 1：登录后 ctx 已就绪
- 张老师手机号登录
- 调用 `sessionService.getCurrentContext()`
- 期望：`classIds.length === 1`，`permissions.includes('leave:approve') === true`

测试 2：ctx 直接用于工作台
- 班主任工作台首页
- 不查 `TeacherClassRelation`，直接 `ctx.classIds` 查询 StudentRepository
- 期望：性能 < 200ms（数据库查询只有 1 次）

测试 3：Session 过期
- 8 小时后
- 调用任何需要 ctx 的 API
- 期望：401 Unauthorized，提示"会话已过期"

测试 4：手动撤销
- 管理员在管理后台"踢出"张老师
- 张老师再次调用 API
- 期望：401，提示"会话已撤销"

---

## 5. 4 个拍板点（2026-07-18 刘老师最终决策）✅ 已锁

### 拍板 1：Day 4 三入口

**只做 3 个**：`PHONE` / `ACCOUNT` / `WECHAT`

`IdentityProvider` 枚举保留 `DINGTALK` / `FEISHU` / `WEWORK`（未来扩展），Day 4 不实现。

**原因**：班主任/科任教师/年级主任/政教/宿管 的日常使用是微信，不是钉钉/飞书。`UserIdentity` 表已支持扩展，未来学校有要求时加 provider 不需要改 schema。

### 拍板 2：Tag 是筛选器，不是权限

**Day 5 不在 DataScope 中加 Tag**。

Tag 通过 `NotificationTarget` 实现——给"所有党员教师发通知"=`NotificationTarget.targetType='TAG' + targetId='党员教师' tag.id`。

后续 Sprint 增加 `tag` 表 + `TagRepository`（v1.2 暂不实现）。

### 拍板 3：Session 表 + JWT 混合

```
JWT (Header)              session_id (Payload)
   |                            |
   +----------- Store ----------+
                ↓
           Session Table
   ┌──────────────────────────┐
   │ session_id                │
   │ user_id                   │
   │ device (mobile / web)     │
   │ platform (wechat / ios)   │
   │ login_ip                  │
   │ last_active_at            │
   │ expired_at                │
   │ status (ACTIVE/REVOKED)   │
   └──────────────────────────┘
```

**强制要求**：JWT 必须验证 session 表中 status=ACTIVE，否则 401。

**价值**：老师手机丢了 → 后台撤销 session → 老师立即无法登录（JWT 做不到）。

### 拍板 4：UserRepository 演化路径（业务禁依赖）

**Day 4 实施**：
- ✅ `UserRepository` 保留（认证 / 账户管理）
- ❌ 业务 Service **不允许** import `UserRepository`
- ✅ 业务 Service 应当 import `TeacherRepository` / `ParentRepository` / `StudentRepository`

**Day 4 验收**（自动检查）：
```bash
grep -r "userRepository" src/services/ | grep -v "auth\|identity\|session"  # 必须无输出
```

**业务 Service 列表**（Day 4 之后必须用领域 Repository）：
- `LeaveService` → `StudentRepository` / `TeacherRepository`
- `NoticeService` → `TeacherRepository`
- `TaskService` → `TeacherRepository`
- `DormService` → `StudentRepository`
- `StudentStatusService` → `StudentRepository` / `TeacherRepository`

---

## 6. 关于 UserRepository 命名

**刘老师建议**：慢慢演化

```
UserRepository  → IdentityRepository
                + TeacherRepository
                + ParentRepository
                + StudentRepository
```

**当前 Day 3 状态**：`UserRepository` 已存在，承载 4 UserType 共用方法。

**Day 4 计划**：
- 不删除 `UserRepository`
- 新建 `IdentityRepository`（专门管 `user_identity` 表）
- `UserRepository` 缩窄为只管 `user` 表的"账户"部分（username / password / status）
- 不强求 Day 4 完成拆分。`User` 作为"账户"是合理的，但**业务代码**应当通过 `Teacher` / `Parent` / `Student` 访问，**不**直接通过 `User`。

**Day 4 验收补充**：
- 业务 Service 不得 import `userRepository`（除了 IdentityService / AuthService）
- 业务 Service 一律 import `teacherRepository` / `parentRepository`

---

## 7. 整体验收

| Day | 单元测试 | 集成测试 |
| --- | --- | --- |
| Day 4 | 4 个登录策略 + 多身份同 User | 真实手机号验证码流程（Mock） |
| Day 5 | 4 个 DataScope 场景 | 跨班访问拒绝 |
| Day 6 | 4 个 Session 场景 | 8 小时过期 |

**Sprint 2.1 整体进度**：
- Day 1 类型冻结 ✅
- Day 2 数据库冻结 ✅
- Day 3 持久层 ✅
- Day 4 Identity ⬅️ 4 拍板已锁，可以开始
- Day 5 Access ⏸
- Day 6 Session ⏸
- **Sprint 2.1 Mid Review** ⏸ 待 Day 6 完成后

---

**Day 4 正式开始。**
