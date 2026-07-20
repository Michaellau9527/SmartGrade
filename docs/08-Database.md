# SmartGrade 数据库设计（Database Design）

Version：1.0

Project：SmartGrade

Document Status：Draft

---

# 第一章 数据库设计原则

## 1.1 文档目的

本文档用于定义 SmartGrade 系统的数据模型。

数据库设计是系统开发的核心依据。

所有接口、页面、权限及业务逻辑均应基于本数据库设计。

---

## 1.2 设计原则

SmartGrade 数据库遵循以下原则：

### ① 数据唯一

每一类业务数据只保存一份。

避免重复存储。

---

### ② 数据一致

任何业务操作必须保证事务一致性。

禁止产生：

- 重复数据
- 半完成数据
- 状态冲突

---

### ③ 可扩展

支持：

- 新角色
- 新标签
- 新通知类型
- 新审批流程

无需修改已有表结构。

---

### ④ 永久留痕

以下数据永久保存：

- 请假
- 审批
- 通知
- 文件
- 时间轴
- 日志

禁止物理删除。

采用逻辑删除。

---

### ⑤ 高内聚

一个数据表只负责一类业务。

例如：

Student

只负责学生信息。

LeaveRecord

只负责请假。

Timeline

只负责事件。

---

### ⑥ 松耦合

所有业务采用外键关联。

避免重复字段。

---

# 第二章 命名规范

## 2.1 表命名

统一采用：

PascalCase

例如：

Teacher

Student

LeaveRecord

Timeline

NoticeRead

TeacherRole

禁止：

tb_student

student_info

tbl_teacher

---

## 2.2 字段命名

统一采用：

snake_case

例如：

student_id

teacher_id

leave_status

created_at

updated_at

deleted_at

禁止：

studentName

StudentName

student-name

---

## 2.3 主键

统一：

id

类型：

BIGINT

自增。

---

## 2.4 外键

统一：

xxx_id

例如：

student_id

teacher_id

class_id

role_id

notice_id

---

## 2.5 时间字段

统一：

created_at

updated_at

deleted_at

approved_at

left_at

---

# 第三章 数据类型规范

| 类型 | 用途 |
|------|------|
| BIGINT | 主键 |
| VARCHAR | 字符串 |
| TEXT | 正文 |
| BOOLEAN | 布尔 |
| INT | 统计 |
| DATETIME | 时间 |
| JSON | 扩展信息 |

---

字符串统一：

UTF8MB4

---

# 第四章 枚举（Enum）

## StudentStatus

```text
IN_SCHOOL

PENDING_LEAVE

LEFT_SCHOOL
```

---

## BoardingType

```text
DAY

BOARDING
```

---

## LeaveStatus

```text
PENDING

APPROVED

REJECTED

FINISHED
```

---

## Gender

```text
MALE

FEMALE
```

---

## TodoStatus

```text
TODO

DONE
```

---

## NoticeType

```text
ALL

ROLE

TAG

ORGANIZATION
```

---

## TimelineType

```text
LEAVE

APPROVAL

LEFT

RETURN

NOTICE

FILE

ABNORMAL
```

---

# 第五章 ER关系（概览）

Teacher

↓

TeacherRole

↓

Role

↓

Permission

------------------------

Teacher

↓

Class

↓

Student

↓

LeaveRecord

↓

Timeline

------------------------

Student

↓

DormRoom

↓

Dormitory

------------------------

Notice

↓

NoticeRead

------------------------

Document

↓

DocumentRead

------------------------

Todo

↓

Teacher

---

# 第六章 数据字典（Data Dictionary）

> 本章定义 SmartGrade V1.0 的核心数据模型。
>
> 所有数据表统一包含以下公共字段：
>
> - id：主键
> - created_at：创建时间
> - updated_at：更新时间
> - deleted_at：逻辑删除时间（为空表示未删除）

---

# DB-001 Teacher（教师表）

## 表说明

存储教师基础信息。

一个教师可拥有多个角色、多个标签。

