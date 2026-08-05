import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  getWorkbench,
  NoticeType,
  TodoStatus,
  WorkbenchResponse
} from '../../api/workbench';
import { mockLogin } from '../../api/auth';
import { useUserStore } from '../../store/user';
import './index.scss';

/** 英文星期 -> 中文 */
const WEEK_MAP: Record<string, string> = {
  Monday: '星期一',
  Tuesday: '星期二',
  Wednesday: '星期三',
  Thursday: '星期四',
  Friday: '星期五',
  Saturday: '星期六',
  Sunday: '星期日'
};

interface TodoStatusMeta {
  label: string;
  className: string;
}

const TODO_STATUS_MAP: Record<TodoStatus, TodoStatusMeta> = {
  PENDING: { label: '待处理', className: 'tag-pending' },
  IN_PROGRESS: { label: '进行中', className: 'tag-progress' },
  COMPLETED: { label: '已完成', className: 'tag-completed' },
  OVERDUE: { label: '已逾期', className: 'tag-overdue' }
};

const NOTICE_TYPE_MAP: Record<NoticeType, string> = {
  NOTICE: '通知',
  URGENT: '紧急',
  MEETING: '会议',
  HOLIDAY: '假期',
  TEACHING: '教学'
};

function formatWeek(week: string): string {
  return WEEK_MAP[week] || week;
}

/** 直接读 storage 里的 token，绕过 zustand 订阅时机问题 */
function readToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch {
    return '';
  }
}

/** 快捷入口 code -> 跳转目标页面（小程序页面路径） */
const QUICK_ACTION_TARGET: Record<string, string> = {
  'leave.create': '/pages/leave/index',
  'leave.approve': '/pages/leave/index',
  'notice.publish': '/pages/notice/index',
  'student.read': '/pages/student/index'
  // 其他 code（task.assign / incident.create / dorm.check / statistics.read）
  // 暂无对应页面，点击不跳转（Toast 提示）
};

