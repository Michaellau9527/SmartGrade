import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getWorkbench,
  WorkbenchResponse,
  WorkbenchTodo,
  WorkbenchNotice,
  NoticeType,
  TodoStatus
} from '../../api/workbench';
import { mockLogin } from '../../api/auth';
import { useUserStore } from '../../store/user';
import TeacherHeader from '../../components/TeacherHeader';
import DashboardCard from '../../components/DashboardCard';
import NoticeCard, { NoticeItem } from '../../components/NoticeCard';
import QuickAction, { QuickActionItem } from '../../components/QuickAction';
import Timeline, { TimelineItem } from '../../components/Timeline';
import {
  resolveLayout,
  resolveRoleLabels,
  resolveAffiliation
} from '../../utils/role';
import {
  HEADMASTER_TIMELINE_MOCK,
  GRADE_TASK_PROGRESS_MOCK,
  POLITICAL_ALERT_MOCK,
  SUBJECT_TEACHER_ATTENDANCE_MOCK,
  USE_HOMEROOM_MOCK,
  MOCK_HOMEROOM_USER,
  MOCK_HOMEROOM_WORKBENCH,
  getWelcomeGreeting
} from '../../utils/mock';
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

const NOTICE_TYPE_MAP: Record<NoticeType, string> = {
  NOTICE: '通知',
  URGENT: '紧急',
  MEETING: '会议',
  HOLIDAY: '假期',
  TEACHING: '教学'
};

const TODO_TAG_THEME: Record<TodoStatus, 'warning' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  OVERDUE: 'danger'
};

const TODO_TAG_TEXT: Record<TodoStatus, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  OVERDUE: '已逾期'
};