---

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | √ | 主键 |
| teacher_no | VARCHAR(20) | √ | 教师工号 |
| name | VARCHAR(50) | √ | 姓名 |
| gender | VARCHAR(10) | √ | 性别 |
| phone | VARCHAR(20) | | 手机号 |
| email | VARCHAR(100) | | 邮箱 |
| wechat_openid | VARCHAR(100) | | 微信OpenID |
| avatar | VARCHAR(255) | | 头像 |
| department | VARCHAR(100) | | 所属部门 |
| position | VARCHAR(100) | | 职务 |
| status | BOOLEAN | √ | 是否启用 |
| created_at | DATETIME | √ | 创建时间 |
| updated_at | DATETIME | √ | 更新时间 |
| deleted_at | DATETIME | | 逻辑删除 |

---

## 关联关系

Teacher

↓

TeacherRole

↓

Role

Teacher

↓

TeacherTag

↓

Tag

Teacher

↓

Class（班主任）

---

# DB-002 Role（角色表）

## 表说明

定义教师角色。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| role_code | VARCHAR(50) | 角色编码 |
| role_name | VARCHAR(50) | 角色名称 |
| description | TEXT | 角色说明 |

---

示例：

ROLE_HEADMASTER（班主任）

ROLE_GRADE_DIRECTOR（年级主任）

ROLE_POLITICAL（政教）

ROLE_DORM_MANAGER（宿管）

ROLE_TEACHER（普通教师）

ROLE_ADMIN（系统管理员）

---

# DB-003 TeacherRole（教师角色关联表）

## 表说明

实现教师与角色的多对多关系。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| teacher_id | BIGINT | 教师ID |
| role_id | BIGINT | 角色ID |

---

例如：

刘老师

↓

班主任

↓

年级主任

↓

党员教师

（角色与标签分开管理）

---

# DB-004 Tag（教师标签表）

## 表说明

教师标签仅用于通知精准推送。

不参与权限控制。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| tag_code | VARCHAR(50) | 标签编码 |
| tag_name | VARCHAR(50) | 标签名称 |
| description | TEXT | 说明 |

---

例如：

党员教师

青年教师

英语组

高一年级

骨干教师

---

# DB-005 TeacherTag（教师标签关联表）

## 表说明

教师可拥有多个标签。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| teacher_id | BIGINT | 教师ID |
| tag_id | BIGINT | 标签ID |

---

# DB-006 Grade（年级表）

## 表说明

定义学校年级。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| grade_name | VARCHAR(50) | 年级名称 |
| grade_code | VARCHAR(20) | 年级编码 |
| director_teacher_id | BIGINT | 年级主任 |

---

例如：

高一年级

高二年级

高三年级

---

# DB-007 Class（班级表）

## 表说明

班级信息。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| grade_id | BIGINT | 所属年级 |
| class_name | VARCHAR(20) | 班级名称 |
| head_teacher_id | BIGINT | 班主任 |
| student_count | INT | 学生人数 |

---

例如：

高一（11）班

↓

班主任：

刘忠昊

---

# DB-008 Student（学生表）

## 表说明

学生基础信息。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| student_no | VARCHAR(30) | 学号 |
| name | VARCHAR(50) | 姓名 |
| gender | VARCHAR(10) | 性别 |
| class_id | BIGINT | 班级 |
| boarding_type | VARCHAR(20) | 住宿属性 |
| dorm_room_id | BIGINT | 宿舍房间 |
| bed_no | VARCHAR(20) | 床位 |
| status | VARCHAR(30) | 当前状态 |
| phone | VARCHAR(20) | 联系电话 |
| parent_name | VARCHAR(50) | 家长 |
| parent_phone | VARCHAR(20) | 家长电话 |

---

状态：

IN_SCHOOL

PENDING_LEAVE

LEFT_SCHOOL

---

# DB-009 Dormitory（宿舍楼）

## 表说明

宿舍楼。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| building_name | VARCHAR(50) | 宿舍楼 |
| gender | VARCHAR(20) | 男生/女生 |

---

例如：

一号楼

二号楼

女生楼

---

# DB-010 DormRoom（宿舍房间）

## 表说明

宿舍房间。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| building_id | BIGINT | 宿舍楼 |
| room_no | VARCHAR(20) | 房间号 |
| floor_no | INT | 楼层 |
| capacity | INT | 床位数量 |

---

# DB-011 LeaveRecord（请假记录表）

## 表说明

记录学生每一次完整的请假业务。

每一次请假对应一条 LeaveRecord。

所有状态变化均记录在 Timeline 中。

请假记录永久保存，不允许物理删除。

---

## 主键

id（BIGINT）

---

## 字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | √ | 主键 |
| leave_no | VARCHAR(30) | √ | 请假单号（唯一） |
| student_id | BIGINT | √ | 学生ID |
| student_name | VARCHAR(50) | √ | 学生姓名（冗余） |
| class_id | BIGINT | √ | 班级ID |
| class_name | VARCHAR(50) | √ | 班级名称（冗余） |
| boarding_type | VARCHAR(20) | √ | 住宿类型 |
| dorm_room_id | BIGINT | | 宿舍房间 |
| bed_no | VARCHAR(20) | | 床位 |
| leave_type | VARCHAR(30) | √ | 请假类型 |
| leave_reason | TEXT | √ | 请假原因 |
| remark | TEXT | | 备注 |
| status | VARCHAR(30) | √ | 当前状态 |
| current_node | VARCHAR(30) | √ | 当前流程节点 |
| apply_teacher_id | BIGINT | √ | 申请教师 |
| apply_teacher_name | VARCHAR(50) | √ | 申请教师姓名 |
| approve_teacher_id | BIGINT | | 审批教师 |
| approve_teacher_name | VARCHAR(50) | | 审批教师姓名 |
| approve_remark | TEXT | | 审批意见 |
| approved_at | DATETIME | | 审批时间 |
| left_at | DATETIME | | 离校时间 |
| return_at | DATETIME | | 销假时间 |
| finished_at | DATETIME | | 流程结束时间 |
| cancel_reason | TEXT | | 撤销原因 |
| is_boarding_notice | BOOLEAN | √ | 是否通知宿管 |
| timeline_count | INT | √ | 时间轴事件数 |
| created_at | DATETIME | √ | 创建时间 |
| updated_at | DATETIME | √ | 更新时间 |
| deleted_at | DATETIME | | 逻辑删除 |

---

## LeaveStatus（状态）

PENDING

等待审批

↓

APPROVED

审批通过（待离校）

↓

LEFT

已离校

↓

FINISHED

已销假（完成）

另外：

REJECTED（审批拒绝）

CANCELLED（撤销）

---

## LeaveType（请假类型）

LEAVE_SCHOOL

离校请假

RETURN_DORM

回寝请假（仅宿舍）

OTHER

其它

---

## CurrentNode（流程节点）

APPLY

APPROVAL

WAIT_LEAVE

LEFT

RETURN

FINISHED

---

## 数据关系

Student

↓

LeaveRecord（1:N）

Teacher

↓

LeaveRecord（申请）

Teacher

↓

LeaveRecord（审批）

LeaveRecord

↓

Timeline（1:N）

---

## 索引建议

UK_leave_no

IDX_student

IDX_status

IDX_class

IDX_created_at

IDX_apply_teacher

---

# DB-012 Timeline（学生时间轴）

## 表说明

Timeline 是 SmartGrade 的核心业务日志。

记录学生所有重要事件。

采用 Event Sourcing 思想。

任何业务均新增记录。

禁止修改。

禁止删除。

永久保存。

---

## 主键

id（BIGINT）

---

