# SmartGrade Admin - Design Token 规范

> 本文档定义 SmartGrade Admin 的设计语言。新增模块/页面必须遵循本规范。
> 所有 Token 已在 [`src/styles/designToken.ts`](./src/styles/designToken.ts) 中编码实现，并在 [`src/index.css`](./src/index.css) 中通过 CSS 变量暴露。

---

## 1. Spacing（间距）

间距使用 **8px 基数**，所有间距必须从此处取值，禁止使用魔数。

| Token | 值 | 用途 |
|---|---|---|
| `xs` | 8px | 紧凑间距（Icon 与文字之间、Tag 间距） |
| `sm` | 12px | 组件内部紧凑间距 |
| `md` | 16px | **标准间距**（Card 间距、Table padding） |
| `lg` | 24px | **页面级间距**（PageHeader 距下个区域） |
| `xl` | 32px | 大区段间距 |
| `xxl` | 48px | 整页 section 间距 |

```ts
import { SPACING } from '@/styles/designToken';
style={{ marginBottom: SPACING.lg }}
```

CSS 变量：
```css
margin-bottom: var(--spacing-md); /* 16px */
```

---

## 2. Radius（圆角）

| Token | 值 | 用途 |
|---|---|---|
| `sm` | 4px | Tag、Badge、Input |
| `md` | 8px | **默认卡片**、Drawer 头 |
| `lg` | 12px | 特殊强调卡片、Stats Card |
| `xl` | 16px | 弹层装饰 |

---

## 3. Shadow（阴影）

| Token | 值 | 用途 |
|---|---|---|
| `card` | `0 1px 2px 0 ...` | 卡片默认阴影（极轻） |
| `cardHover` | `0 4px 12px 0 ...` | Stats Card hover 抬升 |
| `drawer` | `-4px 0 16px 0 ...` | Drawer 右侧 |
| `modal` | `0 8px 24px 0 ...` | Modal 居中弹层 |

---

## 4. Typography（字体）

### 字号

| Token | 值 | 用途 |
|---|---|---|
| `pageTitle` | 20px | 页面大标题（h4） |
| `sectionTitle` | 18px | 区块标题 |
| `cardTitle` | 16px | Card 标题 |
| `tableHeader` | 14px | 表头 |
| `body` | 14px | **正文**（默认） |
| `description` | 13px | 描述/副文本 |
| `caption` | 12px | 注释、辅助信息 |
| `statsValue` | 32px | 统计卡片数值 |

### 字重

| Token | 值 | 用途 |
|---|---|---|
| `normal` | 400 | 默认 |
| `medium` | 500 | 强调 |
| `semibold` | 600 | **标题** |
| `bold` | 700 | 数字（统计值） |

### 行高

| Token | 值 | 用途 |
|---|---|---|
| `tight` | 1.2 | 标题、单行 |
| `normal` | 1.5 | **正文**（默认） |
| `relaxed` | 1.7 | 长段落 |

### 颜色

| Token | 值 | 用途 |
|---|---|---|
| `textPrimary` | `#1f2937` | 主文字（标题） |
| `textSecondary` | `#6b7280` | 副文字（描述） |
| `textTertiary` | `#9ca3af` | 三级文字（注释） |
| `textInverse` | `#ffffff` | 反色（深色背景） |

CSS 变量： `var(--color-text-primary)` 等。

---

## 5. Color（颜色）

| 语义 Token | 值 | 用途 |
|---|---|---|
| `primary` | `#1677ff` | 主色（按钮、链接、focus） |
| `success` | `#52c41a` | 成功状态 |
| `warning` | `#faad14` | 警告状态 |
| `error` | `#ff4d4f` | 错误状态（删除、驳回） |
| `info` | `#1677ff` | 信息提示 |
| `draft` | `#8c8c8c` | 草稿、停用 |

**规则**：所有状态色（Tag、Badge、Stats 趋势文字）必须使用 `STATUS_COLOR` 映射，禁止硬编码颜色字符串。

```ts
import { STATUS_COLOR, COLOR } from '@/styles/designToken';
style={{ color: STATUS_COLOR.APPROVED }}    // '#52c41a'
style={{ color: COLOR.error }}             // '#ff4d4f'
```

### 背景色

