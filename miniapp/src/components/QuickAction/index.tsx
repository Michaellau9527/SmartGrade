import { View, Text } from '@tarojs/components';
import './index.scss';

export interface QuickActionItem {
  /** 唯一 code */
  code: string;
  /** 显示文案 */
  label: string;
  /** 角标数字（小红点数字，可选） */
  badge?: number;
  /** 图标（emoji 或 1-2 字），可选 */
  icon?: string;
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
}

const THEME_BG: Record<NonNullable<QuickActionItem['theme']>, string> = {
  primary: '#e6f4ff',
  warning: '#fff7e6',
  success: '#f6ffed',
  danger: '#fff1f0',
  purple: '#f4f0ff',
  default: '#f2f3f5'
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
 * 快捷入口：宫格按钮
 */
export default function QuickAction(props: QuickActionProps) {
  const { title = '快捷入口', moreText, onMore, items, columns = 4 } = props;
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
            const fg = THEME_FG[theme];
            return (
              <View
                key={item.code}
                className='quick-action__item'
                hoverClass='quick-action__item--hover'
                hoverStayTime={50}
                onClick={item.onClick}
              >
                <View
                  className='quick-action__icon'
                  style={{ backgroundColor: bg, color: fg }}
                >
                  <Text className='quick-action__icon-text'>{item.icon || item.label.charAt(0)}</Text>
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
