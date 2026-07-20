# SmartGrade Admin

> SmartGrade 学校管理平台管理后台 - Sprint 1

## 技术栈

- React 18 + TypeScript + Vite
- React Router v6
- Zustand (client state) + React Query (server state)
- Ant Design 5
- MSW (Mock Service Worker)
- ESLint + Prettier

## 快速开始

```bash
pnpm install
pnpm dev        # 启动开发服务器（自动启用 MSW Mock）
pnpm build      # 生产构建（自动执行 tsc + vite build）
pnpm lint       # ESLint 检查
pnpm type-check # tsc --noEmit
```

开发环境默认走 MSW Mock，登录后可在右上角下拉切换 5 种角色：

| 角色 | 权限范围 |
|---|---|
| SUPER_ADMIN | 全部 |
| GRADE_ADMIN | 年级 |
| HEAD_TEACHER | 班级（班主任） |
| DORM_ADMIN | 宿舍 |
| TEACHER | 个人 |

## 目录结构

```
src/
├── api/          # API 客户端
├── auth/         # 权限系统（PERM、ROLES、Guard、usePermission）
├── components/   # 公共组件（PageHeader/FilterBar/ProTable/StatusTag...）
├── constants/    # 常量（statusMaps）
├── layouts/      # 框架（Layout）
├── mocks/        # MSW Mock 数据 + handlers
├── pages/        # 业务页面（按模块划分）
├── router/       # 路由配置（routes.tsx）
├── stores/       # Zustand stores
├── styles/       # Design Token (designToken.ts)
├── types/        # TypeScript 类型
└── utils/        # 工具函数
```

## 设计规范

完整规范见 [`docs/DESIGN_TOKEN.md`](./docs/DESIGN_TOKEN.md)。

关键点：
- 所有间距使用 `SPACING` token，禁止魔数
- 所有颜色使用 `COLOR` / `STATUS_COLOR` token 或 `var(--color-*)` CSS 变量
- 所有 Status Tag 使用 `<StatusTag type="..." value="..." />`
- 所有页面标题使用 `<PageHeader />`
- 所有过滤栏使用 `<FilterBar />`

## Sprint 1 进度

| 步骤 | 状态 | 说明 |
|---|---|---|
| Step 1-7 基础设施 + 5 个业务模块 | ✅ | Dashboard / Todo / Notice / Leave / Student |
| Step 8 RBAC 权限系统 | ✅ | 5 角色 × 4 层权限（路由/菜单/按钮/数据） |
| Step 9.1 Functional Testing | ✅ | 31 用例通过 |
| Step 9.2 Resilience Testing | ✅ | 14 用例通过 |
| Step 10 UI Consistency Review | ✅ | Layout/Typography/Component/Color/Interaction/Responsive + Design Token |
| Step RC Release Candidate | ✅ | TypeScript / ESLint / Vite Build 全部通过 |

## Bundle 拆分

```
dist/assets/index-*.js             ~ 65 KB  (业务代码)
dist/assets/react-vendor-*.js      ~163 KB  (react / react-dom / router)
dist/assets/antd-vendor-*.js      ~1081 KB  (antd + icons)
dist/assets/data-vendor-*.js        ~ 92 KB  (react-query / axios / dayjs / zustand)
```
