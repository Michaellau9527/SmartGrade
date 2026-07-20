/**
 * SmartGrade Admin Dashboard v1.0 统一设计规范
 *
 * 全局样式常量，后续所有页面统一使用。
 */

/** 页面间距 */
export const SPACING = {
  page: 24,
  section: 24,
  card: '20px 24px',
  tableHeader: 16,
} as const;

/** Card 风格 */
export const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #f0f0f0',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

/** 统计卡片风格 */
export const STATS_CARD_STYLE: React.CSSProperties = {
  ...CARD_STYLE,
  padding: '20px 24px',
  minHeight: 110,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export const STATS_CARD_HOVER: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

/** 快捷入口卡片 */
export const ACTION_CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #f0f0f0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 16,
  height: 80,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

/** 配色 */
export const COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#6b7280',
} as const;