| Token | 值 | 用途 |
|---|---|---|
| `bgPrimary` | `#ffffff` | 卡片背景 |
| `bgSecondary` | `#f9fafb` | 嵌入式面板 |
| `bgTertiary` | `#f3f4f6` | 表格行 hover |
| `border` | `#e5e7eb` | 边框 |

---

## 6. Component Size（组件尺寸）

### 容器

| Token | 值 | 用途 |
|---|---|---|
| `siderWidth` | 220px | 左侧菜单 |
| `headerHeight` | 64px | 顶栏 |
| `contentPadding` | 24px | 内容区内边距 |

### Drawer 宽度

| Token | 值 | 用途 |
|---|---|---|
| `drawerWidthSm` | 420px | 小详情（如消息） |
| `drawerWidthMd` | 600px | 中等 |
| `drawerWidthLg` | 840px | 大表单 |

**项目规范**：所有 Detail Drawer **统一 640px**（不属于 token，约定俗成）。

### Modal 宽度

| Token | 值 | 用途 |
|---|---|---|
| `modalWidthSm` | 520px | 确认、提示 |
| `modalWidthMd` | 720px | 复杂表单 |
| `modalWidthLg` | 1000px | 大型表单 |

**项目规范**：所有 Create/Edit Modal **统一 640px**；所有 Approve/Reject Modal **480px**。

---

## 7. Status 颜色映射规范

`STATUS_COLOR` 是项目级业务状态色字典。所有 StatusTag 渲染必须从 `src/constants/statusMaps.ts` 取，禁止重复定义。

```ts
export const studentStatusMap: StatusMap = {
  IN_SCHOOL: { label: '在校', color: 'success' },
  PENDING_LEAVE: { label: '待离校', color: 'warning' },
  LEFT_SCHOOL: { label: '离校', color: 'processing' },
  SUSPENDED: { label: '休学', color: 'default' },
  GRADUATED: { label: '毕业', color: 'default' },
};
```

**已覆盖业务**：todo-status / leave-status / notice-status / priority / business-type / student-status / dorm-status。

**新增业务时**：在 `statusMaps.ts` 中新增映射，Type 必须加入 `StatusMapType` 联合。

---

## 8. 预设组合样式（`styles`）

为减少 inline style 重复使用，提供以下预设：

```ts
import { styles } from '@/styles/designToken';

<PageHeader title="..." />          // 自动应用 styles.pageHeader
<div style={styles.pageTitle}>...</div>
<div style={styles.cardTitle}>...</div>
<div style={styles.statsValue}>...</div>
<div style={styles.tableCard}>...</div>
```

---

## 9. 公共组件使用规范

| 场景 | 必须使用的组件 |
|---|---|
| 页面标题 | `<PageHeader>` |
| 状态/优先级/类型标签 | `<StatusTag type="..." value="..." />` |
| 表格 | `<ProTable>` |
| 过滤栏 | `<FilterBar>`（所有 Select/Input.Search 必须包在 FilterBar 内） |
| 加载占位 | `<LoadingPage>` |
| 空数据 | `<EmptyPage>` |
| 错误页 | `<ErrorPage status="..." />` |
| 权限按钮 | `<PermissionButton>` |
| 权限守卫 | `<PermissionGuard>` / `<AuthGuard>` |

---

## 10. 响应式断点

| 断点 | 行为 |
|---|---|
| ≥ 1920 | 标准布局 |
| 1600 / 1440 | 标准布局，Stats Card padding 略小 |
| 1280 | 表格 padding 12px，标题字号 18px |
| < 1024 | `.hide-on-tablet` 元素隐藏 |

所有 ProTable 必须设置 `scroll={{ x: ... }}` 防止列溢出。

---

## 11. 反模式（禁止）

1. ❌ 硬编码色值 `'#1677ff'`、`'#ff4d4f'`
2. ❌ 硬编码字号 `fontSize: 16`、`fontSize: 14`
3. ❌ 硬编码间距 `marginBottom: 24`、`padding: 16`
4. ❌ 重复 PageHeader inline style
5. ❌ 跨页面复制 `<Spin style={{ display: 'block', textAlign: 'center', marginTop: 80 }} />` 等 loading 写法
6. ❌ 自定义 Tag 颜色 mapping（应使用 `StatusTag`）
7. ❌ 跳过 `<FilterBar>` 直接用 `<Space wrap>`

---

**最后更新**：Sprint 1 / Step 10
**维护者**：SmartGrade 前端组
