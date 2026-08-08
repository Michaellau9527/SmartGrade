import { View, Text } from '@tarojs/components';
import './index.scss';

/** 状态点颜色：green / yellow / red / blue / gray */
export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';

export interface StatusItem {
  /** 圆点 + 文案 */
  label: string;
  /** 数值 */
  value: number | string;
  /** 圆点主题色 */
  color: StatusColor;
  /** 副文案（可选） */
  sub?: string;
}

export interface HeroBlock {
  /** 核心数字 */
  value: number | string;
  /** 数字下方标签 */
  label: string;
  /** 数字主题色 */
  theme?: 'primary' | 'warning' | 'success' | 'danger' | 'default';
  /** 数字后缀（如"人"/"%"） */
  suffix?: string;
  /** 角标（右上小标签） */
  badge?: string;
}

export interface GridItem {
  /** 数值 */
  value: number | string;
  /** 标签 */
  label: string;
  /** 颜色主题（blue/green/orange/red） */
  color: StatusColor;
  /** 点击跳转 */
  onTap?: () => void;
}

export interface DashboardCardProps {
  /** 卡片标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 右侧"更多" */
  moreText?: string;
  onMore?: () => void;
  /** 模式：hero(默认) / grid(2×2彩色格) */
  mode?: 'hero' | 'grid';
  /** 2×2 网格项（mode='grid' 时生效） */
  gridItems?: GridItem[];
  /** 核心数字区（hero 模式） */
  hero?: HeroBlock;
  /** 状态列表（hero 下方） */
  statusList?: StatusItem[];
  /** 旧版兼容：4 个平均小方块 */
  stats?: StatusItem[];
  /** 自定义正文 */
  children?: React.ReactNode;
  /** 主题色 */
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  /** 整体 className */
  className?: string;
}

const STATUS_COLOR_MAP: Record<StatusColor, string> = {
  green: '#52c41a',
  yellow: '#faad14',
  red: '#ff4d4f',
  blue: '#1677ff',
  gray: '#bfbfbf',
  purple: '#722ed1',
  orange: '#fa8c16'
};

const STATUS_BG_MAP: Record<StatusColor, string> = {
  green: '#f6ffed',
  yellow: '#fffbe6',
  red: '#fff1f0',
  blue: '#e6f4ff',
  gray: '#f5f5f5',
  purple: '#f4f0ff',
  orange: '#fff7e6'
};

/**
 * 数据看板卡片 2.1
 * 模式 A：核心数字 hero + 状态列表（推荐）
 *   <DashboardCard
 *     title="今日班级"
 *     hero={{ value: 128, label: '学生', theme: 'primary' }}
 *     statusList={[
 *       { label: '在校', value: 126, color: 'green' },
 *       { label: '请假', value: 2, color: 'yellow' }
 *     ]}
 *   />
 * 模式 B：旧 4 个平均小方块（兼容）
 */
