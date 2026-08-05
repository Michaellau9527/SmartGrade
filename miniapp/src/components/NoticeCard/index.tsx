import { View, Text } from '@tarojs/components';
import dayjs from 'dayjs';
import './index.scss';

export type NoticeItemType = 'NOTICE' | 'TODO';

export interface NoticeItem {
  id: string;
  /** 类型：通知 / 待办 */
  type: NoticeItemType;
  /** 标题 */
  title: string;
  /** 副标题/描述（可选） */
  desc?: string;
  /** 标签（如"紧急"/"待处理"） */
  tag?: string;
  /** tag 主题色 */
  tagTheme?: 'primary' | 'warning' | 'danger' | 'success' | 'default';
  /** 时间（ISO） */
  time?: string;
  /** 是否未读（小圆点） */
  unread?: boolean;
  /** 点击事件 */
  onClick?: () => void;
}

export interface NoticeCardProps {
  title?: string;
  /** 右侧"更多" */
  moreText?: string;
  onMore?: () => void;
  items: NoticeItem[];
  /** 列表为空时显示文案 */
  emptyText?: string;
}

const DEFAULT_TAG_THEME: Record<NoticeItemType, NoticeItem['tagTheme']> = {
  NOTICE: 'primary',
  TODO: 'warning'
};

const TAG_TEXT: Record<NoticeItemType, string> = {
  NOTICE: '通知',
  TODO: '待办'
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  // 今天的显示 HH:mm，其他显示 MM-DD
  const now = dayjs();
  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now, 'month')) return d.format('MM-DD');
  return d.format('YYYY-MM-DD');
}

/**
 * 通知&待办中心
 * 同一张卡片内合并通知 + 待办两类信息
 */
export default function NoticeCard(props: NoticeCardProps) {
  const { title = '通知 & 待办', moreText = '查看全部', onMore, items, emptyText = '暂无通知与待办' } = props;

  return (
    <View className='notice-card'>
      <View className='notice-card__header'>
        <Text className='notice-card__title'>{title}</Text>
        {moreText ? (
          <View className='notice-card__more' onClick={onMore}>
            <Text className='notice-card__more-text'>{moreText}</Text>
            <Text className='notice-card__more-arrow'>›</Text>
          </View>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View className='notice-card__empty'>{emptyText}</View>
      ) : (
        <View className='notice-card__list'>
          {items.map((item) => {
            const theme = item.tagTheme || DEFAULT_TAG_THEME[item.type] || 'default';
            const defaultTag = TAG_TEXT[item.type];
            return (
              <View
                key={item.id}
                className='notice-card__item'
                hoverClass='notice-card__item--hover'
                hoverStayTime={50}
                onClick={item.onClick}
              >
                <View className='notice-card__main'>
                  <View className='notice-card__title-row'>
                    {item.unread ? <View className='notice-card__dot' /> : null}
                    <Text className='notice-card__item-title'>{item.title}</Text>
                  </View>
                  {item.desc ? (
                    <Text className='notice-card__item-desc'>{item.desc}</Text>
                  ) : null}
                </View>
                <View className='notice-card__aside'>
                  <Text className={`notice-card__tag notice-card__tag--${theme}`}>
                    {item.tag || defaultTag}
                  </Text>
                  {item.time ? (
                    <Text className='notice-card__time'>{formatTime(item.time)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