export default function Workbench() {
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<
    'idle' | 'logging' | 'success' | 'failed'
  >('idle');
  const setUserInfo = useUserStore((s) => s.setUserInfo);
  const teacherName = useUserStore((s) => s.teacherName);

  /** 快捷入口点击：按 code 跳到对应页面，没有对应页就 toast 提示 */
  const handleQuickAction = useCallback((code: string) => {
    const target = QUICK_ACTION_TARGET[code];
    if (target) {
      Taro.switchTab({ url: target }).catch(() => {
        // switchTab 失败（非 tabBar 页面）用 navigateTo 兜底
        Taro.navigateTo({ url: target });
      });
    } else {
      Taro.showToast({ title: '该功能即将上线', icon: 'none' });
    }
  }, []);

  /** 先尝试读 storage 里已有的 token，没有就做一次 mock 登录 */
  const ensureLogin = useCallback(async () => {
    const existing = readToken();
    if (existing) {
      console.log('[Workbench] 本地已有 token，跳过登录');
      setLoginStatus('success');
      return true;
    }

    setLoginStatus('logging');
    try {
      console.log('[Workbench] 开始 mock 登录: T001');
      const result = await mockLogin('T001');
      console.log('[Workbench] 登录成功:', result.teacher.name);
      setUserInfo({
        token: result.token,
        teacherNo: result.teacher.teacherNo,
        teacherName: result.teacher.name,
        roles: result.roles ?? [],
        permissions: result.permissions ?? []
      });
      setLoginStatus('success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Workbench] 登录失败:', msg);
      setLoginStatus('failed');
      setError(`登录失败：${msg}`);
      return false;
    }
  }, [setUserInfo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWorkbench();
      console.log('[Workbench] 工作台数据加载成功');
      setData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Workbench] 工作台数据失败:', msg);
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
        await fetchData();
      }
    })();
  }, [ensureLogin, fetchData]);

  Taro.usePullDownRefresh(() => {
    (async () => {
      if (!readToken()) {
        const ok = await ensureLogin();
        if (!ok) {
          Taro.stopPullDownRefresh();
          return;
        }
      }
      await fetchData().finally(() => {
        Taro.stopPullDownRefresh();
      });
    })();
  });

  // 登录进行中
  if (loginStatus === 'logging') {
    return (
      <View className='workbench'>
        <View className='state-tip'>登录中…</View>
      </View>
    );
  }

  // 登录失败
  if (loginStatus === 'failed') {
    return (
      <View className='workbench'>
        <View className='state-tip'>登录失败</View>
        <View className='state-tip state-error'>{error}</View>
      </View>
    );
  }

  // 首次加载中（登录成功了，但还在拉数据）
  if (loading && !data) {
    return (
      <View className='workbench'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 加载失败且无缓存
  if (error && !data) {
    return (
      <View className='workbench'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  if (!data) {
    return (
      <View className='workbench'>
        <View className='state-tip'>暂无数据</View>
      </View>
    );
  }

  const today = data.today;
  const studentStatusSummary = data.studentStatusSummary;
  const todos = data.todos ?? [];
  const recentNotices = data.recentNotices ?? [];
  const quickActions = data.quickActions ?? [];

  return (
    <View className='workbench'>
      {/* 顶部问候栏 */}
      <View className='header'>
        <View className='greeting'>你好，{teacherName || '老师'}</View>
        <View className='date-line'>
          <Text className='date'>{today.date}</Text>
          <Text className='week'>{formatWeek(today.week)}</Text>
          {!today.isSchoolDay && <Text className='non-school-day'>非教学日</Text>}
        </View>
      </View>

      {/* 学生状态卡片 */}
      <View className='card'>
        <View className='card-title'>
          学生状态 · 共 {studentStatusSummary?.totalStudents ?? 0} 人
        </View>
        <View className='stat-grid'>
          <View className='stat-item'>
            <View className='stat-num stat-num-primary'>{studentStatusSummary?.onCampus ?? 0}</View>
            <View className='stat-label'>在校</View>
          </View>
          <View className='stat-item'>
            <View className='stat-num'>{studentStatusSummary?.outOfSchool ?? 0}</View>
            <View className='stat-label'>离校</View>
          </View>
          <View className='stat-item'>
            <View className='stat-num stat-num-warning'>{studentStatusSummary?.studentsLeaving ?? 0}</View>
            <View className='stat-label'>未闭环</View>
          </View>
        </View>
      </View>

      {/* 今日待办 */}
      <View className='card'>
        <View className='card-title'>今日待办</View>
        {todos.length === 0 ? (
          <View className='empty'>暂无待办</View>
        ) : (
          <View className='todo-list'>
            {todos.map((todo) => {
              const status = TODO_STATUS_MAP[todo.status];
              return (
                <View key={todo.id} className='todo-item'>
                  <View className='todo-title'>{todo.title}</View>
                  <View className='todo-meta'>
                    {todo.dueAt && (
                      <Text className='todo-due'>
                        {dayjs(todo.dueAt).format('HH:mm')}
                      </Text>
                    )}
                    <Text className={`tag ${status.className}`}>{status.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 最近通知 */}
      <View className='card'>
        <View className='card-title'>最近通知</View>
        {recentNotices.length === 0 ? (
          <View className='empty'>暂无通知</View>
        ) : (
          <View className='notice-list'>
            {recentNotices.map((notice) => (
              <View key={notice.id} className='notice-item'>
                <View className='notice-title'>{notice.title}</View>
                <View className='notice-meta'>
                  <Text className='tag tag-notice'>
                    {NOTICE_TYPE_MAP[notice.noticeType]}
                  </Text>
                  <Text className='notice-time'>
                    {dayjs(notice.publishedAt).format('MM-DD HH:mm')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 快捷入口 */}
      <View className='card'>
        <View className='card-title'>快捷入口</View>
        {quickActions.length === 0 ? (
          <View className='empty'>暂无快捷入口</View>
        ) : (
          <View className='action-grid'>
            {quickActions.map((action) => (
              <View
                key={action.code}
                className='action-item'
                hoverClass='action-item--hover'
                hoverStayTime={50}
                onClick={() => handleQuickAction(action.code)}
              >
                {action.label}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
