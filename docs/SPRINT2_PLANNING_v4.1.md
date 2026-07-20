# Sprint 2 Planning v4.1 — Engineering Patch（工程补丁包）

> Version：4.1 — **v4 的工程级补丁包**
> Project：SmartGrade 智慧年级管理平台
> Status：**与 v4 并行生效**（v4 基础冻结 + v4.1 工程微调）
> Author：Trae（基于刘老师 2026-07-18 第四轮 + 工程细节反馈）
> Date：2026-07-18
> 历史版本：[v1](./SPRINT2_PLANNING_v1.md) · [v2.bak](./SPRINT2_PLANNING_v2.md.bak) · [v3.bak](./SPRINT2_PLANNING_v3.md.bak) · [v4.bak](./SPRINT2_PLANNING_v4.md)

---

## 文档目的

v4 已经完成产品架构冻结。本补丁包（v4.1）在 v4 基础上**做 5 个工程级微调**，确保 Sprint 2.1 编码阶段不再返工。

**v4.1 不修改 v4 任何冻结对象**，仅做以下补充：

1. **新增** `LeaveTimeline` 字段（TimelineEvent 扩展）
2. **新增** `UserIdentity` 实体（解耦多登录方式）
3. **确认** `NotificationTarget` 独立模型（v4 已有，v4.1 强化）
4. **微调** 家长端展示层命名（"违纪" → "学生行为记录"）
5. **微调** 工作台设计哲学（入口不是统计）
6. **细化** Sprint 2.1 14 天开发顺序

---

# 第一章 补丁清单

| # | 补丁项 | 类别 | 优先级 |
|---|---|---|---|
| 1 | LeaveTimeline 字段（TimelineEvent 扩展） | 数据层 | P0 |
| 2 | UserIdentity 实体 | 数据层 | P0 |
| 3 | NotificationTarget 独立模型确认 | 数据层 | P0（v4 已有） |
| 4 | 家长端"违纪"→"学生行为记录"展示 | 展示层 | P1 |
| 5 | 工作台 = 工作流入口（不是统计页） | 设计哲学 | P0 |
| 6 | Sprint 2.1 14 天开发顺序 | 工程 | P0 |

---

# 第二章 补丁 1：LeaveTimeline 字段

> 刘老师："请一定保留 LeaveTimeline。未来 AI 分析价值非常高。"

## 2.1 设计原则

- 不创建新的 `LeaveTimeline` 表
- 复用 Project Rule R-013 / R-014 的 `TimelineEvent`
- 扩展 `TimelineEvent.event_type` 联合类型

## 2.2 字段冻结

```typescript
// 复用 TimelineEvent，扩展 event_type
type LeaveTimelineEventType =
  | 'LEAVE_CREATED'        // 班主任创建
  | 'LEAVE_SUBMITTED'      // 班主任提交
  | 'LEAVE_APPROVED'       // 年级通过
  | 'LEAVE_REJECTED'       // 年级驳回
  | 'LEAVE_REVOKED'        // 班主任撤销
  | 'LEAVE_GATE_LEFT'      // 门卫确认离校
  | 'LEAVE_RETURNED'       // 班主任/宿管确认返校
  | 'LEAVE_CLOSED'         // 销假
  | 'LEAVE_NO_SHOW'        // 未离校
  | 'LEAVE_EXPIRED'        // 已过期
  | 'LEAVE_OVERDUE'        // 逾期未返
  | 'LEAVE_LATE_RETURN'    // 补登记返校
  | 'LEAVE_RESUBMITTED';   // 改后重提

interface TimelineEvent {
  event_id: string;
  event_type: string;            // 含 LeaveTimelineEventType
  entity_type: 'STUDENT' | 'LEAVE' | 'NOTICE' | 'TASK' | 'INCIDENT';
  entity_id: string;             // 例如 leave_id
  student_id?: string;           // 关联学生
  class_id?: string;
  actor_id: string;              // 操作人
  actor_name: string;
  actor_role: string;
  action: string;                // 动作描述
  metadata?: Record<string, unknown>;  // 状态前后值
  created_at: string;            // ISO8601
  is_protected: true;            // R-014 不可修改
}
```

