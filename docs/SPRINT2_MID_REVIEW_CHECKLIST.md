# Sprint 2.1 Mid Review 检查清单

> **刘老师 Day 3 反馈后**（2026-07-18）
> **目的**：Day 6 完成后、开始 Sprint 2.2 班主任工作台前，必须通过的评审
> **状态**：⏸ 待 Day 6 完成后执行

---

## 一、评审原则

> Day 1-3 是"基础设施"。Day 4-6 是"准入门槛"。Mid Review 是"防止 Sprint 2.2 工作台做返工"。

评审目的**不是**检查 30/30 测试通过，**而是**：

1. **业务规则是否真的冻结**（不是写完代码就完了，是规则被业务验证了）
2. **数据是否真的准确**（不是 schema 跑得通，是真数据流得对）
3. **身份是否真的能用**（不是登录成功，是权限边界清晰）
4. **会话是否真的复用**（不是 token 不报错，是 ctx 能直接驱动业务）

任意一项不通过 → 不进入 Sprint 2.2。

---

## 二、6 大评审项

### 1. 登录流程（Day 4）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| 手机号登录 | 输入手机号+验证码 → 返回 User + Teacher | Postman + 截图 |
| 微信登录 | Mock 微信 code → 已绑定返回 User | Postman |
| 账号登录 | username+password → 返回 User | Postman |
| 同 User 多入口 | 手机登录拿 userId1，微信登录拿 userId2，相等 | 单元测试 test4-identity.test.ts |
| 未绑定禁止登录 | 新手机号直接登录 → 拒绝"用户不存在" | 单元测试 |
| 验证码防刷 | 1 分钟内 5 次 → 锁定 | 单元测试（TODO v1.1） |
| 登录日志 | 每次登录写入 last_login_at + last_login_ip | DB 查表 |

**通过条件**：6/6 测试通过 + 至少 1 次手动验证。

### 2. RBAC（Day 5）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| 角色定义 | 6 角色（系统管理员 / 校长 / 副校长 / 年级主任 / 班主任 / 任课教师 / 心理老师 / 宿管）+ 2 扩展（家长 / 学生） | 枚举验证 |
| 角色→能力映射 | 每个 role 有明确能力列表，无歧义 | 单元测试 |
| 能力枚举完整 | 至少 15 个能力（leave:approve / student:read / notice:publish / task:create / ...） | 枚举检查 |
| 角色继承 | **不**做继承（v1.1 明确） | 代码 review |
| 多角色 | 一个用户可同时拥有多个 role | 单元测试（张老师既是班主任又是任课教师） |

**通过条件**：4/4 通过。

### 3. DataScope（Day 5）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| 班主任只看本班 | 张老师（高一 1 班）调 `findByClass(高一 8 班)` → 拒绝 | 单元测试 |
| 多班任课 | 王老师（1 班 + 2 班）DataScope = [1, 2] | 单元测试 |
| 调岗后正确 | 9 月 → 11 月调岗后 DataScope 变化 | 单元测试（v1.3 startDate/endDate） |
| 行政角色全权 | 校长 → 全校 DataScope | 单元测试 |
| 年级主任看全年级 | 年级主任 → 全年级 DataScope | 单元测试 |
| 历史不丢 | 11 月调岗后，高一 1 班关系仍能查 findAllRelations | 单元测试 |
| 强制 dataScope | List API 不传 dataScope → 拒绝 | 单元测试 |

**通过条件**：7/7 通过。

### 4. Session（Day 6）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| SessionContext 完整 | userId / teacherId / classIds / permissions 全部就绪 | 单元测试 |
| 滑动续期 | 30 分钟内操作 → expiresAt 自动延长 | 单元测试 |
| 过期拒绝 | 8 小时后 → 401 | 单元测试 |
| 手动撤销 | 管理员踢出 → 401 | 单元测试 |
| 跨设备 | A 手机登录 + B 手机登录 → 两个 Session 独立 | 单元测试 |
| ctx 直接驱动 | Workbench 调 `ctx.classIds` 不查库 | 性能 < 200ms |