/** code -> 跳转目标（不识别就 toast） */
const QUICK_ACTION_TARGET: Record<string, string> = {
  'student.read': '/pages/student/index',
  'leave.apply': '/pages/leave/index',
  'leave.create': '/pages/leave/index',
  'class.manage': '/pages/class/index',
  'leave.approve': '/pages/leave/index',
  'notice.publish': '/pages/notice/index',
  'task.assign': '',
  'incident.create': '',
  'dorm.check': '',
  'statistics.read': ''
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

export default function Workbench() {
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<
    'idle' | 'logging' | 'success' | 'failed'
  >('idle');

  const setUserInfo = useUserStore((s) => s.setUserInfo);
  const teacherName = useUserStore((s) => s.teacherName);
  const teacherNo = useUserStore((s) => s.teacherNo);
  const roles = useUserStore((s) => s.roles);

  /** 角色解析：layout / 中文标签 / 所属 */
  const layout = useMemo(() => resolveLayout(roles), [roles]);
  const roleLabels = useMemo(() => resolveRoleLabels(roles), [roles]);
  const affiliation = useMemo(
    () => resolveAffiliation(roles, teacherNo),
    [roles, teacherNo]
  );

  /** 通用跳转：带兜底 */
  const handleQuickAction = useCallback((code: string) => {
    const target = QUICK_ACTION_TARGET[code];
    if (target) {
      Taro.switchTab({ url: target }).catch(() => {
        Taro.navigateTo({ url: target });
      });
    } else {
      Taro.showToast({ title: '该功能即将上线', icon: 'none' });
    }
  }, []);

  /** 通知 / 待办 -> NoticeItem[]（混合排序） */
  const noticeItems: NoticeItem[] = useMemo(() => {
    if (!data) return [];
    const list: NoticeItem[] = [];
    (data.todos ?? []).forEach((t: WorkbenchTodo) => {
      list.push({
        id: `todo-${t.id}`,
        type: 'TODO',
        title: t.title,
        tag: TODO_TAG_TEXT[t.status],
        tagTheme: TODO_TAG_THEME[t.status],
        time: t.dueAt || undefined,
        unread: t.status === 'PENDING' || t.status === 'OVERDUE'
      });
    });
    (data.recentNotices ?? []).forEach((n: WorkbenchNotice) => {
      list.push({
        id: `notice-${n.id}`,
        type: 'NOTICE',
        title: n.title,
        tag: NOTICE_TYPE_MAP[n.noticeType],
        tagTheme:
          n.noticeType === 'URGENT'
            ? 'danger'
            : n.noticeType === 'MEETING'
              ? 'warning'
              : 'primary',
        time: n.publishedAt,
        unread: !n.isRead
      });
    });
    // 倒序：未读优先 + 时间倒序
    return list
      .sort((a, b) => {
        if ((b.unread ? 1 : 0) !== (a.unread ? 1 : 0)) {
          return (b.unread ? 1 : 0) - (a.unread ? 1 : 0);
        }
        return (b.time || '').localeCompare(a.time || '');
      })
      .slice(0, 6);
  }, [data]);

  /** 课任教师：授课班级出勤（mock，等后端接口接入） */
  const subjectAttendance = useMemo(
    () => SUBJECT_TEACHER_ATTENDANCE_MOCK,
    []
  );
  /** 班主任：精简为 3 个核心入口 */
  const headmasterActions: QuickActionItem[] = useMemo(
    () => [
      { code: 'student.read', label: '学生管理', icon: '👨‍🎓', theme: 'primary' },
      { code: 'leave.apply', label: '请假申请', icon: '📝', theme: 'warning', badge: data?.studentStatusSummary.studentsLeaving || 0 },
      { code: 'class.manage', label: '班级管理', icon: '🏫', theme: 'success' }
    ],
    [data]
  );

  const subjectActions: QuickActionItem[] = useMemo(
    () => [
      { code: 'student.read', label: '学生花名册', icon: '👨‍🎓', theme: 'primary' },
      { code: 'leave.approve', label: '请假审批', icon: '📝', theme: 'warning' },
      { code: 'task.assign', label: '布置作业', icon: '📒', theme: 'success' },
      { code: 'statistics.read', label: '成绩录入', icon: '✏️', theme: 'default' },
      { code: 'notice.publish', label: '班级通知', icon: '📢', theme: 'purple' },
      { code: 'class.manage', label: '我的课表', icon: '🗓️', theme: 'default' },
      { code: 'dorm.check', label: '宿舍点名', icon: '🛏️', theme: 'warning' },
      { code: 'incident.create', label: '上报事件', icon: '⚠️', theme: 'danger' }
    ],
    []
  );

  const gradeActions: QuickActionItem[] = useMemo(
    () => [
      // 通知 / 任务中心仅保留 UI 入口，发布逻辑等后端权限系统完成后接入
      { code: 'notice.center', label: '通知中心', icon: '📢', theme: 'primary' },
      { code: 'task.center', label: '任务中心', icon: '📋', theme: 'warning', badge: 3 },
      { code: 'leave.approve', label: '请假审批', icon: '📝', theme: 'success' },
      { code: 'student.read', label: '学生名册', icon: '👨‍🎓', theme: 'default' },
      { code: 'statistics.read', label: '年级报表', icon: '📊', theme: 'default' },
      { code: 'incident.create', label: '事件记录', icon: '⚠️', theme: 'danger' },
      { code: 'class.manage', label: '班级管理', icon: '🏫', theme: 'purple' },
      { code: 'dorm.check', label: '宿舍管理', icon: '🛏️', theme: 'warning' }
    ],
    []
  );

  const politicalActions: QuickActionItem[] = useMemo(
    () => [
      // 通知 / 任务中心仅保留 UI 入口，发布逻辑等后端权限系统完成后接入
      { code: 'notice.center', label: '通知中心', icon: '📢', theme: 'primary' },
      { code: 'task.center', label: '任务中心', icon: '📋', theme: 'warning', badge: 2 },
      { code: 'incident.create', label: '异常上报', icon: '⚠️', theme: 'danger', badge: 5 },
      { code: 'leave.approve', label: '请假审批', icon: '📝', theme: 'success' },
      { code: 'student.read', label: '学生档案', icon: '📁', theme: 'default' },
      { code: 'statistics.read', label: '全校统计', icon: '📊', theme: 'default' },
      { code: 'dorm.check', label: '宿舍管理', icon: '🛏️', theme: 'purple' },
      { code: 'class.manage', label: '班级管理', icon: '🏫', theme: 'warning' }
    ],
    []
  );

  const defaultActions: QuickActionItem[] = useMemo(
    () => [
      { code: 'student.read', label: '学生管理', icon: '👨‍🎓', theme: 'primary' },
      { code: 'leave.create', label: '发起请假', icon: '📝', theme: 'warning' },
      { code: 'notice.publish', label: '通知管理', icon: '📢', theme: 'success' },
      { code: 'task.assign', label: '任务中心', icon: '📋', theme: 'default' }
    ],
    []
  );

  /** 根据 layout 选择动作 */
  const quickActions = useMemo<QuickActionItem[]>(() => {
    switch (layout) {
      case 'headmaster':
        return headmasterActions;
      case 'subjectTeacher':
        return subjectActions;
      case 'gradeDirector':
        return gradeActions;
      case 'political':
        return politicalActions;
      default:
        return defaultActions;
    }
  }, [layout, headmasterActions, subjectActions, gradeActions, politicalActions, defaultActions]);

  /** 任务进度条（年级主任专用） */
  const gradeTaskProgress = useMemo(() => GRADE_TASK_PROGRESS_MOCK, []);

  /** 班级动态（班主任） */
  const classTimeline: TimelineItem[] = useMemo(
    () => HEADMASTER_TIMELINE_MOCK,
    []
  );

  /** 异常提醒（政教） */
  const alertTimeline: TimelineItem[] = useMemo(() => POLITICAL_ALERT_MOCK, []);

  /** 登录 */
  const ensureLogin = useCallback(async () => {
    // Mock 模式：先走真实登录拿 JWT，再用 mock 数据覆盖显示信息
    // 关键：token 必须是真实 JWT，否则其他页面（学生/通知/请假）会 401
    if (USE_HOMEROOM_MOCK) {
      setLoginStatus('logging');
      try {
        const result = await mockLogin('T001');
        // token 用后端真实 JWT，显示名/角色用 mock
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
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Workbench] Mock 模式登录失败，降级到假 token:', msg);
        // 降级：用假 token，首页可用但其他页面 401
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
    // Mock 模式：直接用本地数据
    if (USE_HOMEROOM_MOCK) {
      console.log('[Workbench] Mock 模式，使用本地工作台数据');
      await new Promise((r) => setTimeout(r, 300)); // 模拟加载动画
      setData(MOCK_HOMEROOM_WORKBENCH);
      setLoading(false);
      return;
    }
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

  // 状态分支：登录中 / 登录失败 / 首次加载 / 加载失败
  if (loginStatus === 'logging') {
    return (
      <View className='workbench workbench--state'>
        <View className='state-tip'>登录中…</View>
      </View>
    );
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
    return (
      <View className='workbench workbench--state'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }
  if (error && !data) {
    return (
      <View className='workbench workbench--state'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }
  if (!data) {
    return (
      <View className='workbench workbench--state'>
        <View className='state-tip'>暂无数据</View>
      </View>
    );
  }

  const today = data.today;

  return (
    <View className='workbench'>
      {/* 顶部教师身份卡 */}
      <TeacherHeader
        name={USE_HOMEROOM_MOCK ? `${teacherName}老师` : teacherName}
        roles={roleLabels}
        affiliation={affiliation}
        footer={USE_HOMEROOM_MOCK ? getWelcomeGreeting() + ' · 班级管理工作台' : undefined}
        meta={{
          date: today.date,
          week: formatWeek(today.week),
          semesterWeek: today.semesterWeek
        }}
      />

      {/* ============ 班主任 ============ */}
      {layout === 'headmaster' && (
        <>
          <DashboardCard
            title='今日班级'
            subtitle={today.isSchoolDay ? '教学日 · 实时' : '非教学日'}
            moreText='班级详情'
            onMore={() => Taro.showToast({ title: '班级详情开发中', icon: 'none' })}
            accent='primary'
            hero={{
              value: data?.studentStatusSummary.totalStudents ?? 0,
              label: '班级人数',
              theme: 'primary',
              suffix: '人',
              badge: today.isSchoolDay ? '今日' : '周末'
            }}
            statusList={[
              { label: '在校', value: data?.studentStatusSummary.onCampus ?? 0, color: 'green' },
              { label: '请假', value: data?.studentStatusSummary.studentsLeaving ?? 0, color: 'yellow' },
              { label: '待审批', value: data?.studentStatusSummary.dormAbnormal ?? 0, color: 'red' }
            ]}
          />

          <NoticeCard
            items={noticeItems}
            moreText='全部'
            onMore={() => Taro.switchTab({ url: '/pages/notice/index' }).catch(() => {})}
          />

          <QuickAction
            title='快捷入口'
            items={quickActions}
            columns={4}
          />

          <Timeline
            title='班级动态'
            moreText='查看更多'
            onMore={() => Taro.showToast({ title: '完整动态开发中', icon: 'none' })}
            items={classTimeline}
          />
        </>
      )}

      {/* ============ 课任教师 ============ */}
      {layout === 'subjectTeacher' && (
        <>
          <DashboardCard
            title='今日教学'
            subtitle={`第 ${today.semesterWeek || 1} 周 · ${formatWeek(today.week)}`}
            moreText='详情'
            onMore={() => Taro.showToast({ title: '教学详情开发中', icon: 'none' })}
            accent='success'
            hero={{
              value: subjectAttendance.reduce((sum, r) => sum + r.actual, 0),
              label: '实到',
              theme: 'success',
              suffix: '人',
              badge: '今日'
            }}
            statusList={[
              { label: '应到', value: subjectAttendance.reduce((s, r) => s + r.expected, 0), color: 'blue' },
              { label: '请假', value: subjectAttendance.reduce((s, r) => s + r.leave, 0), color: 'yellow' },
              { label: '缺勤', value: subjectAttendance.reduce((s, r) => s + Math.max(r.expected - r.actual - r.leave, 0), 0), color: 'red' }
            ]}
          />

          {/* 授课班级出勤：等后端接口接入，先用 mock */}
          <View className='card subject-attendance'>
            <View className='subject-attendance__header'>
              <Text className='card-title subject-attendance__title'>授课班级出勤</Text>
              <Text className='subject-attendance__subtitle'>今日</Text>
            </View>
            {subjectAttendance.map((row) => {
              const percent = row.expected > 0
                ? Math.round((row.actual / row.expected) * 100)
                : 0;
              const barColor =
                percent === 100
                  ? '#52c41a'
                  : percent >= 90
                    ? '#1677ff'
                    : '#fa8c16';
              return (
                <View key={row.classId} className='subject-attendance__row'>
                  <View className='subject-attendance__head'>
                    <View className='subject-attendance__main'>
                      <Text className='subject-attendance__name'>{row.className}</Text>
                      <Text className='subject-attendance__grade'>{row.grade}</Text>
                    </View>
                    <View className='subject-attendance__nums'>
                      <Text className='subject-attendance__actual'>{row.actual}</Text>
                      <Text className='subject-attendance__sep'>/</Text>
                      <Text className='subject-attendance__expected'>{row.expected}</Text>
                      <Text
                        className={`subject-attendance__leave ${
                          row.leave > 0 ? 'subject-attendance__leave--has' : ''
                        }`}
                      >
                        请假 {row.leave}
                      </Text>
                    </View>
                  </View>
                  <View className='subject-attendance__bar'>
                    <View
                      className='subject-attendance__bar-fill'
                      style={{ width: `${percent}%`, backgroundColor: barColor }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <NoticeCard
            items={noticeItems}
            moreText='全部'
            onMore={() => Taro.switchTab({ url: '/pages/notice/index' }).catch(() => {})}
          />

          <QuickAction
            title='教学快捷入口'
            items={quickActions}
            columns={4}
            onItemClick={handleQuickAction}
          />
        </>
      )}

      {/* ============ 年级主任 ============ */}
      {layout === 'gradeDirector' && (
        <>
          <DashboardCard
            title='年级总览'
            subtitle={`第 ${today.semesterWeek || 1} 周`}
            moreText='年级报表'
            onMore={() => Taro.showToast({ title: '年级报表开发中', icon: 'none' })}
            accent='purple'
            hero={{
              value: (data?.studentStatusSummary.totalStudents ?? 0) * 6 || 240,
              label: '学生',
              theme: 'primary',
              suffix: '人',
              badge: '全年级'
            }}
            statusList={[
              { label: '在校', value: (data?.studentStatusSummary.onCampus ?? 0) * 6 || 226, color: 'green' },
              { label: '请假', value: (data?.studentStatusSummary.studentsLeaving ?? 0) * 4 || 8, color: 'yellow' },
              { label: '异常', value: (data?.studentStatusSummary.dormAbnormal ?? 0) * 3 || 6, color: 'red' }
            ]}
          />

          <NoticeCard
            items={noticeItems}
            moreText='全部'
            onMore={() => Taro.switchTab({ url: '/pages/notice/index' }).catch(() => {})}
          />

          <QuickAction
            title='通知 / 任务中心'
            items={quickActions}
            columns={4}
          />

          {/* 任务完成情况：mock 进度条 */}
          <View className='card grade-tasks'>
            <View className='card-title'>任务完成情况</View>
            {gradeTaskProgress.map((t) => (
              <View key={t.name} className='grade-tasks__item'>
                <View className='grade-tasks__row'>
                  <Text className='grade-tasks__name'>{t.name}</Text>
                  <Text className='grade-tasks__percent'>{t.percent}%</Text>
                </View>
                <View className='grade-tasks__bar'>
                  <View
                    className='grade-tasks__bar-fill'
                    style={{ width: `${t.percent}%`, backgroundColor: t.color }}
                  />
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ============ 政教老师 ============ */}
      {layout === 'political' && (
        <>
          <DashboardCard
            title='全校数据'
            subtitle={today.isSchoolDay ? '今日教学日' : '今日休息'}
            moreText='详情'
            onMore={() => Taro.showToast({ title: '全校详情开发中', icon: 'none' })}
            accent='danger'
            hero={{
              value: (data?.studentStatusSummary.onCampus ?? 0) * 12 || 1180,
              label: '在校',
              theme: 'primary',
              suffix: '人',
              badge: '全校'
            }}
            statusList={[
              { label: '请假中', value: (data?.studentStatusSummary.studentsLeaving ?? 0) * 8 || 24, color: 'yellow' },
              { label: '未闭环', value: (data?.studentStatusSummary.dormAbnormal ?? 0) * 4 || 12, color: 'red' },
              { label: '异常事件', value: 5, color: 'orange' }
            ]}
          />

          <NoticeCard
            title='通知 & 任务中心'
            items={noticeItems}
            moreText='全部'
            onMore={() => Taro.switchTab({ url: '/pages/notice/index' }).catch(() => {})}
          />

          <QuickAction
            title='通知 / 任务中心'
            items={quickActions}
            columns={4}
          />

          <Timeline
            title='异常情况提醒'
            moreText='查看全部'
            onMore={() => Taro.showToast({ title: '完整记录开发中', icon: 'none' })}
            items={alertTimeline}
          />
        </>
      )}

      {/* ============ 兜底（未识别角色） ============ */}
      {layout === 'default' && (
        <>
          <DashboardCard
            title='今日概览'
            accent='primary'
            hero={{
              value: data?.studentStatusSummary.totalStudents ?? 0,
              label: '学生',
              theme: 'primary',
              suffix: '人'
            }}
            statusList={[
              { label: '在校', value: data?.studentStatusSummary.onCampus ?? 0, color: 'green' },
              { label: '请假', value: data?.studentStatusSummary.studentsLeaving ?? 0, color: 'yellow' }
            ]}
          />
          <NoticeCard items={noticeItems} />
          <QuickAction title='快捷入口' items={quickActions} columns={4} onItemClick={handleQuickAction} />
        </>
      )}

      {/* 底部占位，避免被 tabBar 遮挡 */}
      <View className='workbench__spacer' />
    </View>
  );
}