## 2.3 一次请假的时间轴示例

```text
【学生】张三 - 病假 1天 - 2026-07-18 08:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
08:00 班主任(李老师) 创建请假           LEAVE_CREATED
08:05 班主任(李老师) 提交审批           LEAVE_SUBMITTED
08:15 年级主任(王主任) 审批通过         LEAVE_APPROVED
08:30 门卫(张师傅) 确认离校            LEAVE_GATE_LEFT
17:30 班主任(李老师) 确认返校          LEAVE_RETURNED
17:35 班主任(李老师) 销假              LEAVE_CLOSED

[AI 异常分析]
- 审批耗时 10 分钟（年级平均 8 分钟，✅ 正常）
- 离校到返校 9 小时（病假正常时长，✅ 正常）
- 返校后及时销假（✅）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 2.4 AI 未来分析维度

| 维度 | 数据源 |
|---|---|
| 班级请假频次 | `entity_id=class_id` 聚合 |
| 学生异常离校 | `event_type=LEAVE_NO_SHOW` 频率 |
| 审批耗时 | `LEAVE_SUBMITTED → LEAVE_APPROVED` 时差 |
| 班级返校及时率 | `LEFT → RETURNED` 时间差 |

## 2.5 冻结声明

> `LeaveTimelineEventType` 13 个类型冻结。不允许新增顶层类型。
> `TimelineEvent` 字段不允许修改。

---

# 第三章 补丁 2：UserIdentity 实体

> 刘老师："不要把微信绑定直接放 User。UserIdentity 解耦多登录方式。"

## 3.1 问题场景

如果把微信绑定直接放 User：

```typescript
// ❌ v4 设计（v4.1 已修正）
interface User {
  phone: string;                  // 主登录
  wechat_openid?: string;         // 微信登录
  wechat_unionid?: string;
  // 未来加：dingtalk_id / feishu_id / work_wechat ...
}
```

- 一个老师三种登录，User 表被污染
- 多端解绑困难
- 未来加企业微信要改 User 表

## 3.2 v4.1 解耦方案

```typescript
// ✅ User 主表：只保留手机号（最稳定身份）
interface User {
  id: string;
  name: string;
  phone: string;                  // 唯一
  avatar?: string;
  email?: string;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING';
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  // v4.1 移除：wechat_openid / wechat_unionid
}

// ✅ UserIdentity：独立的身份凭证表
type IdentityType = 'PHONE' | 'WECHAT' | 'ACCOUNT' | 'DINGTALK' | 'FEISHU';

interface UserIdentity {
  identity_id: string;
  user_id: string;                // 关联 User
  type: IdentityType;
  identifier: string;             // phone / openid / username
  credential?: string;            // 密码哈希（仅 ACCOUNT）或 token
  verified: boolean;              // 是否已验证
  is_primary: boolean;            // 是否主登录方式
  last_used_at?: Date;
  created_at: Date;
}
```

## 3.3 使用示例

```typescript
// 班主任 3 种登录方式
User: { id: 'u_001', name: '李老师', phone: '13800138000' }
UserIdentity: [
  { user_id: 'u_001', type: 'PHONE', identifier: '13800138000', is_primary: true },
  { user_id: 'u_001', type: 'WECHAT', identifier: 'wx_openid_xxx' },
  { user_id: 'u_001', type: 'ACCOUNT', identifier: 'teacher_li' }
]
```

## 3.4 登录流程

```typescript
// PHONE 登录
1. 输入手机号 + 验证码
2. SELECT user_id FROM user_identity WHERE type='PHONE' AND identifier='13800138000'
3. 找到 user_id，签发 JWT（包含 user_id + roles + abilities）

// WECHAT 登录
1. 微信小程序 wx.login() → code
2. 后端 code 换 openid
3. SELECT user_id FROM user_identity WHERE type='WECHAT' AND identifier=openid
4. 找到 user_id，签发 JWT

