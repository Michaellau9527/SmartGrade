import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getWorkbench,
  WorkbenchResponse,
  WorkbenchTodo,
  WorkbenchNotice,
  NoticeType
} from '../../api/workbench';
import { mockLogin } from '../../api/auth';
import { getStudents } from '../../api/student';
import { getLeaves, LeaveListItem } from '../../api/leave';
import { useUserStore } from '../../store/user';
import {
  USE_HOMEROOM_MOCK,
  MOCK_HOMEROOM_USER,
  MOCK_HOMEROOM_WORKBENCH,
  getWelcomeGreeting
} from '../../utils/mock';
import './index.scss';

/* ============================================================
 * 类型 & 常量
 * ============================================================ */

interface NoticeCardItem {
  icon: string;
  title: string;
  desc: string;
  time: string;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
}

interface TimelineEntry {
  title: string;
  desc: string;
  dotColor: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const NOTICE_TYPE_LABEL: Record<NoticeType, string> = {
  NOTICE: '通知',
  URGENT: '紧急',
  MEETING: '会议',
  HOLIDAY: '假期',
  TEACHING: '教学'
};

/** 今日动态 mock（用户指定） */
const TIMELINE_MOCK: TimelineEntry[] = [
  { title: '张三 已离校', desc: '14:30 · 离校原因: 家长接送', dotColor: '#22c55e', icon: '🏠', iconBg: '#f0fdf4', iconColor: '#22c55e' },
  { title: '李四 提交请假申请', desc: '13:20 · 病假', dotColor: '#f59e0b', icon: '🕐', iconBg: '#fff7ed', iconColor: '#f59e0b' },
  { title: '王五 请假申请已通过', desc: '11:15', dotColor: '#1677ff', icon: '✅', iconBg: '#eff6ff', iconColor: '#1677ff' }
];

/** 通知 & 待办兜底 mock */
const NOTICE_FALLBACK: NoticeCardItem[] = [
  { icon: '🔔', title: '请假审批提醒', desc: '张三的请假申请等待审批', time: '10分钟前', bg: '#eff6ff', border: '#dbeafe', iconBg: '#dbeafe', iconColor: '#1677ff' },
  { icon: '📢', title: '年级通知', desc: '关于期中考试安排通知', time: '今天 08:30', bg: '#fff7ed', border: '#ffedd5', iconBg: '#ffedd5', iconColor: '#f59e0b' }
];

/* ============================================================
 * 工具函数
 * ============================================================ */

function readToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch {
    return '';
  }
}

function formatHHmm(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return formatHHmm(iso);
}

/* ============================================================
 * 组件
 * ============================================================ */

