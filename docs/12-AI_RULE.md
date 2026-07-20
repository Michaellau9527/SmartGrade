# SmartGrade AI 开发规范（AI_RULE）

Version：1.0

Project：SmartGrade

Document Type：

AI Coding Constitution

---

# 第一章 文档目的

本文档用于约束 AI 编程助手在 SmartGrade 项目中的开发行为。

包括：

- Trae
- Cursor
- GitHub Copilot
- 其他 AI Coding Agent

AI 在生成、修改、重构代码前，必须遵守本文档。

---

# 第二章 AI 开发总原则

## 2.1 不自行设计业务

AI 不允许：

- 自行新增业务流程
- 修改业务规则
- 修改审批逻辑
- 改变权限关系

所有业务必须来源：

```
PRD.md

BusinessFlow.md

Database.md

Permission.md

API.md
```

---

## 2.2 不破坏已有设计

AI 修改代码前必须检查：

- 当前模块结构
- 数据模型
- API 定义
- 权限规则
- 页面流程

禁止：

直接重写整个模块。

---

## 2.3 优先复用

新增功能必须优先：

复用已有：

- Components
- Hooks
- Utils
- API
- Types
- Constants

禁止重复创建相同功能。

---

# 第三章 开发流程规范

AI 接收到需求后必须按照：

```
需求输入

↓

阅读 PRD

↓

确认业务流程

↓

确认数据库字段

↓

确认权限

↓

确认 API

↓

设计方案

↓

等待确认

↓

生成代码

↓

测试

↓

提交修改说明
```

---

# 第四章 技术栈约束

## 前端

推荐：

- TypeScript
- React
- Taro
- TailwindCSS

---

## 后端

推荐：

- Node.js
- NestJS
- Prisma

---

## 数据库

PostgreSQL

---

## API

RESTful API

统一：

```
/api/v1/
```

---

# 第五章 文件结构规范

## 前端

```
src

├── pages

├── components

├── hooks

├── api

├── services

├── stores

├── types

├── utils

├── constants

├── assets
```

---

## 后端

```
src

├── modules

├── controllers

├── services

├── guards

├── middleware

├── dto

├── entities

├── utils
```

---

# 第六章 命名规范

## 文件

使用：

kebab-case

例如：

```
leave-record.ts
student-list.tsx
```

---

## React组件

使用：

PascalCase

例如：

```
StudentCard

LeaveTimeline
```

---

## 函数

使用：

camelCase

例如：

```
getStudentList()

createLeaveRecord()
```

---

## 常量

使用：

UPPER_CASE

例如：

```
LEAVE_STATUS

USER_ROLE
```

---

# 第七章 TypeScript 规范

必须：

开启严格模式。

禁止：

```typescript
any
```

除非明确说明原因。

---

必须定义：

interface

type

enum

例如：

禁止：

```typescript
status:string
```

推荐：

```typescript
status:LeaveStatus
```

---

# 第八章 数据库规范

AI 禁止：

直接修改 Database.md 中的数据结构。

禁止：

新增字段。

删除字段。

修改字段名称。

---

如需修改：

必须：

1. 提出原因。
2. 更新 Database.md。
3. 更新 API.md。
4. 更新相关页面。

---

# 第九章 API规范

所有接口：

必须：

```
/api/v1/
```

格式。

---

响应统一：

```json
{
"code":0,
"message":"success",
"data":{}
}
```

---

禁止：

不同模块返回不同格式。

---

# 第十章 权限规范

所有功能必须检查：

Permission.md

---

禁止：

前端隐藏按钮代替权限控制。

必须：

前端控制展示。

后端再次验证。

---

例如：

班主任发起请假：

前端：

隐藏按钮。

后端：

验证 ROLE_HEADMASTER。

---

# 第十一章 页面开发规范

新增页面必须包含：

- 页面编号
- 页面名称
- 对应PRD
- 对应API
- 对应权限

---

禁止：

未经确认新增页面。

---

页面状态必须包含：

Loading

Empty

Error

Success

No Permission

---

# 第十二章 组件规范

公共组件必须放：

```
components/
```

例如：

Button

Card

Modal

Table

Timeline

Search

---

禁止：

多个页面重复编写相同组件。

---

# 第十三章 SmartGrade 核心业务规则

AI 永久遵守：

---

## 学生状态

只有：

```
IN_SCHOOL

PENDING_LEAVE

LEFT_SCHOOL
```

---

## 请假流程

必须：

班主任申请

↓

政教审批

↓

住宿生通知宿管

↓

离校

↓

班主任销假

---

## 时间轴

所有关键事件必须写入：

Timeline

禁止删除。

禁止修改。

---

## 宿舍异常

宿管发现：

学生不在寝室

且：

无请假记录

必须生成：

Incident

---

# 第十四章 UI规范

统一：

简洁

清晰

高效

适合教师使用。

---

禁止：

复杂动画。

禁止：

过度装饰。

禁止：

影响操作效率的大型视觉元素。

---

优先：

卡片

列表

搜索

筛选

状态标签。

---

# 第十五章 代码质量要求

生成代码必须：

- 可读
- 可维护
- 有注释
- 无重复
- 无明显Bug

---

禁止：

console.log

未使用变量

死代码

重复代码

硬编码业务数据。

---

# 第十六章 测试要求

新增功能必须考虑：

正常流程。

异常流程。

权限错误。

空数据。

网络失败。

---

关键业务必须测试：

请假。

审批。

销假。

通知。

文件。

异常。

---

# 第十七章 修改代码规则

修改已有代码：

必须说明：

修改原因。

影响范围。

是否影响：

数据库。

API。

权限。

页面。

---

禁止：

为了实现一个功能大范围重构。

---

# 第十八章 AI 输出规范

AI 回复开发任务时必须包含：

## 修改内容

说明修改了什么。

---

## 修改文件

列出文件路径。

---

## 数据影响

说明是否影响数据库。

---

## API影响

说明是否新增接口。

---

## 测试建议

说明如何验证。

---

# 第十九章 禁止事项

AI 不得：

❌ 删除已有功能

❌ 修改业务规则

❌ 修改数据库结构

❌ 绕过权限

❌ 创建重复组件

❌ 引入未经确认的大型依赖

❌ 使用临时代码替代正式实现

---

# 第二十章 SmartGrade 开发优先级

所有开发遵循：

稳定性

>

正确性

>

可维护性

>

性能

>

视觉效果

---

# 第二十一章 AI 自检清单

每次提交代码前：

□ 是否符合PRD？

□ 是否符合BusinessFlow？

□ 是否符合Database？

□ 是否符合Permission？

□ 是否符合API？

□ 是否影响已有功能？

□ 是否需要更新文档？

□ 是否包含测试方案？

---

# End

SmartGrade AI Coding Constitution