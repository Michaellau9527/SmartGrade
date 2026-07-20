# Campus Admin System — v1.0.0-rc1

> SmartGrade 智慧年级管理平台 / 管理后台
> Release Candidate 1 / Sprint 1 收官版本

**Release Date**: 2026-07-18
**Branch**: `main` (post Sprint 1)
**Status**: ✅ Release Candidate (工程化基线版本)

---

## 1. 版本说明

本版本是 SmartGrade Admin 第一个正式 Release Candidate。

它具备生产级前端项目的工程化基础（TypeScript / ESLint / Vite Build / Design Token / RBAC），并完成了 5 个核心业务模块（Dashboard / Todo / Notice / Leave / Student）的功能开发与系统化验收。**不包含真实后端联调**（依赖 MSW Mock）。

**后续规划**：
- 完成登录/认证接入后，发布 `v1.0.0` 正式版
- Sprint 2 起逐步扩展班级、教师、成绩、宿舍等模块

---

## 2. 交付物清单（Deliverables）

| 分类 | 数量 | 说明 |
|---|---|---|
| **业务页面（Pages）** | 5 | Dashboard / Todo / Notice / Leave / Student |
| **通用组件（Components）** | 9 | PageHeader / FilterBar / ProTable / StatusTag / PermissionButton / LoadingPage / EmptyPage / ErrorPage / ErrorBoundary |
| **API 模块** | 6 | dashboard / leave / notice / student / todo + 统一入口 |
| **Zustand Store** | 5 | leave / notice / student / todo / user |
| **权限角色（Roles）** | 5 | SUPER_ADMIN / GRADE_ADMIN / HEAD_TEACHER / DORM_ADMIN / TEACHER |
| **权限点（Permissions）** | **31** | 覆盖 Dashboard / Todo / Leave / Notice / Student / Teacher / Dorm / Permission / Role |
| **Design Token 体系** | 1 套 | TS 常量 + CSS 变量 + 完整规范文档 |
| **Markdown 文档** | 2+ | DESIGN_TOKEN.md（设计规范）+ admin/README.md（项目说明） |
| **测试用例** | **45** | 31（Functional）+ 14（Resilience） |

---

## 3. 技术栈（Tech Stack）

| 层级 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 视图 | React | 18 | UI 框架 |
| 语言 | TypeScript | 5.3 | 类型系统 |
| 构建 | Vite | 5 | 开发服务器 + 打包 |
| 路由 | React Router | 6 | SPA 路由（future flags 已开启） |
| 状态（服务端） | TanStack Query | 5 | 数据获取 / 缓存 / invalidate |
| 状态（客户端） | Zustand | 4 | 轻量全局 store（含 persist） |
| UI 组件 | Ant Design | 5 | 企业级组件库 |
| 高级组件 | @ant-design/pro-components | 2.6 | ProTable / ProForm（按需） |
| 图标 | @ant-design/icons | 5 | 图标库 |
| HTTP | Axios | 1.6 | 请求库（带 mock header 注入） |
| 日期 | Day.js | 1.11 | 日期格式化 |
| 工具 | lodash-es | 4 | 工具函数 |
| 类名 | clsx | 2 | 条件 className |
| Mock | MSW | 2 | Service Worker Mock |

**Lint / Format**：
- ESLint 8 + @typescript-eslint + react-hooks
- Prettier 3

---

## 4. 架构与目录