## 字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | √ | 主键 |
| timeline_no | VARCHAR(30) | √ | 事件编号 |
| student_id | BIGINT | √ | 学生ID |
| leave_record_id | BIGINT | | 关联请假 |
| event_type | VARCHAR(40) | √ | 事件类型 |
| event_title | VARCHAR(100) | √ | 事件标题 |
| event_description | TEXT | | 事件详情 |
| operator_teacher_id | BIGINT | | 操作教师 |
| operator_teacher_name | VARCHAR(50) | | 操作人 |
| operator_role | VARCHAR(50) | | 操作角色 |
| target_role | VARCHAR(50) | | 目标角色 |
| before_status | VARCHAR(30) | | 变更前状态 |
| after_status | VARCHAR(30) | | 变更后状态 |
| event_source | VARCHAR(30) | √ | 来源 |
| source_id | BIGINT | | 来源ID |
| is_system | BOOLEAN | √ | 系统自动 |
| latitude | DECIMAL(10,6) | | 预留定位 |
| longitude | DECIMAL(10,6) | | 预留定位 |
| device | VARCHAR(50) | | 设备 |
| ip_address | VARCHAR(50) | | IP |
| remark | TEXT | | 备注 |
| created_at | DATETIME | √ | 发生时间 |

---

## EventType（事件类型）

LEAVE_APPLY

发起请假

LEAVE_APPROVED

审批通过

LEAVE_REJECTED

审批拒绝

LEAVE_CANCELLED

撤销请假

LEFT_SCHOOL

离校

RETURN_SCHOOL

返校

CHECKOUT_DORM

进入宿舍

CHECKIN_DORM

离开宿舍

DORM_EXCEPTION

宿舍异常

NOTICE_PUSH

通知推送

TODO_CREATED

待办生成

SYSTEM

系统事件

---

## EventSource

SYSTEM

TEACHER

ADMIN

DORM

NOTICE

API

---

## Timeline 展示示例

09:02

班主任 刘忠昊

发起请假

——————————

09:04

政教 张老师

审批通过

——————————

09:08

系统

通知宿管

——————————

09:20

学生

离校

——————————

18:35

班主任

销假

---

## 数据关系

Student

↓

Timeline

LeaveRecord

↓

Timeline

Teacher

↓

Timeline

Notice

↓

Timeline（可选）

Todo

↓

Timeline（可选）

---

## 索引建议

IDX_student

IDX_leave_record

IDX_created_at

IDX_event_type

IDX_operator

---

# DB-013 Notice（通知表）

## 表说明

用于存储系统通知。

支持：

- 全体教师
- 指定角色
- 指定标签
- 指定组织

通知发布后不可修改内容，仅允许撤回。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| notice_no | VARCHAR(30) | 通知编号 |
| title | VARCHAR(200) | 通知标题 |
| content | TEXT | 通知正文 |
| notice_type | VARCHAR(30) | 发送类型 |
| publisher_teacher_id | BIGINT | 发布人 |
| publisher_name | VARCHAR(50) | 发布人姓名 |
| publish_scope | JSON | 发送范围 |
| priority | VARCHAR(20) | 优先级 |
| need_confirm | BOOLEAN | 是否阅读确认 |
| status | VARCHAR(20) | 状态 |
| publish_at | DATETIME | 发布时间 |
| expired_at | DATETIME | 截止时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

# DB-016 DocumentRead（文件阅读表）

## 表说明

记录文件阅读及下载情况。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| document_id | BIGINT | 文件ID |
| teacher_id | BIGINT | 教师ID |
| is_read | BOOLEAN | 是否阅读 |
| is_download | BOOLEAN | 是否下载 |
| read_at | DATETIME | 阅读时间 |
| download_at | DATETIME | 下载时间 |

---

## 唯一索引

document_id + teacher_id

---

# DB-017 Todo（待办中心）

## 表说明

整个 SmartGrade 的任务中心。

所有需要教师处理的事项均生成 Todo。

例如：

请假审批

阅读通知

阅读文件

异常处理

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| todo_no | VARCHAR(30) | 待办编号 |
| title | VARCHAR(200) | 标题 |
| content | TEXT | 内容 |
| teacher_id | BIGINT | 接收教师 |
| business_type | VARCHAR(30) | 业务类型 |
| business_id | BIGINT | 业务ID |
| priority | VARCHAR(20) | 优先级 |
| status | VARCHAR(20) | 状态 |
| deadline | DATETIME | 截止时间 |
| finished_at | DATETIME | 完成时间 |
| created_at | DATETIME | 创建时间 |

