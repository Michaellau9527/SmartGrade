# SmartGrade 领域术语规范（Glossary）

> Version：1.0.0
>
> Project：SmartGrade 智慧年级管理平台
>
> Status：正式生效
>
> Priority：★★★★★

---

# 文档目的

本文档用于统一整个 SmartGrade 项目的专业术语。

所有文档、数据库、接口、页面、代码及 AI 开发必须使用本文档规定的名称。

不得出现多个名称表示同一个概念。

例如：

正确：

Timeline

错误：

History

Record

Event History

---

# 一、组织（Organization）

## 学校（School）

系统所属学校。

例如：

辽东湾实验高级中学

---

## 年级（Grade）

例如：

高一年级

高二年级

高三年级

---

## 班级（Class）

例如：

高一11班

高一12班

---

## 教研组（Teaching Group）

例如：

英语组

数学组

---

# 二、人员（People）

## 教师（Teacher）

所有教职工统一称：

Teacher

包括：

- 班主任
- 任课教师
- 年级主任
- 政教教师
- 宿舍管理员
- 管理员

---

## 学生（Student）

学生统一称：

Student

不得出现：

Pupil

Children

Learner

---

# 三、角色（Role）

Role 表示：

一个教师拥有的职责。

例如：

| 角色 | 英文 |
|------|------|
| 系统管理员 | System Administrator |
| 年级主任 | Grade Director |
| 政教教师 | Discipline Teacher |
| 班主任 | Head Teacher |
| 宿舍管理员 | Dormitory Manager |
| 普通教师 | Teacher |

一个教师允许拥有多个 Role。

---

# 四、组织标签（Tag）

Tag：

用于消息推送、权限辅助和人员分类。

例如：

党员

英语组

青年教师

骨干教师

值班教师

Tag 不是角色。

Tag 不决定权限。

---

# 五、学生状态（Student Status）

Student Status：

学生当前状态。

整个系统任何页面必须统一。

当前定义：

| 状态 | 枚举 | 说明 |
|------|------|------|
| 🟢 在校 | IN_SCHOOL | 正常在校 |
| 🟡 已批准待离校 | PENDING_LEAVE | 等待离校 |
| 🟠 已离校 | LEFT_SCHOOL | 已离校 |

一个学生任何时刻只能拥有一个状态。

---

# 六、请假（Leave）

Leave：

学生离校申请。

包括：

病假

事假

其它请假

请假统一使用：

Leave

不得：

Vacation

Holiday

Off

---

## 发起请假

Leave Application

---

## 审批

Approval

---

## 销假

Leave Closure

说明：

学生返校后，

由班主任完成销假。

不得：

Delete Leave

Cancel Leave

---

# 七、宿舍（Dormitory）

宿舍统一使用：

Dormitory

---

## 宿舍楼

Dormitory Building

---

## 房间

Room

---

## 床位

Bed

---

## 住宿属性

Boarding Type

枚举：

BOARDING

DAY_STUDENT

---

# 八、通知（Notice）

Notice：

普通通知。

例如：

会议通知。

放假通知。

教研通知。

Notice：

无需处理。

---

# 九、待办（Todo）

Todo：

需要完成的事项。

例如：

审批。

阅读确认。

文件确认。

Todo：

必须完成。

不得与 Notice 混用。

---

# 十、文件（Document）

Document：

系统文件。

例如：

PDF

Word

Excel

图片

统一使用：

Document

---

# 十一、时间轴（Timeline）

Timeline：

学生历史事件。

包括：

请假。

审批。

销假。

异常。

通知。

Timeline：

整个系统唯一历史来源。

不得：

History

Event Log

History Record

---

# 十二、异常（Incident）

Incident：

异常事件。

例如：

宿舍异常。

晚归。

未请假离寝。

纪律事件。

统一：

Incident

不得：

Error

Problem

Issue

---

# 十三、消息（Message）

Message：

系统消息。

例如：

审批提醒。

异常提醒。

系统通知。

消息。

不等于：

Notice。

---

# 十四、附件（Attachment）

Attachment：

图片。

PDF。

Word。

Excel。

统一：

Attachment

---

# 十五、工作台（Workbench）

教师首页。

统一：

Workbench

不得：

Home

Dashboard

Portal

---

# 十六、权限（Permission）

Permission：

权限。

统一：

Permission

---

# 十七、组织（Organization）

Organization：

学校组织结构。

例如：

学校

↓

年级

↓

班级

Organization：

用于权限。

不是：

Role。

---

# 十八、时间

所有时间统一：

Asia/Shanghai

24 小时制。

格式：

YYYY-MM-DD HH:mm:ss

例如：

2026-07-15 09:15:30

---

# 十九、唯一编号（ID）

系统所有业务数据必须拥有唯一编号。

例如：

Student ID

Teacher ID

Leave ID

Timeline ID

Notice ID

Document ID

不得：

使用姓名作为主键。

---

# 二十、命名规范

数据库：

snake_case

例如：

student_id

leave_status

Frontend：

camelCase

例如：

studentName

leaveStatus

Class：

PascalCase

例如：

StudentService

LeaveController

---

# 禁止术语

以下名称禁止使用：

History

Record

Log（代替 Timeline）

Vacation（代替 Leave）

Delete Leave

Cancel Leave

Pupil

Home（代替 Workbench）

Issue（代替 Incident）

Dashboard（代替 Workbench）

---

# 本项目统一语言

业务术语：

中文。

数据库：

英文。

API：

英文。

代码：

英文。

页面：

中文。

---

# 修订记录

| Version | Date | Description |
|---------|----------|----------------|
| 1.0.0 | 2026-07-15 | 首次建立领域术语规范 |