```
admin/
├── docs/
│   └── DESIGN_TOKEN.md             # 设计规范（230 行）
├── public/
│   └── mockServiceWorker.js
├── src/
│   ├── api/                        # 6 个 API 模块
│   ├── auth/                       # RBAC 权限系统（PERM / ROLES / Guard / Hook）
│   ├── components/                 # 9 个通用组件
│   ├── constants/                  # statusMaps（7 类状态映射）
│   ├── layouts/                    # Layout（侧边栏 + 顶栏 + Content）
│   ├── mocks/                      # MSW 数据 + handlers
│   ├── pages/                      # 5 个业务模块
│   │   ├── dashboard/
│   │   ├── todo/
│   │   ├── notice/
│   │   ├── leave/
│   │   └── student/
│   ├── router/                     # 路由配置（routes.tsx，配置驱动）
│   ├── stores/                     # 5 个 Zustand store
│   ├── styles/                     # designToken.ts（设计令牌）
│   ├── types/                      # TypeScript 类型
│   ├── utils/                      # request.ts（Axios + mock header）
│   ├── App.tsx                     # Providers（Query / Router / MSW）
│   ├── main.tsx
│   └── index.css                   # CSS 变量（与 designToken 同步）
├── .eslintrc.cjs
├── .prettierrc.json
├── package.json
├── tsconfig.json
└── vite.config.ts                  # manualChunks 拆分
```

---

## 5. 核心特性

### 5.1 4 层权限系统（RBAC）

| 层级 | 机制 | 文件 |
|---|---|---|
| 路由级 | `<AuthGuard>` + `routes.tsx` 配置驱动 | `router/routes.tsx` |
| 菜单级 | Layout 根据 `user.permissions` 过滤 | `layouts/Layout.tsx` |
| 按钮级 | `<PermissionGuard>` / `<PermissionButton>` | `auth/Permission.tsx` |
| 数据级 | X-Mock-Role header → MSW 过滤 | `utils/request.ts` + `mocks/handlers.ts` |

**5 个角色 × 31 个权限点**，含 DataScope（ALL/GRADE/CLASS/DORM/SELF）。

### 5.2 5 个业务模块

| 模块 | 功能 | 统计 |
|---|---|---|
| Dashboard | 数据驾驶舱、Stats、快捷操作、待办/请假/通知摘要 | 7 个子组件 |
| Todo | 列表（卡片式）、统计、筛选、详情、批量完成 | 5 个子组件 |
| Notice | CRUD、类型/优先级筛选、详情、确认阅读 | 6 个子组件 |
| Leave | CRUD、审批/驳回、筛选、详情（含审批） | 7 个子组件 |
| Student | CRUD、班级/性别/住宿筛选、详情、宿舍分配 | 5 个子组件 |

### 5.3 Design Token 体系

| 类别 | 内容 |
|---|---|
| Spacing | 8/12/16/24/32/48 |
| Radius | 4/8/12/16 |
| Shadow | card / cardHover / drawer / modal |
| Typography | pageTitle(20) / sectionTitle(18) / cardTitle(16) / body(14) / description(13) / caption(12) / statsValue(32) |
| Color | primary/success/warning/error/info/draft + textPrimary/Secondary/Tertiary |
| Component | siderWidth(220) / headerHeight(64) / drawerWidth(640约定) / modalWidth(640/480约定) |
| 预设样式 | `styles.pageHeader` / `styles.pageTitle` / `styles.cardTitle` / `styles.statsValue` |

### 5.4 公共组件矩阵

| 组件 | 作用 |
|---|---|
| `<PageHeader>` | 统一页面标题（替代 5 处 inline style） |
| `<FilterBar>` | 统一过滤栏（查询/重置/展开收起） |
| `<ProTable>` | 统一表格（分页/loading/空态） |
| `<StatusTag>` | 统一状态标签（7 类业务状态） |
| `<PermissionButton>` / `<PermissionGuard>` | 统一权限控制 |
| `<LoadingPage>` / `<EmptyPage>` / `<ErrorPage>` | 统一空 / 错 / 加载 |

---

## 6. 验收记录

| 步骤 | 内容 | 用例数 | 通过率 |
|---|---|---|---|
| Step 9.1 | Functional Testing | 31 | 100% |
| Step 9.2 | Resilience & Edge Case Testing | 14 | 100% |
| Step 10 | UI Consistency Review（6 维度） | — | 100% |
| Step RC | TypeScript / ESLint / Vite Build | — | ✅ 全通过 |