// ACCOUNT 登录（后台管理员）
1. 输入 username + password
2. SELECT user_id, credential FROM user_identity WHERE type='ACCOUNT' AND identifier=username
3. 验证 password 哈希
4. 签发 JWT
```

## 3.5 冻结声明

> `User` 字段冻结，**不再直接包含 wechat_openid / wechat_unionid**。
> `UserIdentity` 表冻结，type 联合 5 个值（未来扩展 DingTalk/Feishu 仅扩展联合类型）。

---

# 第四章 补丁 3：NotificationTarget 独立模型确认

> v4 已确立，v4.1 强化字段并补充样例。

## 4.1 模型完整定义（v4.1 强化版）

```typescript
// 7 种目标类型（冻结）
type NotificationTargetType = 
  | 'SCHOOL'      // 全校
  | 'GRADE'       // 全年级
  | 'CLASS'       // 全班
  | 'ROLE'        // 某角色
  | 'USER'        // 单个用户
  | 'STUDENT'     // 单个学生
  | 'PARENT'      // 单个家长
  | 'TAG';        // 标签

interface NotificationTarget {
  target_id: string;
  notice_id: string;
  target_type: NotificationTargetType;
  target_id_value: string;        // 实体 ID
  target_name?: string;           // 冗余查询字段
  target_count?: number;          // GROUP 类型时的人数
  created_at: Date;
}
```

## 4.2 真实使用样例

```typescript
// 例 1：年级主任向全年级家长发布
notice.targets = [
  { target_type: 'GRADE', target_id_value: 'grade_001', target_name: '高一年级' }
];

// 例 2：政教向所有住校生家长发布
notice.targets = [
  { target_type: 'TAG', target_id_value: 'BOARDING', target_name: '住校生', target_count: 580 }
];

// 例 3：年级主任向所有班主任发布任务通知
notice.targets = [
  { target_type: 'GRADE', target_id_value: 'grade_001' },
  { target_type: 'ROLE', target_id_value: 'HEAD_TEACHER' }
];

// 例 4：班主任向本班家长发离校通知
notice.targets = [
  { target_type: 'CLASS', target_id_value: 'class_011', target_name: '高一(1)班' }
];
```

## 4.3 解析逻辑

```typescript
// 通知触达时，按 targets 解析为实际接收人
async function resolveRecipients(noticeId: string): Promise<NoticeReceipt[]> {
  const targets = await getNoticeTargets(noticeId);
  const userIds = new Set<string>();
  
  for (const target of targets) {
    switch (target.target_type) {
      case 'SCHOOL':
        // 全校教师 + 家长 + 学生
        userIds.add(...await getAllUserIdsBySchool(target.target_id_value));
        break;
      case 'GRADE':
        userIds.add(...await getUserIdsByGrade(target.target_id_value));
        break;
      case 'CLASS':
        userIds.add(...await getUserIdsByClass(target.target_id_value));
        break;
      case 'ROLE':
        userIds.add(...await getUserIdsByRole(target.target_id_value));
        break;
      case 'USER':
        userIds.add(target.target_id_value);
        break;
      case 'STUDENT':
        userIds.add(target.target_id_value);
        // 自动同步家长
        userIds.add(...await getParentIdsByStudent(target.target_id_value));
        break;
      case 'PARENT':
        userIds.add(target.target_id_value);
        break;
      case 'TAG':
        userIds.add(...await getUserIdsByTag(target.target_id_value));
        break;
    }
  }
  
  return Array.from(userIds).map(userId => ({
    notice_id: noticeId,
    receiver_id: userId,
    receiver_type: detectReceiverType(userId),
    sent_at: new Date(),
  }));
}
```

## 4.4 冻结声明

> `NotificationTargetType` 8 个值冻结。
> `NotificationTarget` 字段冻结。
> 任何新目标类型必须通过 Project Rule 修订流程。

---

# 第五章 补丁 4：家长端展示层命名

> 刘老师："'违纪'比较敏感。展示层用'学生行为记录'，学校接受度更高。"

## 5.1 数据层 vs 展示层分离

| 层 | 名称 | 说明 |
|---|---|---|
| 数据层（DB / API） | `Incident` | 内部准确，不变 |
| 业务层（statusMap） | `INCIDENT` | TypeScript 枚举，不变 |
| **展示层** | **"学生行为记录"** | **v4.1 新增** |

## 5.2 家长端文案

| ❌ 旧文案 | ✅ 新文案 |
|---|---|
| 您孩子的违纪记录 | **学生行为记录** |
| 违纪情况 | 行为情况 |
| 违纪类型 | 行为类型 |
| 违纪时间 | 发生时间 |
| 违纪处理 | 处理方式 |

## 5.3 状态映射（v4.1 调整）

```typescript
// 数据层
export const incidentStatusMap: StatusMap = {
  DRAFT: { label: '草稿', color: 'default' },
  SUBMITTED: { label: '已提交', color: 'warning' },
  REVIEWED: { label: '已审核', color: 'processing' },
  PUBLISHED: { label: '已通报', color: 'success' },
  CLOSED: { label: '已结案', color: 'default' },
};

