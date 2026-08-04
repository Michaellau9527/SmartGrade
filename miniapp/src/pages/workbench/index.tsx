import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  getWorkbench,
  NoticeType,
  TodoStatus,
  WorkbenchResponse
} from '../../api/workbench';
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

export default function Workbench() {
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const teacherName = useUserStore((s) => s.teacherName);
  const token = useUserStore((s) => s.token);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWorkbench();
      setData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  Taro.usePullDownRefresh(() => {
    if (!token) {
      Taro.stopPullDownRefresh();
      return;
    }
    fetchData().finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  // 未登录（mock 登录进行中）
  if (!token) {
    return (
      <View className='workbench'>
        <View className='state-tip'>登录中…</View>
      </View>
    );
  }

  // 首次加载中
  if (loading && !data) {
    return (
      <View className='workbench'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 首次加载失败且无缓存数据
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

  const { today, studentStatusSummary, todos, recentNotices, quickActions } = data;

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
          学生状态 · 共 {studentStatusSummary.totalStudents} 人
        </View>
        <View className='stat-grid'>
          <View className='stat-item'>
            <View className='stat-num stat-num-primary'>{studentStatusSummary.onCampus}</View>
            <View className='stat-label'>在校</View>
          </View>
          <View className='stat-item'>
            <View className='stat-num'>{studentStatusSummary.outOfSchool}</View>
            <View className='stat-label'>离校</View>
          </View>
          <View className='stat-item'>
            <View className='stat-num stat-num-warning'>{studentStatusSummary.studentsLeaving}</View>
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
              <View key={action.code} className='action-item'>
                {action.label}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
