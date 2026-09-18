import { View, Text } from '@tarojs/components';
import dayjs from 'dayjs';
import './index.scss';

export type TimelineType = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface TimelineItem {
  id: string;
  /** 标题 */
  title: string;
  /** 描述（可选） */
  desc?: string;
  /** 时间（ISO） */
  time: string;
  /** 节点类型（颜色） */
  type?: TimelineType;
  /** 左侧 tag 文案（可选） */
  tag?: string;
  /** 点击 */
  onClick?: () => void;
}

export interface TimelineProps {
  title?: string;
  moreText?: string;
  onMore?: () => void;
  items: TimelineItem[];
  emptyText?: string;
}

function formatTime(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  return d.format('MM-DD HH:mm');
}

const TYPE_DOT_COLOR: Record<NonNullable<TimelineType>, string> = {
  INFO: '#1677ff',
  SUCCESS: '#52c41a',
  WARNING: '#fa8c16',
  DANGER: '#ff4d4f'
};

/**
 * 时间线：纵向节点列表
 * 适用于：班级动态、任务进度、异常事件流
 */
export default function Timeline(props: TimelineProps) {
  const { title = '动态', moreText, onMore, items, emptyText = '暂无动态' } = props;

  return (
    <View className='timeline'>
      <View className='timeline__header'>
        <Text className='timeline__title'>{title}</Text>
        {moreText ? (
          <View className='timeline__more' onClick={onMore}>
            <Text className='timeline__more-text'>{moreText}</Text>
            <Text className='timeline__more-arrow'>›</Text>
          </View>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View className='timeline__empty'>{emptyText}</View>
      ) : (
        <View className='timeline__list'>
          {items.map((item, idx) => {
            const type = item.type || 'INFO';
            const isLast = idx === items.length - 1;
            const dotColor = TYPE_DOT_COLOR[type];
            return (
              <View
                key={item.id}
                className='timeline__item'
                hoverClass={item.onClick ? 'timeline__item--hover' : undefined}
                hoverStayTime={50}
                onClick={item.onClick}
              >
                <View className='timeline__rail'>
                  <View
                    className='timeline__dot'
                    style={{ backgroundColor: dotColor }}
                  />
                  {!isLast ? <View className='timeline__line' /> : null}
                </View>
                <View className='timeline__content'>
                  <View className='timeline__head'>
                    <Text className='timeline__item-title'>{item.title}</Text>
                    {item.tag ? (
                      <Text className={`timeline__tag timeline__tag--${type.toLowerCase()}`}>
                        {item.tag}
                      </Text>
                    ) : null}
                  </View>
                  {item.desc ? (
                    <Text className='timeline__desc'>{item.desc}</Text>
                  ) : null}
                  <Text className='timeline__time'>{formatTime(item.time)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