// 展示层（家长端专用映射）
export const parentIncidentStatusMap: StatusMap = {
  DRAFT: { label: '已记录', color: 'default' },         // 家长端隐藏
  SUBMITTED: { label: '已记录', color: 'warning' },
  REVIEWED: { label: '已审核', color: 'processing' },
  PUBLISHED: { label: '已通报', color: 'success' },
  CLOSED: { label: '已处理', color: 'default' },
};

export const parentIncidentTypeMap: StatusMap = {
  LATENESS: { label: '迟到', color: 'warning' },
  ABSENT: { label: '旷课', color: 'error' },
  PHONE: { label: '违规使用手机', color: 'warning' },
  HYGIENE: { label: '卫生问题', color: 'default' },
  FIGHT: { label: '冲突', color: 'error' },
  OTHER: { label: '其他', color: 'default' },
};
```

## 5.4 家长端 UI 文案

```text
【学生行为记录】

2026-07-18  15:30
━━━━━━━━━━━━━━━━━━
类型：迟到
地点：教学楼
经过：上午第一节迟到 12 分钟
处理：批评教育
班主任：李老师
━━━━━━━━━━━━━━━━━━
```

## 5.5 冻结声明

> 数据层（Incident / StatusMap）冻结。
> 展示层（家长端）必须使用 `parentIncidentStatusMap` / `parentIncidentTypeMap`。
> 班主任端、政教端**仍使用原 incidentStatusMap**（内部无敏感性顾虑）。

---

# 第六章 补丁 5：工作台设计哲学

> 刘老师："工作台不是统计页，是工作流入口。"

## 6.1 错误的做法（❌ v4.1 禁止）

```text
[班主任工作台]
━━━━━━━━━━━━━━━━━━
学生总数：48
今日请假：2
未读通知：5
本周违纪：1
班级平均分：86
━━━━━━━━━━━━━━━━━━
[查看详情]
```

**问题**：班主任打开后看数据，看完不知道要做什么。

## 6.2 正确的做法（✅ v4.1 规范）

```text
[班主任工作台]   早上 7:20   王老师 - 高一(1)班
━━━━━━━━━━━━━━━━━━
今日待处理（3）
├── 🔴 张三  请假待提交  [去处理]
├── 🟡 李四  离校登记    [去登记]
└── 📢 年级 暑假安全通知  [去阅读]

今日任务（1）
└── ⏳ 完成安全教育统计 截止 7/25  [去完成]

快捷入口
[+ 请假] [+ 离校] [+ 通知] [+ 违纪]
━━━━━━━━━━━━━━━━━━
```

**设计原则**：
- 第一眼是**待办列表**，不是数据
- 数据只作为辅助上下文
- 每一个数字背后必须对应**可点击的操作**

## 6.3 WorkbenchOverview 微调

v4 Overview 中"今日请假：2"这种字段，v4.1 调整为**操作语义**：

```typescript
interface WorkbenchOverview {
  // ... 基础信息
  // 班主任
  class_size: number;                // 班级人数（参考）
  in_school: number;                 // 在校人数（参考）

  // v4.1 强化：待办计数（必填）
  todo_total: number;                // 今日待办总数
  todo_by_priority: {                // 按优先级
    urgent: number;                  // 紧急待办
    high: number;                    // 高优待办
    normal: number;                  // 普通待办
  };

  // 年级主任
  pending_approvals: number;         // 待审批（必填，可点击）

