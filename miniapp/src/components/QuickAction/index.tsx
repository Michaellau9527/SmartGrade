import { View, Text } from '@tarojs/components';
import AppIcon, { AppIconName } from '../AppIcon';
import './index.scss';

export interface QuickActionItem {
  /** 唯一 code */
  code: string;
  /** 显示文案 */
  label: string;
  /** 角标数字（小红点数字，可选） */
  badge?: number;
  /** 图标名称（AppIcon name），可选 */
  icon?: AppIconName;
  /** 背景色：primary / warning / success / danger / purple / default */
  theme?: 'primary' | 'warning' | 'success' | 'danger' | 'purple' | 'default';
  /** 点击事件 */
  onClick?: () => void;
}

export interface QuickActionProps {
  title?: string;
  moreText?: string;
  onMore?: () => void;
  items: QuickActionItem[];
  /** 列数：默认 4 */
  columns?: 3 | 4 | 5;
  /** 通用点击回调：传入后，所有 item.onClick 会被覆盖为 onItemClick(code) */
  onItemClick?: (code: string) => void;
}

const THEME_BG: Record<NonNullable<QuickActionItem['theme']>, string> = {
  primary: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
  warning: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
  success: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
  danger: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
  purple: 'linear-gradient(135deg, #f4f0ff 0%, #d3adf7 100%)',
  default: 'linear-gradient(135deg, #f2f4f7 0%, #e5e6eb 100%)'
};

const THEME_RING: Record<NonNullable<QuickActionItem['theme']>, string> = {
  primary: 'rgba(22, 119, 255, 0.20)',
  warning: 'rgba(250, 140, 22, 0.20)',
  success: 'rgba(82, 196, 26, 0.20)',
  danger: 'rgba(255, 77, 79, 0.20)',
  purple: 'rgba(114, 46, 209, 0.20)',
  default: 'rgba(78, 89, 105, 0.18)'
};

const THEME_FG: Record<NonNullable<QuickActionItem['theme']>, string> = {
  primary: '#1677ff',
  warning: '#fa8c16',
  success: '#52c41a',
  danger: '#ff4d4f',
  purple: '#722ed1',
  default: '#4e5969'
};

/**
 * 快捷入口：APP 风格圆形图标宫格
 */
export default function QuickAction(props: QuickActionProps) {
  const { title = '快捷入口', moreText, onMore, items, columns = 4, onItemClick } = props;
  const colClass =
    columns === 3
      ? 'quick-action__grid--3'
      : columns === 5
        ? 'quick-action__grid--5'
        : 'quick-action__grid--4';

  return (
    <View className='quick-action'>
      {(title || moreText) && (
        <View className='quick-action__header'>
          <Text className='quick-action__title'>{title}</Text>
          {moreText ? (
            <View className='quick-action__more' onClick={onMore}>
              <Text className='quick-action__more-text'>{moreText}</Text>
              <Text className='quick-action__more-arrow'>›</Text>
            </View>
          ) : null}
        </View>
      )}

      {items.length === 0 ? (
        <View className='quick-action__empty'>暂无快捷入口</View>
      ) : (
        <View className={`quick-action__grid ${colClass}`}>
          {items.map((item) => {
            const theme = item.theme || 'default';
            const bg = THEME_BG[theme];
            const ring = THEME_RING[theme];
            const fg = THEME_FG[theme];
            const handleClick = item.onClick ?? (onItemClick ? () => onItemClick(item.code) : undefined);
            return (
              <View
                key={item.code}
                className='quick-action__item'
                hoverClass='quick-action__item--hover'
                hoverStayTime={50}
                onClick={handleClick}
              >
                <View
                  className='quick-action__icon'
                  style={{ background: bg, boxShadow: `0 6px 14px ${ring}` }}
                >
                  {item.icon ? (
                    <AppIcon name={item.icon} size={24} color={fg} />
                  ) : (
                    <Text className='quick-action__icon-text' style={{ color: fg }}>
                      {item.label.charAt(0)}
                    </Text>
                  )}
                  {item.badge && item.badge > 0 ? (
                    <View className='quick-action__badge'>
                      <Text className='quick-action__badge-text'>
                        {item.badge > 99 ? '99+' : String(item.badge)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className='quick-action__label'>{item.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
