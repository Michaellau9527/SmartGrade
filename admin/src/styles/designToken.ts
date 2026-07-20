/**
 * Design Tokens
 * 全局设计规范：间距、圆角、阴影、字体、颜色
 * 新增模块/页面时统一使用此处的常量
 */

import type { CSSProperties } from 'react';

// ─── Spacing（间距） ───────────────────────────────────
export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 常用页面级间距组合
export const PAGE_PADDING: CSSProperties = { padding: 0 };
export const SECTION_GAP: CSSProperties = { marginTop: SPACING.md, marginBottom: SPACING.md };
export const SECTION_GAP_LG: CSSProperties = { marginTop: SPACING.lg, marginBottom: SPACING.lg };

// ─── Radius（圆角） ───────────────────────────────────
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

// ─── Shadow（阴影） ────────────────────────────────────
export const SHADOW = {
  card: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
  cardHover: '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
  drawer: '-4px 0 16px 0 rgba(0, 0, 0, 0.08)',
  modal: '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
} as const;

// ─── Typography（字体） ─────────────────────────────────
export const FONT_SIZE = {
  pageTitle: 20,
  sectionTitle: 18,
  cardTitle: 16,
  tableHeader: 14,
  body: 14,
  description: 13,
  caption: 12,
  statsValue: 32,
} as const;

export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ─── Color（颜色 - 与 antd 主题色对齐） ─────────────────
export const COLOR = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1677ff',
  draft: '#8c8c8c',  // 草稿/未发布

  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',

  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',
  border: '#e5e7eb',
} as const;

// 状态色映射（与 StatusTag 对齐）
export const STATUS_COLOR = {
  // 通用
  ACTIVE: COLOR.success,
  INACTIVE: COLOR.draft,
  PENDING: COLOR.warning,
  PROCESSING: COLOR.primary,
  COMPLETED: COLOR.success,
  FAILED: COLOR.error,
  REJECTED: COLOR.error,
  CANCELLED: COLOR.draft,

  // 业务
  TODO: COLOR.primary,
  DONE: COLOR.success,
  ARCHIVED: COLOR.draft,
  DRAFT: COLOR.draft,
  PUBLISHED: COLOR.success,
  EXPIRED: COLOR.draft,

  // 学生状态
  IN_SCHOOL: COLOR.success,
  PENDING_LEAVE: COLOR.warning,
  LEFT_SCHOOL: COLOR.primary,
  SUSPENDED: COLOR.error,
  GRADUATED: COLOR.draft,

  // 请假状态
  APPROVED: COLOR.success,
  LEFT: COLOR.primary,
  RETURNED: COLOR.success,
  REJECT: COLOR.error,
} as const;

// ─── Component Size（组件尺寸） ─────────────────────────
export const COMPONENT = {
  buttonHeight: 32,
  inputHeight: 32,
  tableRowHeight: 54,
  cardPadding: SPACING.lg,

  // 容器
  siderWidth: 220,
  headerHeight: 64,
  contentPadding: SPACING.lg,

  // Drawer 宽度
  drawerWidthSm: 420,
  drawerWidthMd: 600,
  drawerWidthLg: 840,

  // Modal 宽度
  modalWidthSm: 520,
  modalWidthMd: 720,
  modalWidthLg: 1000,
} as const;

// ─── Animation（动画） ──────────────────────────────────
export const ANIMATION = {
  durationFast: '0.1s',
  durationNormal: '0.2s',
  durationSlow: '0.3s',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── 预设组合样式 ─────────────────────────────────────
export const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    alignItems: 'center',
  } satisfies CSSProperties,

  pageTitle: {
    margin: 0,
    fontSize: FONT_SIZE.pageTitle,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.tight,
  } satisfies CSSProperties,

  sectionTitle: {
    fontSize: FONT_SIZE.sectionTitle,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  } satisfies CSSProperties,

  cardTitle: {
    fontSize: FONT_SIZE.cardTitle,
    fontWeight: FONT_WEIGHT.semibold,
  } satisfies CSSProperties,

  statsValue: {
    fontSize: FONT_SIZE.statsValue,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
  } satisfies CSSProperties,

  statsLabel: {
    color: COLOR.textSecondary,
    fontSize: FONT_SIZE.body,
  } satisfies CSSProperties,

  tableCard: {
    background: COLOR.bgPrimary,
    borderRadius: RADIUS.md,
    boxShadow: SHADOW.card,
  } satisfies CSSProperties,
} as const;
