import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  getNotices,
  getNoticeDetail,
  markNoticeRead,
  NoticeListItem,
  NoticeType
} from '../../api/notice';
import { mockLogin } from '../../api/auth';
import { useUserStore } from '../../store/user';
import './index.scss';

interface NoticeTypeMeta {
  label: string;
  className: string;
}

const NOTICE_TYPE_MAP: Record<NoticeType, NoticeTypeMeta> = {
  NOTICE: { label: '通知', className: 'tag-type-notice' },
  URGENT: { label: '紧急', className: 'tag-type-urgent' },
  MEETING: { label: '会议', className: 'tag-type-meeting' },
  HOLIDAY: { label: '假期', className: 'tag-type-holiday' },
  TEACHING: { label: '教学', className: 'tag-type-teaching' }
};

/** 直接读 storage 里的 token，绕过 zustand 订阅时机问题 */
function readToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch {
    return '';
  }
}

export default function Notice() {
  const [notices, setNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<
    'idle' | 'logging' | 'success' | 'failed'
  >('idle');
  const setUserInfo = useUserStore((s) => s.setUserInfo);

  /** 先尝试读 storage 里已有的 token，没有就做一次 mock 登录 */
  const ensureLogin = useCallback(async () => {
    const existing = readToken();
    if (existing) {
      setLoginStatus('success');
      return true;
    }
    setLoginStatus('logging');
    try {
      const result = await mockLogin('T001');
      setUserInfo({
        token: result.token,
        teacherNo: result.teacher.teacherNo,
        teacherName: result.teacher.name,
        roles: result.roles,
        permissions: result.permissions
      });
      setLoginStatus('success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Notice] 登录失败:', msg);
      setLoginStatus('failed');
      setError(`登录失败：${msg}`);
      return false;
    }
  }, [setUserInfo]);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getNotices();
      setNotices(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Notice] 通知列表加载失败:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 页面挂载时：先登录，登录成功就拉数据 */
  useEffect(() => {
    (async () => {
      const ok = await ensureLogin();
      if (ok) {
        await fetchNotices();
      }
    })();
  }, [ensureLogin, fetchNotices]);

  Taro.usePullDownRefresh(() => {
    (async () => {
      if (!readToken()) {
        const ok = await ensureLogin();
        if (!ok) {
          Taro.stopPullDownRefresh();
          return;
        }
      }
      await fetchNotices().finally(() => {
        Taro.stopPullDownRefresh();
      });
    })();
  });

  /** 点击通知：标记已读 + 拉取详情并通过 modal 展示 */
  const handleNoticeClick = useCallback(async (notice: NoticeListItem) => {
    // 乐观更新本地已读状态
    if (!notice.isRead) {
      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, isRead: true } : n))
      );
      try {
        await markNoticeRead(notice.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Notice] 标记已读失败:', msg);
        // 回滚已读状态
        setNotices((prev) =>
          prev.map((n) => (n.id === notice.id ? { ...n, isRead: false } : n))
        );
        Taro.showToast({ title: '标记已读失败', icon: 'none' });
        return;
      }
    }

    // 拉取详情展示正文
    Taro.showLoading({ title: '加载中…' });
    let content = '';
    try {
      const detail = await getNoticeDetail(notice.id);
      content = detail.content || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Notice] 详情加载失败:', msg);
    } finally {
      Taro.hideLoading();
    }

    const time = notice.publishedAt
      ? dayjs(notice.publishedAt).format('YYYY-MM-DD HH:mm')
      : '';
    const meta = [
      `发布人：${notice.publisherName}`,
      time ? `发布时间：${time}` : '',
      notice.requireConfirm
        ? notice.isAcknowledged
          ? '需要确认：已确认'
          : '需要确认：未确认'
        : ''
    ]
      .filter(Boolean)
      .join('\n');

    Taro.showModal({
      title: notice.title,
      content: content ? `${meta}\n\n${content}` : meta,
      showCancel: false,
      confirmText: '知道了'
    });
  }, []);

  // 登录进行中
  if (loginStatus === 'logging') {
    return (
      <View className='notice'>
        <View className='state-tip'>登录中…</View>
      </View>
    );
  }

  // 登录失败
  if (loginStatus === 'failed') {
    return (
      <View className='notice'>
        <View className='state-tip'>登录失败</View>
        <View className='state-tip state-error'>{error}</View>
      </View>
    );
  }

  // 首次加载中（登录成功了，但还在拉数据）
  if (loading && notices.length === 0) {
    return (
      <View className='notice'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 加载失败且无缓存
  if (error && notices.length === 0) {
    return (
      <View className='notice'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  // 空数据
  if (notices.length === 0) {
    return (
      <View className='notice'>
        <View className='state-tip'>暂无通知</View>
      </View>
    );
  }

  const unreadCount = notices.filter((n) => !n.isRead).length;

  return (
    <View className='notice'>
      <View className='notice-summary'>
        共 {notices.length} 条通知
        {unreadCount > 0 && (
          <Text className='unread-count'> · 未读 {unreadCount}</Text>
        )}
      </View>

      <View className='notice-list'>
        {notices.map((notice) => {
          const typeMeta = NOTICE_TYPE_MAP[notice.noticeType];
          return (
            <View
              key={notice.id}
              className={`notice-card ${notice.isRead ? '' : 'is-unread'}`}
              onClick={() => handleNoticeClick(notice)}
            >
              {!notice.isRead && <View className='unread-dot' />}
              <View className='notice-card-header'>
                <Text className={`tag ${typeMeta.className}`}>
                  {typeMeta.label}
                </Text>
                {notice.requireConfirm && (
                  <Text
                    className={`tag tag-confirm ${
                      notice.isAcknowledged ? 'tag-confirmed' : ''
                    }`}
                  >
                    {notice.isAcknowledged ? '已确认' : '需确认'}
                  </Text>
                )}
              </View>
              <View className='notice-card-title'>{notice.title}</View>
              <View className='notice-card-meta'>
                <Text className='meta-publisher'>{notice.publisherName}</Text>
                <Text className='meta-time'>
                  {notice.publishedAt
                    ? dayjs(notice.publishedAt).format('MM-DD HH:mm')
                    : '未发布'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