  // 宿管
  dorm_pending_rollcall: number;     // 待查寝（必填，可点击）
}
```

## 6.4 冻结声明

> 工作台第一屏必须是 `WorkbenchTodoList`，**不**是 `WorkbenchOverview`。
> Overview 只作为辅助上下文，不超过 6 个数字。
> 每个数字必须可点击进入对应业务模块。

---

# 第七章 补丁 6：Sprint 2.1 14 天开发顺序

> 刘老师："不要按文档顺序写。按以下顺序：基础数据 → Auth → 工作台 → 演示"

## 7.1 14 天详细分解

| Day | 任务 | 产出 |
|---|---|---|
| **Day 1-3** | 基础数据模型 | |
| Day 1 | School / Grade / Class 实体 | `types/school.ts` `types/grade.ts` `types/class.ts` |
| Day 2 | User / Teacher / Student / Parent 实体 | `types/user.ts` 等 4 个文件 |
| Day 3 | UserIdentity 实体 + 关联关系 | `types/identity.ts` + ER 关系图 |
| **Day 4-6** | Auth 体系 | |
| Day 4 | Auth 三策略抽象（PHONE/WECHAT/ACCOUNT） | `api/auth.ts` + `stores/auth.ts` |
| Day 5 | 登录页 + 角色选择 | `pages/login/` |
| Day 6 | Permission Guard 8 类角色路由保护 | `auth/Permission.tsx` 扩展 |
| **Day 7-10** | 工作台接口（Mock） | |
| Day 7 | WorkbenchOverview 接口 + Mock 数据生成器 | `api/workbench.ts` |
| Day 8 | WorkbenchTodo 接口 + Mock 数据生成器 | `api/workbench.ts` |
| Day 9 | Workbench 联调（含 React Query 缓存） | `pages/workbench/` |
| Day 10 | 性能压测（≤ 500ms）+ 错误兜底 | `__tests__/workbench.test.ts` |
| **Day 11-14** | 小程序工作台 Demo | |
| Day 11 | 小程序工程初始化（Vite + tarojs 或 uni-app） | `miniapp/` 工程 |
| Day 12 | 登录页 + 路由 | `miniapp/pages/login` |
| Day 13 | 工作台首页（7 卡片 + 4 快捷入口） | `miniapp/pages/workbench` |
| Day 14 | 跑通"登录 → 工作台 → 点击待办"完整 Demo | 演示视频 + 文档 |

## 7.2 第 14 天演示标准

必须跑通的最小闭环：

```
1. 打开小程序
2. 登录（手机号 + 验证码 Mock）
3. 进入工作台
4. 看到 3 条待办：
   - 张三 请假待提交
   - 李四 离校登记
   - 年级通知未读