**通过条件**：6/6 通过。

### 5. Repository（Day 3）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| 21 张表全部有 Repository | 无遗漏 | 文件清单 |
| 状态保护 v1.3 | `student.setCurrentStatus` 抛错 | test4-status-protection |
| 永久留痕 R-014 | `timeline.update/delete` 抛错 | test4-status-protection |
| 不自动判定 v4.2 | `leave.autoMarkOverdue` 抛错 | test4-status-protection |
| 调岗事务 | `teacher.transferTeacher` 关闭旧+创建新 | test2-teacher-scope |
| 软删规范 | `softDelete` 只设 deletedAt | test1-organization-chain |

**通过条件**：6/6 通过。

### 6. Timeline（Day 3）

| 检查项 | 通过标准 | 验证方法 |
| --- | --- | --- |
| 21 事件全有 | 21 enum 值全存在 | 枚举检查 |
| 5 来源完整 | LEAVE / DORM / NOTICE / INCIDENT / STUDENT | 枚举检查 |
| relatedType/relatedId | v1.3 字段存在 + 可反查 | test3-leave-timeline |
| 唯一性约束 | (studentId, eventSource, sourceEventId) 唯一 | DB schema 验证 |
| 事件驱动状态 | LEAVE_GATE_LEFT → 状态变 | test4-status-protection |
| 事务原子 | 创建事件 + 改状态 同事务 | test3-leave-timeline |

**通过条件**：6/6 通过。

---

## 三、跨项检查

| 检查项 | 描述 |
| --- | --- |
| 业务不直接调 UserRepository | 业务 Service 仅 import teacher / parent / student repository |
| 业务不直接改状态 | 任何状态变更必须经 Timeline |
| 业务不自动判定 | 任何状态变更必须由人触发 |
| 业务不绕 Session | 任何需要 ctx 的 API 强制走 SessionGuard |
| 永久留痕 | 任何 Timeline 记录不可改 / 不可删 |
| 调岗保留历史 | 任何教师-班级关系变更保留 startDate/endDate |

**通过条件**：6/6 通过（grep 验证）。

---

## 四、不通过的处理

按以下原则决定：

| 严重程度 | 处理 |
| --- | --- |
| 阻塞 Sprint 2.2 的 | 必须修 |
| 性能 / 体验问题 | 记入 Sprint 2.2 Backlog |
| 未来功能未实现 | 记入后续 Sprint |

### 必须修（不可进入 Sprint 2.2）

- 任一测试用例失败
- 任一冻结规则被破坏
- 任一自动判定方法存在

### 记入 Backlog（可进入 Sprint 2.2 但有备注）

- 性能 < 阈值
- 边界 case 漏测
- 文案 / 错误提示不友好

---

## 五、评审输出

评审通过后输出：

- [ ] `docs/mid-review-day6.md` — 评审报告（6 大项 + 跨项 + 决议）
- [ ] CHANGELOG 更新 Mid Review 章节
- [ ] Sprint 2.2 Workbench 启动

---

## 六、当前进度对照

| 阶段 | 状态 | 预期完成日 |
| --- | --- | --- |
| Day 1 类型冻结 | ✅ | 2026-07-15 |
| Day 2 数据库冻结 | ✅ | 2026-07-16 |
| Day 3 持久层 | ✅ | 2026-07-18 |
| Day 4 Identity | ⏸ 待 Day 4 计划确认 | - |
| Day 5 Access | ⏸ | - |
| Day 6 Session | ⏸ | - |
| **Mid Review** | ⏸ 待 Day 6 完成 | - |
| Sprint 2.2 Workbench | ⏸ 待 Mid Review 通过 | - |

---

**Last Updated**: 2026-07-18 · Mid Review 计划制定