export default function Workbench() {
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'logging' | 'success' | 'failed'>('idle');
  const [statusBarHeight, setStatusBarHeight] = useState(20);

  const setUserInfo = useUserStore((s) => s.setUserInfo);
  const teacherName = useUserStore((s) => s.teacherName);

  const [studentCount, setStudentCount] = useState(0);
  const [leavesForStats, setLeavesForStats] = useState<LeaveListItem[]>([]);

  /* —— 状态栏高度（自定义导航栏） —— */
  useEffect(() => {
    try {
      const info = Taro.getSystemInfoSync();
      setStatusBarHeight(info.statusBarHeight || 20);
    } catch { /* 静默 */ }
  }, []);

  /* —— 通知 & 待办列表 —— */
  const noticeItems = useMemo<NoticeCardItem[]>(() => {
    if (!data) return NOTICE_FALLBACK;
    const items: NoticeCardItem[] = [];

    (data.todos ?? []).slice(0, 2).forEach((t: WorkbenchTodo) => {
      const isUrgent = t.status === 'PENDING' || t.status === 'OVERDUE';
      items.push({
        icon: t.type === 'LEAVE_APPROVE' ? '🔔' : t.type === 'DORM_CHECK' ? '⚠️' : '📋',
        title: t.type === 'LEAVE_APPROVE' ? '请假审批提醒' : t.type === 'DORM_CHECK' ? '宿舍检查提醒' : '待办事项',
        desc: t.title,
        time: timeAgo(t.dueAt || undefined),
        bg: isUrgent ? '#fff7ed' : '#eff6ff',
        border: isUrgent ? '#ffedd5' : '#dbeafe',
        iconBg: isUrgent ? '#ffedd5' : '#dbeafe',
        iconColor: isUrgent ? '#f59e0b' : '#1677ff'
      });
    });

    (data.recentNotices ?? []).slice(0, 1).forEach((n: WorkbenchNotice) => {
      const isUrgent = n.noticeType === 'URGENT';
      items.push({
        icon: isUrgent ? '⚠️' : '📢',
        title: `${NOTICE_TYPE_LABEL[n.noticeType]}通知`,
        desc: n.title,
        time: timeAgo(n.publishedAt),
        bg: isUrgent ? '#fef2f2' : '#eff6ff',
        border: isUrgent ? '#fee2e2' : '#dbeafe',
        iconBg: isUrgent ? '#fee2e2' : '#dbeafe',
        iconColor: isUrgent ? '#ef4444' : '#1677ff'
      });
    });

    return items.length > 0 ? items.slice(0, 3) : NOTICE_FALLBACK;
  }, [data]);

  /* —— 登录 —— */
  const ensureLogin = useCallback(async () => {
    if (USE_HOMEROOM_MOCK) {
      setLoginStatus('logging');
      try {
        const result = await mockLogin('T001');
        setUserInfo({
          token: result.token,
          teacherNo: MOCK_HOMEROOM_USER.teacherNo,
          teacherName: MOCK_HOMEROOM_USER.teacherName,
          roles: MOCK_HOMEROOM_USER.roles,
          permissions: MOCK_HOMEROOM_USER.permissions
        });
        setLoginStatus('success');
        return true;
      } catch (err) {
        console.error('[Workbench] Mock 登录失败，降级:', err);
        setUserInfo({
          token: MOCK_HOMEROOM_USER.token,
          teacherNo: MOCK_HOMEROOM_USER.teacherNo,
          teacherName: MOCK_HOMEROOM_USER.teacherName,
          roles: MOCK_HOMEROOM_USER.roles,
          permissions: MOCK_HOMEROOM_USER.permissions
        });
        setLoginStatus('success');
        return true;
      }
    }
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

  /* —— 工作台数据 —— */
  const fetchData = useCallback(async () => {
    if (USE_HOMEROOM_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      setData(MOCK_HOMEROOM_WORKBENCH);
      setLoading(false);
      return;
    }
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

  /* —— 班主任面板实时统计 —— */
  const fetchHeadmasterStats = useCallback(async () => {
    try {
      const [students, leaves] = await Promise.allSettled([
        getStudents(),
        getLeaves()
      ]);
      if (students.status === 'fulfilled') setStudentCount(students.value.length);
      if (leaves.status === 'fulfilled') setLeavesForStats(leaves.value);
    } catch { /* 静默降级 */ }
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await ensureLogin();
      if (ok) {
        await Promise.all([fetchData(), fetchHeadmasterStats()]);
      }
    })();
  }, [ensureLogin, fetchData, fetchHeadmasterStats]);

  Taro.usePullDownRefresh(() => {
    (async () => {
      if (!readToken()) {
        const ok = await ensureLogin();
        if (!ok) {
          Taro.stopPullDownRefresh();
          return;
        }
      }
      await fetchData().finally(() => Taro.stopPullDownRefresh());
    })();
  });

  /* —— 状态分支 —— */
  if (loginStatus === 'logging') {
    return <View className='workbench workbench--state'><View className='state-tip'>登录中…</View></View>;
  }
  if (loginStatus === 'failed') {
    return (
      <View className='workbench workbench--state'>
        <View className='state-tip'>登录失败</View>
        <View className='state-tip state-error'>{error}</View>
      </View>
    );
  }
  if (loading && !data) {
    return <View className='workbench workbench--state'><View className='state-tip'>加载中…</View></View>;
  }

  /* —— 计算概览数据 —— */
  const greeting = getWelcomeGreeting();
  const displayName = teacherName || '刘老师';
  const totalStudents = studentCount > 0
    ? studentCount
    : (data?.studentStatusSummary.totalStudents ?? 0);
  const leaveCount = leavesForStats.length > 0
    ? leavesForStats.filter(l => ['PENDING', 'APPROVED', 'LEFT'].includes(l.status)).length
    : (data?.studentStatusSummary.studentsLeaving ?? 0);
  const pendingCount = leavesForStats.length > 0
    ? leavesForStats.filter(l => l.status === 'PENDING').length
    : (data?.studentStatusSummary.dormAbnormal ?? 0);

  return (
    <View className='workbench'>
      {/* ====== 顶部蓝色渐变 Header ====== */}
      <View
        className='hero-header'
        style={{ paddingTop: `${statusBarHeight}px` }}
      >
        <View className='hero-header__nav'>
          <Text className='hero-header__brand'>SmartGrade</Text>
        </View>

        <View className='hero-header__profile'>
          <View className='hero-header__avatar'>
            <Text className='hero-header__avatar-text'>{displayName.charAt(0)}</Text>
          </View>
          <View className='hero-header__info'>
            <Text className='hero-header__greeting'>{greeting} 👋</Text>
            <Text className='hero-header__role'>高一 (11) 班班主任</Text>
          </View>
        </View>

        <Text className='hero-header__quote'>"用心教育，用爱陪伴每一个学生成长"</Text>
      </View>

      {/* ====== 主内容区 ====== */}
      <View className='content'>
        {/* —— 今日概览 —— */}
        <View className='overview-card'>
          <View className='card-head'>
            <Text className='card-head__title'>今日概览</Text>
            <Text
              className='card-head__more'
              onClick={() => Taro.switchTab({ url: '/pages/student/index' })}
            >
              查看全部 ›
            </Text>
          </View>
          <View className='overview-grid'>
            <View
              className='overview-cell overview-cell--blue'
              onClick={() => Taro.switchTab({ url: '/pages/student/index' })}
            >
              <View className='overview-cell__body'>
                <Text className='overview-cell__num'>{totalStudents}</Text>
                <Text className='overview-cell__label'>学生总数</Text>
              </View>
              <View className='overview-cell__icon overview-cell__icon--blue'>
                <Text>👥</Text>
              </View>
            </View>
            <View
              className='overview-cell overview-cell--green'
              onClick={() => Taro.switchTab({ url: '/pages/leave/index' })}
            >
              <View className='overview-cell__body'>
                <Text className='overview-cell__num'>{leaveCount}</Text>
                <Text className='overview-cell__label'>请假人数</Text>
              </View>
              <View className='overview-cell__icon overview-cell__icon--green'>
                <Text>⏰</Text>
              </View>
            </View>
            <View
              className='overview-cell overview-cell--orange'
              onClick={() => Taro.switchTab({ url: '/pages/leave/index' })}
            >
              <View className='overview-cell__body'>
                <Text className='overview-cell__num'>{pendingCount}</Text>
                <Text className='overview-cell__label'>待审批</Text>
              </View>
              <View className='overview-cell__icon overview-cell__icon--orange'>
                <Text>📝</Text>
              </View>
            </View>
            <View className='overview-cell overview-cell--red'>
              <View className='overview-cell__body'>
                <Text className='overview-cell__num'>0</Text>
                <Text className='overview-cell__label'>异常情况</Text>
              </View>
              <View className='overview-cell__icon overview-cell__icon--red'>
                <Text>⚠️</Text>
              </View>
            </View>
          </View>
        </View>

        {/* —— 通知 & 待办 —— */}
        <View className='notice-card'>
          <View className='card-head'>
            <Text className='card-head__title'>通知 &amp; 待办</Text>
          </View>
          <View className='notice-list'>
            {noticeItems.map((item, i) => (
              <View
                key={i}
                className='notice-item'
                style={{ backgroundColor: item.bg, borderColor: item.border }}
              >
                <View
                  className='notice-item__icon'
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  <Text>{item.icon}</Text>
                </View>
                <View className='notice-item__body'>
                  <Text className='notice-item__title'>{item.title}</Text>
                  <Text className='notice-item__desc'>{item.desc}</Text>
                  <Text className='notice-item__time'>{item.time}</Text>
                </View>
                <Text className='notice-item__arrow'>›</Text>
              </View>
            ))}
          </View>
        </View>

        {/* —— 今日动态 —— */}
        <View className='timeline-card'>
          <View className='card-head'>
            <Text className='card-head__title'>今日动态</Text>
            <Text className='card-head__more'>查看更多 ›</Text>
          </View>
          <View className='timeline'>
            {TIMELINE_MOCK.map((item, i) => (
              <View key={i} className='timeline-item'>
                <View
                  className='timeline-item__dot'
                  style={{
                    backgroundColor: `${item.dotColor}33`,
                    borderColor: item.dotColor
                  }}
                />
                <View
                  className='timeline-item__icon'
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  <Text>{item.icon}</Text>
                </View>
                <View className='timeline-item__body'>
                  <Text className='timeline-item__title'>{item.title}</Text>
                  <Text className='timeline-item__desc'>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 底部占位 */}
      <View className='workbench__spacer' />
    </View>
  );
}