5. 点击"张三 请假待提交"
6. 进入请假登记页（占位页即可）
7. 返回工作台，待办数量 -1
```

## 7.3 Demo 完成后进入 Sprint 2.2

> Demo 跑通后，**才进入 Sprint 2.2 完整工作台** + **Sprint 2.3 学生出入管理**。

## 7.4 质量门

| Day | 验收 |
|---|---|
| Day 3 | TypeScript 0 错误，7 实体类型完整 |
| Day 6 | 8 类角色登录 + 路由守卫全部跑通 |
| Day 10 | 工作台接口 Mock 联调 ≤ 500ms |
| Day 14 | 小程序 Demo 完整跑通 + 录屏 |

---

# 第八章 v4 + v4.1 累计冻结清单

## 8.1 冻结对象（v4）

| 对象 | 数量 | 状态 |
|---|---|---|
| 基础实体 | 7 | 冻结 |
| 角色 | 6+2 | 冻结 |
| 权限点 | 52+9 | 冻结 |
| 请假状态机 | 11 | 冻结 |
| 通知生命周期 | 6 | 冻结 |
| NotificationTarget | 8 类型 | 冻结 |
| WorkbenchOverview | 1 | 冻结 |
| WorkbenchTodo | 1 | 冻结 |
| AuthRequest | 3 策略 | 冻结 |
| 排除项 | 8 | 冻结 |

## 8.2 v4.1 新增冻结

| 对象 | 内容 | 状态 |
|---|---|---|
| **LeaveTimelineEventType** | 13 个值 | **v4.1 冻结** |
| **UserIdentity 实体** | 5 类型 + 8 字段 | **v4.1 冻结** |
| 展示层映射 | `parentIncidentStatusMap` 等 | v4.1 冻结 |
| Sprint 2.1 14 天顺序 | 4 阶段 14 子任务 | v4.1 冻结 |
| 工作台设计哲学 | 入口不是统计 | v4.1 冻结 |

## 8.3 v4.1 调整说明

| 项 | v4 | **v4.1** |
|---|---|---|
| User 表 | 包含 wechat_openid | **移除，移到 UserIdentity** |
| 家长端"违纪" | 显示"违纪记录" | **显示"学生行为记录"** |
| 工作台 | 数据展示 | **工作流入口** |
| 14 天开发顺序 | 未细化 | **Day 1-14 详细** |

---

# 第九章 v4.1 Review 检查表（12 项）

> v4.1 启动编码前最终自检。

## 9.1 数据层补丁

- [ ] **LeaveTimelineEventType** 13 个值已定义
- [ ] **UserIdentity 实体** 字段已定义
- [ ] **User 表 wechat_openid** 已移除
- [ ] 7 实体 + UserIdentity 共 **8 实体** 已确认

## 9.2 业务层补丁

- [ ] 通知解析逻辑（resolveRecipients）已设计
- [ ] 家长端状态映射（parentIncidentStatusMap）已定义
- [ ] 家长端文案（"学生行为记录"）已确定

## 9.3 设计层补丁

- [ ] 工作台第一屏 = WorkbenchTodoList
- [ ] WorkbenchOverview ≤ 6 字段
- [ ] 每个数字可点击进入业务模块

## 9.4 工程层补丁

- [ ] Sprint 2.1 14 天任务已分解
- [ ] Day 14 Demo 标准已确认

---

# 第十章 评审结论

## 10.1 v4 + v4.1 完整冻结

```
v4 冻结：7 实体 / 6+2 角色 / 52+9 权限 / 11 状态 / 6 通知 / 8 排除
v4.1 冻结：LeaveTimeline 13 类型 / UserIdentity 5 类型 / 14 天顺序
```

## 10.2 启动承诺

> **Sprint 2.1 启动后，v4 + v4.1 任何冻结对象不得修改**。
> 新增字段必须经过 Project Rule 修订流程。
> 任何返工成本由责任人承担。

## 10.3 第一闭环

> **班主任登录小程序 → 提交学生请假 → 年级审批 → 离校登记 → 家长收到结果 → 学生返校闭环**。
>
> 这个闭环跑通，整个产品就真正"活"起来了。

---

# 附录 A：变更决策记录

| 版本 | 决策 | 来源 |
|---|---|---|
| v1 | 8 Step / 5 角色 / 31 权限 | 初步规划 |
| v2 | 7 Step / 7 角色 / 46 权限 | 第二轮评审 |
| v3 | 7 Step / 6+2 双层 / 52 权限 / 工作台前置 | 第三轮评审 |
| v4 | 冻结 7 实体 / 11 状态 / NotificationTarget | 第四轮冻结 |
| **v4.1** | **LeaveTimeline / UserIdentity / 14 天顺序** | **工程级补丁** |

---

# 附录 B：术语最终版（v4.1 锁定）

| 术语 | 含义 | 反例 |
|---|---|---|
| **UserIdentity** | 独立的身份凭证表 | ❌ 把微信绑定放 User |
| **LeaveTimeline** | 复用 TimelineEvent 记录请假全过程 | ❌ 单独建表 |
| **学生行为记录** | 家长端展示 | ❌ 家长端显示"违纪" |
| **工作流入口** | 工作台第一屏 = TodoList | ❌ 统计页 Dashboard |
| **第一闭环** | 班主任请假 → 家长收到 → 返校 | ❌ 多模块同时启动 |
| **Day 14 Demo** | 14 天后的最小可演示闭环 | ❌ 14 天后无交付 |

---

**v4 + v4.1 完整冻结。Sprint 2.1 启动编码。**

— End of Sprint 2 Planning v4.1 (Engineering Patch) —