**TypeScript**: 0 errors
**ESLint**: 0 errors / 0 warnings
**Vite Build**: 成功，Bundle 拆分

---

## 7. 性能指标（Build 输出）

```
dist/assets/index-*.js             ~ 65 KB │ gzip:  18.9 KB   (业务代码)
dist/assets/react-vendor-*.js      ~163 KB │ gzip:  53.1 KB   (React / Router)
dist/assets/antd-vendor-*.js      ~1081 KB │ gzip: 339.4 KB   (Antd + Icons)
dist/assets/data-vendor-*.js        ~ 92 KB │ gzip:  31.7 KB   (React Query / Axios / Day.js / Zustand)
dist/assets/index-*.css              ~ 2.5 KB │ gzip:   1.0 KB
─────────────────────────────────────────────
Total                              ~1404 KB │ gzip: 444.1 KB
```

**观察**：`antd-vendor` 占 77%，符合预期。已通过 `manualChunks` 拆分，便于浏览器按模块缓存。

---

## 8. 已知限制（Known Limitations）

| 项 | 说明 | 计划 |
|---|---|---|
| 真实登录 | 暂未接 JWT，依赖 MSW Mock | Sprint 2 P0 |
| 教师管理 | 仅有路由/权限位，无页面 | Sprint 2 P0 |
| 班级管理 | Student 详情中显示班级，但无独立页面 | Sprint 2 P0 |
| 宿舍管理 | 仅有 mock 数据 | Sprint 2 P1 |
| 成绩管理 | 未实现 | Sprint 2 P1 |
| 真实后端 | NestJS 后端已存在，未做端到端联调 | Sprint 2 |

---

## 9. Sprint 2 规划建议

> 进入 Sprint 2 前强烈建议先完成数据模型（班级 / 教师 / 课程 / 成绩）的设计，再写页面。

| 优先级 | 模块 | 原因 |
|---|---|---|
| **P0** | 登录 / 用户中心 | 真正接入认证、替换 MSW |
| **P0** | 班级管理 | Student 基础数据来源 |
| **P0** | 教师管理 | 权限主体（含角色分配） |
| **P0** | 角色 / 权限管理 | UI 化 RBAC 配置 |
| **P1** | 成绩管理 | 核心业务 |
| **P1** | 宿舍管理 | 与 Leave、Student 联动 |
| **P1** | 时间轴 | 历史追溯 |
| **P2** | 家校通知 | 扩展功能 |
| **P2** | 系统设置 | 参数配置 |
| **P2** | 数据统计 | 高级报表 |

### 性能优化（建议 Sprint 2 早期完成）

- [ ] 路由级 `React.lazy` 懒加载
- [ ] antd-icons 按需引入（已部分支持，可进一步）
- [ ] 预留 ECharts 等大依赖的独立 chunk
- [ ] 考虑 antd 全量 → antd-mobile 子集 / 移除未用组件

---

## 10. 致谢

- **产品架构**：刘忠昊老师
- **AI 协同开发**：Trae
- **后端服务**：NestJS（[`/backend`](../backend)）
- **设计规范**：Ant Design 5

---

## 11. 文档索引

| 文档 | 路径 |
|---|---|
| Design Token 规范 | `admin/docs/DESIGN_TOKEN.md` |
| Admin 项目说明 | `admin/README.md` |
| 权限设计 | `docs/10-Permission.md` |
| API 规范 | `docs/09-API.md` |
| 数据模型 | `docs/08-Database.md` |
| 业务流程 | `docs/07-BusinessFlow.md` |
| AI 规则 | `docs/12-AI_RULE.md` |

---

**版本**: v1.0.0-rc1
**最后更新**: 2026-07-18
**下次发布**: v1.0.0（Sprint 2 完成登录与基础数据模块后）
