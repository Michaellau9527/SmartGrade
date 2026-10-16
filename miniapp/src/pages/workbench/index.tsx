import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon, { AppIconName } from '../../components/AppIcon';
import {
  getWorkbench,
  WorkbenchResponse,
  WorkbenchTodo,
  WorkbenchNotice,
  NoticeType
} from '../../api/workbench';
import { getStudents } from '../../api/student';
import { getLeaves, LeaveListItem } from '../../api/leave';
import { useUserStore } from '../../store/user';
import { ensureLoggedIn, resetSession, getLastLoginError, useSessionRestore } from '../../utils/session';
import { getWelcomeGreeting } from '../../utils/mock';
import './index.scss';

/* ============================================================
 * 类型 & 常量
 * ============================================================ */

interface NoticeCardItem {
  icon: AppIconName;
  title: string;
  desc: string;
  time: string;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  /** 点击跳转目标 (P1 阶段未填,可为空字符串) */
  targetUrl: string;
}

interface TimelineEntry {
  title: string;
  desc: string;
  dotColor: string;
  icon: AppIconName;
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

/** 今日动态：占位学生示例已移除，待真实数据接入后由后端 workbench 接口驱动 */
const TIMELINE_MOCK: TimelineEntry[] = [];

/** 通知 & 待办兜底 mock */
const NOTICE_FALLBACK: NoticeCardItem[] = [
  { icon: 'bell', title: '请假审批提醒', desc: '有新的请假申请等待审批', time: '10分钟前', bg: '#eff6ff', border: '#dbeafe', iconBg: '#dbeafe', iconColor: '#1677ff', targetUrl: '' },
  { icon: 'megaphone', title: '年级通知', desc: '关于期中考试安排通知', time: '今天 08:30', bg: '#fff7ed', border: '#ffedd5', iconBg: '#ffedd5', iconColor: '#f59e0b', targetUrl: '' }
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
  useSessionRestore();
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'logging' | 'success' | 'failed'>('idle');
  const [statusBarHeight, setStatusBarHeight] = useState(20);

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
        icon: t.type === 'LEAVE_APPROVE' ? 'bell' : t.type === 'DORM_CHECK' ? 'alert' : 'list-todo',
        title: t.type === 'LEAVE_APPROVE' ? '请假审批提醒' : t.type === 'DORM_CHECK' ? '宿舍检查提醒' : '待办事项',
        desc: t.title,
        time: timeAgo(t.dueAt || undefined),
        bg: isUrgent ? '#fff7ed' : '#eff6ff',
        border: isUrgent ? '#ffedd5' : '#dbeafe',
        iconBg: isUrgent ? '#ffedd5' : '#dbeafe',
        iconColor: isUrgent ? '#f59e0b' : '#1677ff',
        targetUrl: '/pages/leave/index'
      });
    });

    (data.recentNotices ?? []).slice(0, 1).forEach((n: WorkbenchNotice) => {
      const isUrgent = n.noticeType === 'URGENT';
      items.push({
        icon: isUrgent ? 'alert' : 'megaphone',
        title: `${NOTICE_TYPE_LABEL[n.noticeType]}通知`,
        desc: n.title,
        time: timeAgo(n.publishedAt),
        bg: isUrgent ? '#fef2f2' : '#eff6ff',
        border: isUrgent ? '#fee2e2' : '#dbeafe',
        iconBg: isUrgent ? '#fee2e2' : '#dbeafe',
        iconColor: isUrgent ? '#ef4444' : '#1677ff',
        targetUrl: '/pages/notice/index'
      });
    });

    return items.length > 0 ? items.slice(0, 3) : NOTICE_FALLBACK;
  }, [data]);

  /* —— 登录 —— */
  const ensureLogin = useCallback(async () => {
    const existing = readToken();
    if (existing) {
      setLoginStatus('success');
      return true;
    }
    setLoginStatus('logging');
    try {
      // 真实微信登录（wx.login -> /auth/login），由 session.ts 收敛为全局唯一 Promise
      await ensureLoggedIn();
      if (readToken()) {
        setLoginStatus('success');
        return true;
      }
      throw new Error(getLastLoginError() || '登录态获取失败，请重试');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Workbench] 登录失败:', msg);
      setLoginStatus('failed');
      setError(msg);
      return false;
    }
  }, []);

  /* —— 重新登录：清空会话后重跑现有登录流程 —— */
  const retryLogin = useCallback(() => {
    resetSession();
    void ensureLogin();
  }, [ensureLogin]);

  /* —— 工作台数据 —— */
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
    return (
      <View className='login-page'>
        <View className='login-page__brand'>
          <Text className='login-page__title'>SmartGrade</Text>
          <Text className='login-page__subtitle'>智慧班级管理平台</Text>
        </View>
        <View className='login-page__spinner' />
        <Text className='login-page__status'>正在验证教师身份……</Text>
      </View>
    );
  }
  if (loginStatus === 'failed') {
    const unbound = error.includes('未绑定');
    return (
      <View className='login-page'>
        <View className='login-page__brand'>
          <Text className='login-page__title'>SmartGrade</Text>
          <Text className='login-page__subtitle'>智慧班级管理平台</Text>
        </View>
        {unbound ? (
          <View className='login-page__card'>
            <Text className='login-page__card-title'>当前微信账号尚未绑定教师账号</Text>
            <Text className='login-page__card-line'>SmartGrade 仅面向学校教师使用。</Text>
            <Text className='login-page__card-line'>请联系学校管理员完成教师账号绑定。</Text>
            <Text className='login-page__card-hint'>如果已经完成绑定，请点击“重新登录”。</Text>
          </View>
        ) : (
          <View className='login-page__card'>
            <Text className='login-page__card-title'>登录失败</Text>
            <Text className='login-page__card-line'>请检查网络后重试，或稍后再试。</Text>
          </View>
        )}
        {unbound && (
          <View
            className='login-page__btn login-page__btn--secondary'
            onClick={() => Taro.navigateTo({ url: '/pages/wechat-bind/index' })}
          >
            <Text className='login-page__btn-text'>去绑定微信</Text>
          </View>
        )}
        <View className='login-page__btn' onClick={retryLogin}>
          <Text className='login-page__btn-text'>重新登录</Text>
        </View>
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
            <Text className='hero-header__greeting'>{greeting}</Text>
            <Text className='hero-header__role'>高二 (14) 班班主任</Text>
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
                <AppIcon name='users' size={22} color='#1677ff' />
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
                <AppIcon name='clock-user' size={22} color='#22c55e' />
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
                <AppIcon name='file-check' size={22} color='#f59e0b' />
              </View>
            </View>
            <View className='overview-cell overview-cell--red'>
              <View className='overview-cell__body'>
                <Text className='overview-cell__num'>0</Text>
                <Text className='overview-cell__label'>异常情况</Text>
              </View>
              <View className='overview-cell__icon overview-cell__icon--red'>
                <AppIcon name='alert' size={22} color='#ef4444' />
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
                onClick={() => item.targetUrl && Taro.switchTab({ url: item.targetUrl })}
              >
                <View
                  className='notice-item__icon'
                  style={{ backgroundColor: item.iconBg }}
                >
                  <AppIcon name={item.icon} size={20} color={item.iconColor} />
                </View>
                <View className='notice-item__body'>
                  <Text className='notice-item__main'>{item.title} {item.desc}</Text>
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
            <Text
              className='card-head__more'
              onClick={() => Taro.switchTab({ url: '/pages/notice/index' })}
            >
              查看更多 ›
            </Text>
          </View>
          <View className='timeline'>
            {TIMELINE_MOCK.length > 0 ? (
              TIMELINE_MOCK.map((item, i) => (
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
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <AppIcon name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  <View className='timeline-item__body'>
                    <Text className='timeline-item__title'>{item.title}</Text>
                    <Text className='timeline-item__desc'>{item.desc}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className='timeline-item timeline-item--empty'>
                <View className='timeline-item__body'>
                  <Text className='timeline-item__title'>暂无动态</Text>
                  <Text className='timeline-item__desc'>学生动态将在接入真实数据后显示</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 底部占位 */}
      <View className='workbench__spacer' />
    </View>
  );
}
