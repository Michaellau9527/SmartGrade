# SmartGrade API 设计（API Design）

Version：1.0

API Style：

RESTful API

Data Format：

JSON

Character Encoding：

UTF-8

---

# 第一章 API 设计规范

## 请求格式

GET

POST

PUT

DELETE

PATCH

统一采用 HTTPS。

---

## 响应格式

成功：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": 40001,
  "message": "Permission Denied",
  "data": null
}
```

---

# 第二章 通用规则

## 分页参数

page：页码

pageSize：每页数量

---

## 时间格式

YYYY-MM-DD HH:mm:ss

时区：Asia/Shanghai

---

## 认证方式

Header：Authorization: Bearer {token}

---

# 第三章 身份认证

## 登录

POST /api/v1/auth/login

请求：

```json
{
  "code": "微信code"
}
```

返回：

Teacher

Role

Permission

Menu

Token

RefreshToken

---

## 刷新 Token

POST /api/v1/auth/refresh

---

## 退出登录

POST /api/v1/auth/logout

---

# 第四章 教师接口

## 获取教师列表

GET /api/v1/teachers

参数：

page

pageSize

keyword

roleId

tagId

status

---

## 获取教师详情

GET /api/v1/teachers/{id}

---

## 新增教师

POST /api/v1/teachers

---

## 修改教师

PUT /api/v1/teachers/{id}

---

## 删除教师

DELETE /api/v1/teachers/{id}

---

## 分配角色

POST /api/v1/teachers/{id}/roles

---

## 分配标签

POST /api/v1/teachers/{id}/tags

---

# 第五章 学生接口

## 获取学生列表

GET /api/v1/students

参数：

page

pageSize

keyword

classId

status

boardingType

---

## 获取学生详情

GET /api/v1/students/{id}

---

## 新增学生

POST /api/v1/students

---

## 修改学生

PUT /api/v1/students/{id}

---

## 删除学生

DELETE /api/v1/students/{id}

---

## 查看学生时间轴

GET /api/v1/students/{id}/timeline

---

## 设置住宿信息

POST /api/v1/students/{id}/dormitory

---

# 第六章 请销假接口

## 发起请假

POST /api/v1/leaves

权限：班主任

请求：

```json
{
  "studentId": 1,
  "leaveType": "LEAVE_SCHOOL",
  "reason": "病假"
}
```

---

## 获取请假列表

GET /api/v1/leaves

参数：

page

pageSize

status

studentId

classId

date

---

## 获取请假详情

GET /api/v1/leaves/{id}

---

## 审批请假

POST /api/v1/leaves/{id}/approve

权限：政教

---

## 拒绝请假

POST /api/v1/leaves/{id}/reject

权限：政教

---

## 确认离校

POST /api/v1/leaves/{id}/confirm-left

---

## 销假

POST /api/v1/leaves/{id}/finish

权限：班主任

---

## 获取今日请假

GET /api/v1/leaves/today

---

## 查询历史请假

GET /api/v1/leaves/history

---

# 第七章 通知接口

## 获取通知列表

GET /api/v1/notices

---

## 获取通知详情

GET /api/v1/notices/{id}

---

## 发布通知

POST /api/v1/notices

---

## 修改通知

PUT /api/v1/notices/{id}

---

## 删除通知

DELETE /api/v1/notices/{id}

---

## 撤回通知

POST /api/v1/notices/{id}/withdraw

---

## 确认阅读

POST /api/v1/notices/{id}/confirm

---

## 获取未读通知

GET /api/v1/notices/unread

---

## 获取阅读情况

GET /api/v1/notices/{id}/reads

---

# 第八章 文件接口

## 获取文件列表

GET /api/v1/documents

---

## 获取文件详情

GET /api/v1/documents/{id}

---

## 上传文件

POST /api/v1/documents

---

## 修改文件

PUT /api/v1/documents/{id}

---

## 删除文件

DELETE /api/v1/documents/{id}

---

## 下载文件

GET /api/v1/documents/{id}/download

---

## 确认阅读

POST /api/v1/documents/{id}/confirm

---

## 获取阅读情况

GET /api/v1/documents/{id}/reads

---

# 第九章 待办接口

## 获取待办列表

GET /api/v1/todos

参数：

page

pageSize

status

type

---

## 获取待办详情

GET /api/v1/todos/{id}

---

## 完成待办

POST /api/v1/todos/{id}/complete

---

## 批量完成待办

POST /api/v1/todos/batch-complete

---

## 获取待办统计

GET /api/v1/todos/statistics

---

# 第十章 时间轴接口

## 获取学生时间轴

GET /api/v1/timelines

参数：

studentId

teacherId

eventType

startDate

endDate

page

pageSize

---

## 获取时间轴详情

GET /api/v1/timelines/{id}

---

## 获取时间轴统计

GET /api/v1/timelines/statistics

---

# 第十一章 异常事件接口

## 获取异常列表

GET /api/v1/incidents

参数：

page

pageSize

status

type

studentId

---

## 获取异常详情

GET /api/v1/incidents/{id}

---

## 上报异常

POST /api/v1/incidents

---

## 处理异常

POST /api/v1/incidents/{id}/handle

---

## 关闭异常

POST /api/v1/incidents/{id}/close

---

# 第十二章 数据统计接口

## 获取概览统计

GET /api/v1/statistics/overview

---

## 获取请假统计

GET /api/v1/statistics/leaves

参数：

type（today/week/month）

classId

gradeId

---

## 获取班级统计

GET /api/v1/statistics/classes

---

## 获取宿舍统计

GET /api/v1/statistics/dormitories

---

## 获取教师统计

GET /api/v1/statistics/teachers

---

## 获取通知阅读率

GET /api/v1/statistics/notice-rate

---

## 获取文件阅读率

GET /api/v1/statistics/document-rate

---

# 第十三章 系统配置接口

## 获取系统配置

GET /api/v1/configs

---

## 修改系统配置

PUT /api/v1/configs

---

## 获取角色列表

GET /api/v1/roles

---

## 新增角色

POST /api/v1/roles

---

## 修改角色

PUT /api/v1/roles/{id}

---

## 删除角色

DELETE /api/v1/roles/{id}

---

## 获取标签列表

GET /api/v1/tags

---

## 新增标签

POST /api/v1/tags

---

## 修改标签

PUT /api/v1/tags/{id}

---

## 删除标签

DELETE /api/v1/tags/{id}

---

# 第十四章 全局搜索接口

## 全局搜索

GET /api/v1/search

参数：

keyword

type（teacher/student/leave/notice/document/incident/timeline/log）

page

pageSize

---

## 搜索建议

GET /api/v1/search/suggest

参数：

keyword

---

# 第十五章 错误码

## 通用错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40001 | 权限不足 |
| 40002 | Token 无效 |
| 40003 | Token 过期 |
| 40004 | 参数错误 |
| 40005 | 资源不存在 |
| 40006 | 资源已存在 |
| 40007 | 操作失败 |
| 40008 | 业务规则冲突 |

---

## 业务错误码

| 错误码 | 说明 |
|--------|------|
| 50001 | 学生已存在未完成请假 |
| 50002 | 学生状态不允许此操作 |
| 50003 | 请假已审批 |
| 50004 | 请假已销假 |
| 50005 | 非住宿生无宿舍信息 |
| 50006 | 宿舍床位已满 |
| 50007 | 通知已撤回 |
| 50008 | 文件不存在 |

---

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |