import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import dayjs from 'dayjs';
import AppIcon from '../AppIcon';
import './index.scss';

export type NoticeCategory = 'all' | 'notice' | 'todo' | 'remind';

export type NoticeItemType = 'NOTICE' | 'TODO' | 'REMIND';

export interface NoticeItem {
  id: string;
  /** 类型：通知 / 待办 / 工作提醒 */
  type: NoticeItemType;
  /** 标题 */
  title: string;
  /** 副标题/描述 */
  desc?: string;
  /** 标签（如"紧急"） */
  tag?: string;
  /** tag 主题色 */
  tagTheme?: 'primary' | 'warning' | 'danger' | 'success' | 'default';
  /** 时间（ISO） */
  time?: string;
  /** 是否未读 */
  unread?: boolean;
  /** 点击 */
  onClick?: () => void;
}

export interface NoticeTab {
  /** tab key（对应 NoticeCategory） */
  key: NoticeCategory;
  /** 显示文案 */
  label: string;
  /** tab 角标（数字） */
  badge?: number;
}

export interface NoticeCardProps {
  title?: string;
  moreText?: string;
  onMore?: () => void;
  /** 列表数据（混合） */
  items: NoticeItem[];
  /** 空状态文案 */
  emptyText?: string;
  /** 自定义 tab 配置；不传则按 type 自动分"全部 / 通知 / 待办 / 提醒" */
  tabs?: NoticeTab[];
  /** 默认激活 tab（默认 'all'） */
  defaultTab?: NoticeCategory;
  /** 是否显示 tab 栏（默认 true） */
  showTabs?: boolean;
}

const DEFAULT_TABS: NoticeTab[] = [
  { key: 'all', label: '全部' },
  { key: 'notice', label: '最近通知' },
  { key: 'todo', label: '待审批' },
  { key: 'remind', label: '工作提醒' }
];

const CATEGORY_KEYS: Record<NoticeCategory, NoticeItemType[]> = {
  all: ['NOTICE', 'TODO', 'REMIND'],
  notice: ['NOTICE'],
  todo: ['TODO'],
  remind: ['REMIND']
};

const DEFAULT_TAG_THEME: Record<NoticeItemType, NoticeItem['tagTheme']> = {
  NOTICE: 'primary',
  TODO: 'warning',
  REMIND: 'success'
};

const TAG_TEXT: Record<NoticeItemType, string> = {
  NOTICE: '通知',
  TODO: '待办',
  REMIND: '提醒'
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const now = dayjs();
  if (d.isSame(now, 'day')) return `今天 ${d.format('HH:mm')}`;
  if (d.isSame(now, 'month')) return d.format('MM-DD HH:mm');
  return d.format('YYYY-MM-DD');
}

/**
 * 通知 & 待办 卡片 2.1
 * - 顶部 tab 分类（全部 / 通知 / 待办 / 提醒）
 * - 列表项右侧 tag + 时间
 * - 友好空状态（图示 + 文案）
 */
export default function NoticeCard(props: NoticeCardProps) {
  const {
    title = '通知 & 待办',
    moreText = '查看全部',
    onMore,
    items,
    emptyText,
    tabs = DEFAULT_TABS,
    defaultTab = 'all',
    showTabs = true
  } = props;
  const [activeTab, setActiveTab] = useState<NoticeCategory>(defaultTab);

  const filteredItems = items.filter((it) => CATEGORY_KEYS[activeTab].includes(it.type));
  const tabBadge = (key: NoticeCategory): number | undefined => {
    const t = tabs.find((x) => x.key === key);
    if (t && t.badge !== undefined) return t.badge;
    if (key === 'all') return items.filter((x) => x.unread).length || undefined;
    return items.filter((x) => CATEGORY_KEYS[key].includes(x.type) && x.unread).length || undefined;
  };

  return (
    <View className='notice-card'>
      <View className='notice-card__header'>
        <View className='notice-card__title-wrap'>
          <View className='notice-card__title-bar' />
          <Text className='notice-card__title'>{title}</Text>
        </View>
        {moreText ? (
          <View className='notice-card__more' onClick={onMore}>
            <Text className='notice-card__more-text'>{moreText}</Text>
            <Text className='notice-card__more-arrow'>›</Text>
          </View>
        ) : null}
      </View>

      {showTabs ? (
        <View className='notice-card__tabs'>
          {tabs.map((t) => {
            const badge = tabBadge(t.key);
            return (
              <View
                key={t.key}
                className={`notice-card__tab ${activeTab === t.key ? 'notice-card__tab--active' : ''}`}
                hoverClass='notice-card__tab--hover'
                hoverStayTime={50}
                onClick={() => setActiveTab(t.key)}
              >
                <Text className='notice-card__tab-text'>{t.label}</Text>
                {badge && badge > 0 ? (
                  <View className='notice-card__tab-badge'>
                    <Text className='notice-card__tab-badge-text'>{badge > 99 ? '99+' : badge}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {filteredItems.length === 0 ? (
        <View className='notice-card__empty'>
          <View className='notice-card__empty-icon'>
            <AppIcon name={activeTab === 'todo' ? 'check' : 'megaphone'} size={32} color='#94a3b8' />
          </View>
          <Text className='notice-card__empty-text'>
            {emptyText || `暂无${activeTab === 'all' ? '通知与待办' : tabs.find((t) => t.key === activeTab)?.label || '内容'}`}
          </Text>
          <Text className='notice-card__empty-sub'>稍后会自动刷新</Text>
        </View>
      ) : (
        <View className='notice-card__list'>
          {filteredItems.slice(0, 8).map((item) => {
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
                <View
                  className={`notice-card__indicator notice-card__indicator--${theme}`}
                />
                <View className='notice-card__main'>
                  <View className='notice-card__title-row'>
                    <Text className='notice-card__item-title'>{item.title}</Text>
                    <Text className={`notice-card__tag notice-card__tag--${theme}`}>
                      {item.tag || defaultTag}
                    </Text>
                  </View>
                  {item.desc ? (
                    <Text className='notice-card__item-desc'>{item.desc}</Text>
                  ) : null}
                  {item.time ? (
                    <Text className='notice-card__time'>{formatTime(item.time)}</Text>
                  ) : null}
                </View>
                {item.unread ? <View className='notice-card__dot' /> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