---

## TodoStatus

TODO

PROCESSING

DONE

CANCELLED

---

# DB-018 Incident（异常事件表）

## 表说明

记录学校异常事件。

例如：

查寝异常

学生违纪

宿舍异常

夜不归宿

突发事件

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| incident_no | VARCHAR(30) | 事件编号 |
| student_id | BIGINT | 学生 |
| report_teacher_id | BIGINT | 上报教师 |
| incident_type | VARCHAR(30) | 事件类型 |
| description | TEXT | 事件说明 |
| status | VARCHAR(20) | 处理状态 |
| handler_teacher_id | BIGINT | 处理人 |
| handled_at | DATETIME | 处理时间 |
| created_at | DATETIME | 创建时间 |

---

## IncidentStatus

PENDING

PROCESSING

FINISHED

CLOSED

---

# DB-019 OperationLog（操作日志）

## 表说明

系统审计日志。

所有关键操作必须记录。

禁止修改。

永久保存。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| teacher_id | BIGINT | 操作人 |
| module | VARCHAR(50) | 模块 |
| operation | VARCHAR(100) | 操作 |
| business_type | VARCHAR(30) | 业务 |
| business_id | BIGINT | 业务ID |
| request_url | VARCHAR(255) | 接口 |
| request_method | VARCHAR(20) | 请求方式 |
| ip_address | VARCHAR(50) | IP |
| device | VARCHAR(100) | 设备 |
| result | VARCHAR(20) | 结果 |
| created_at | DATETIME | 操作时间 |

---

# DB-020 SystemConfig（系统配置）

## 表说明

系统参数配置。

所有可配置项统一管理。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| config_key | VARCHAR(100) | 配置键 |
| config_value | TEXT | 配置值 |
| config_group | VARCHAR(50) | 配置分组 |
| description | TEXT | 说明 |
| editable | BOOLEAN | 是否允许后台修改 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

# 第七章 数据表统计

| 分类 | 表数量 |
|------|------:|
| 教师管理 | 5 |
| 学生管理 | 1 |
| 组织架构 | 2 |
| 宿舍管理 | 2 |
| 请假管理 | 2 |
| 时间轴 | 1 |
| 通知管理 | 2 |
| 文件管理 | 2 |
| 待办中心 | 1 |
| 异常管理 | 1 |
| 系统日志 | 1 |
| 系统配置 | 1 |
| **合计** | **20** |

---

# 修订记录

| Version | Date | Description |
|---------|----------|----------------|
| 1.0 | 2026-07-15 | 首次建立数据库设计文档 |

## NoticeType

ALL

ROLE

TAG

ORGANIZATION

---

## Priority

LOW

NORMAL

HIGH

URGENT

---

# DB-014 NoticeRead（通知阅读表）

## 表说明

记录每位教师的通知阅读情况。

一个教师对应一条阅读记录。

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| notice_id | BIGINT | 通知ID |
| teacher_id | BIGINT | 教师ID |
| is_read | BOOLEAN | 是否阅读 |
| read_at | DATETIME | 阅读时间 |
| confirm_at | DATETIME | 确认时间 |
| created_at | DATETIME | 创建时间 |

---

## 唯一索引

notice_id + teacher_id

---

# DB-015 Document（文件表）

## 表说明

用于存储学校下发文件。

支持：

PDF

Word

Excel

图片

视频（预留）

---

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| document_no | VARCHAR(30) | 文件编号 |
| title | VARCHAR(200) | 标题 |
| description | TEXT | 说明 |
| file_name | VARCHAR(255) | 文件名 |
| file_url | VARCHAR(500) | 存储地址 |
| file_size | BIGINT | 大小(Byte) |
| file_type | VARCHAR(30) | 类型 |
| publisher_teacher_id | BIGINT | 发布人 |
| need_confirm | BOOLEAN | 阅读确认 |
| publish_scope | JSON | 发送范围 |
| download_count | INT | 下载次数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---