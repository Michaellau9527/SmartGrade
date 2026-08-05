import { View, Text } from '@tarojs/components';
import './index.scss';

export interface StatItem {
  /** 标签文案 */
  label: string;
  /** 数值 */
  value: number | string;
  /** 主题色：primary(蓝) / warning(橙) / danger(红) / success(绿) / default */
  theme?: 'primary' | 'warning' | 'danger' | 'success' | 'default';
  /** 子文案（如"占 80%"） */
  sub?: string;
}

export interface DashboardCardProps {
  /** 卡片标题 */
  title: string;
  /** 标题旁的副标题（可选） */
  subtitle?: string;
  /** 右侧"更多"文案（可选，没有则不渲染） */
  moreText?: string;
  /** 点击"更多"事件 */
  onMore?: () => void;
  /** 顶部统计条（按数字横排） */
  stats?: StatItem[];
  /** 卡片正文（任意内容） */
  children?: React.ReactNode;
  /** 自定义外层样式类 */
  className?: string;
}

/**
 * 数据看板卡片
 * 用法：
 *   <DashboardCard title="今日班级数据" stats={[
 *     { label: '学生总数', value: 42, theme: 'primary' },
 *     { label: '在校', value: 38, theme: 'success' }
 *   ]} />
 */
export default function DashboardCard(props: DashboardCardProps) {
  const { title, subtitle, moreText, onMore, stats, children, className } = props;

  return (
    <View className={`dashboard-card ${className || ''}`}>
      <View className='dashboard-card__header'>
        <View className='dashboard-card__title-wrap'>
          <Text className='dashboard-card__title'>{title}</Text>
          {subtitle ? <Text className='dashboard-card__subtitle'>{subtitle}</Text> : null}
        </View>
        {moreText ? (
          <View className='dashboard-card__more' onClick={onMore}>
            <Text className='dashboard-card__more-text'>{moreText}</Text>
            <Text className='dashboard-card__more-arrow'>›</Text>
          </View>
        ) : null}
      </View>

      {stats && stats.length > 0 ? (
        <View className='dashboard-card__stats'>
          {stats.map((s, i) => {
            const theme = s.theme || 'default';
            return (
              <View key={i} className='dashboard-card__stat'>
                <Text className={`dashboard-card__stat-value dashboard-card__stat-value--${theme}`}>
                  {s.value}
                </Text>
                <Text className='dashboard-card__stat-label'>{s.label}</Text>
                {s.sub ? <Text className='dashboard-card__stat-sub'>{s.sub}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {children ? <View className='dashboard-card__body'>{children}</View> : null}
    </View>
  );
}