export default function DashboardCard(props: DashboardCardProps) {
  const { title, subtitle, moreText, onMore, mode = 'hero', gridItems, hero, statusList, stats, children, accent = 'primary', className } = props;

  const useHero = mode === 'hero' && (!!hero || (!!statusList && statusList.length > 0));
  const useGrid = mode === 'grid' && gridItems && gridItems.length > 0;

  return (
    <View className={`dashboard-card dashboard-card--${accent} ${className || ''}`}>
      <View className='dashboard-card__header'>
        <View className='dashboard-card__title-wrap'>
          <View className={`dashboard-card__title-bar dashboard-card__title-bar--${accent}`} />
          <View>
            <Text className='dashboard-card__title'>{title}</Text>
            {subtitle ? <Text className='dashboard-card__subtitle'>{subtitle}</Text> : null}
          </View>
        </View>
        {moreText ? (
          <View className='dashboard-card__more' onClick={onMore}>
            <Text className='dashboard-card__more-text'>{moreText}</Text>
            <Text className='dashboard-card__more-arrow'>›</Text>
          </View>
        ) : null}
      </View>

      {useGrid && gridItems ? (
        <View className='dashboard-card__grid'>
          {gridItems.map((g, i) => {
            const colors: Record<StatusColor, { bg: string; border: string; iconBg: string }> = {
              blue: { bg: '#f0f7ff', border: '#bae0ff', iconBg: '#e6f4ff' },
              green: { bg: '#f6ffed', border: '#d9f8be', iconBg: '#eaffd6' },
              orange: { bg: '#fffcf0', border: '#ffe7ba', iconBg: '#fff7e6' },
              red: { bg: '#fff4f4', border: '#ffd6d6', iconBg: '#fff1f0' },
              yellow: { bg: '#fffef5', border: '#fff1b8', iconBg: '#fffbe6' },
              purple: { bg: '#faf8ff', border: '#efdbff', iconBg: '#f9f0ff' },
              gray: { bg: '#fbfbfb', border: '#f0f0f0', iconBg: '#f5f5f5' }
            };
            const c = colors[g.color] || colors.blue;
            return (
              <View key={i} className={`dashboard-card__grid-cell dashboard-card__grid-cell--${g.color}`}
                onClick={g.onTap}
              >
                <View className='dg-icon' style={{ backgroundColor: c.iconBg }}>
                  <Text className='dg-icon-text'>
                    {g.color === 'blue' ? '👥' : g.color === 'green' ? '🏠' : g.color === 'orange' ? '📝' : '⚠️'}
                  </Text>
                </View>
                <Text className='dg-value'>{g.value}</Text>
                <Text className='dg-label'>{g.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {useHero ? (
        <View className='dashboard-card__hero-wrap'>
          {hero ? (
            <View className='dashboard-card__hero'>
              <View className='dashboard-card__hero-num'>
                <Text className={`dashboard-card__hero-value dashboard-card__hero-value--${hero.theme || 'default'}`}>
                  {hero.value}
                </Text>
                {hero.suffix ? (
                  <Text className='dashboard-card__hero-suffix'>{hero.suffix}</Text>
                ) : null}
                {hero.badge ? (
                  <View className='dashboard-card__hero-badge'>
                    <Text className='dashboard-card__hero-badge-text'>{hero.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text className='dashboard-card__hero-label'>{hero.label}</Text>
            </View>
          ) : null}

          {statusList && statusList.length > 0 ? (
            <View className='dashboard-card__status-list'>
              {statusList.map((s, i) => {
                const color = STATUS_COLOR_MAP[s.color] || STATUS_COLOR_MAP.blue;
                const bg = STATUS_BG_MAP[s.color] || STATUS_BG_MAP.blue;
                return (
                  <View key={i} className='dashboard-card__status-item'>
                    <View
                      className='dashboard-card__status-dot'
                      style={{ backgroundColor: bg }}
                    >
                      <View
                        className='dashboard-card__status-dot-inner'
                        style={{ backgroundColor: color }}
                      />
                    </View>
                    <View className='dashboard-card__status-text'>
                      <Text className='dashboard-card__status-label'>{s.label}</Text>
                      {s.sub ? <Text className='dashboard-card__status-sub'>{s.sub}</Text> : null}
                    </View>
                    <Text
                      className='dashboard-card__status-value'
                      style={{ color }}
                    >
                      {s.value}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 旧 stats 模式：保留兼容 */}
      {!useHero && stats && stats.length > 0 ? (
        <View className='dashboard-card__stats'>
          {stats.map((s, i) => (
            <View key={i} className='dashboard-card__stat'>
              <Text
                className='dashboard-card__stat-value'
                style={{ color: STATUS_COLOR_MAP[s.color] || STATUS_COLOR_MAP.blue }}
              >
                {s.value}
              </Text>
              <Text className='dashboard-card__stat-label'>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {children ? <View className='dashboard-card__body'>{children}</View> : null}
    </View>
  );
}
