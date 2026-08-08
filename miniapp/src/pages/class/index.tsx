import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { getWorkbench, WorkbenchResponse } from '../../api/workbench';
import { useUserStore } from '../../store/user';
import { resolveAffiliation } from '../../utils/role';
import {
  USE_HOMEROOM_MOCK,
  MOCK_HOMEROOM_WORKBENCH
} from '../../utils/mock';
import DashboardCard from '../../components/DashboardCard';
import Timeline, { TimelineItem } from '../../components/Timeline';
import './index.scss';

/** 班主任 mock 班级动态 */
const CLASS_TIMELINE_MOCK: TimelineItem[] = [
  {
    id: 'ct-1',
    title: '王同学已返校',
    desc: '原请假 2 天，今天 08:12 完成入校登记',
    time: new Date(Date.now() - 2 * 60000).toISOString(),
    type: 'SUCCESS',
    tag: '入校'
  },
  {
    id: 'ct-2',
    title: '李同学家长来电请假',
    desc: '身体不适，申请 1 天病假',
    time: new Date(Date.now() - 60 * 60000).toISOString(),
    type: 'WARNING',
    tag: '请假'
  },
  {
    id: 'ct-3',
    title: '宿舍 305 晚归提醒',
    desc: '张同学 22:40 后入校，已通知宿管',
    time: new Date(Date.now() - 180 * 60000).toISOString(),
    type: 'DANGER',
    tag: '异常'
  },
  {
    id: 'ct-4',
    title: '本周班级量化分第一',
    desc: '卫生、纪律、考勤综合 98 分',
    time: new Date(Date.now() - 1440 * 60000).toISOString(),
    type: 'INFO',
    tag: '班级'
  }
];

export default function ClassManage() {
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const teacherName = useUserStore((s) => s.teacherName);
  const teacherNo = useUserStore((s) => s.teacherNo);
  const roles = useUserStore((s) => s.roles);
  const affiliation = resolveAffiliation(roles, teacherNo);

  useEffect(() => {
    (async () => {
      if (USE_HOMEROOM_MOCK) {
        await new Promise((r) => setTimeout(r, 200));
        setData(MOCK_HOMEROOM_WORKBENCH);
        setLoading(false);
        return;
      }
      try {
        const res = await getWorkbench();
        setData(res);
      } catch (err) {
        console.error('[Class] 数据加载失败:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View className='class-page'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  if (!data) {
    return (
      <View className='class-page'>
        <View className='state-tip'>暂无数据</View>
      </View>
    );
  }

  const today = data.today;

  return (
    <View className='class-page'>
      {/* 班级信息卡 */}
      <View className='class-header'>
        <View className='class-header__name'>{affiliation}</View>
        <View className='class-header__sub'>
          <Text>班主任：{teacherName}</Text>
          <Text> · </Text>
          <Text>第 {today.semesterWeek || 1} 周</Text>
        </View>
      </View>

      {/* 班级概览 */}
      <DashboardCard
        title='班级概览'
        subtitle={today.isSchoolDay ? '教学日' : '非教学日'}
        accent='primary'
        hero={{
          value: data.studentStatusSummary.totalStudents,
          label: '学生总数',
          theme: 'primary',
          suffix: '人'
        }}
        statusList={[
          { label: '在校', value: data.studentStatusSummary.onCampus, color: 'green' },
          { label: '请假', value: data.studentStatusSummary.studentsLeaving, color: 'yellow' },
          { label: '异常', value: data.studentStatusSummary.dormAbnormal, color: 'red' }
        ]}
      />

      {/* 班级动态 */}
      <Timeline
        title='班级动态'
        items={USE_HOMEROOM_MOCK ? CLASS_TIMELINE_MOCK : []}
      />

      {/* 底部快捷入口 */}
      <View className='class-actions'>
        <View
          className='class-action-btn'
          onClick={() => Taro.switchTab({ url: '/pages/student/index' })}
        >
          <View className='class-action-btn__icon'>
            <AppIcon name='users' size={24} color='#1677ff' />
          </View>
          <Text className='class-action-btn__label'>学生管理</Text>
        </View>
        <View
          className='class-action-btn'
          onClick={() => Taro.switchTab({ url: '/pages/leave/index' })}
        >
          <View className='class-action-btn__icon'>
            <AppIcon name='clipboard-check' size={24} color='#f59e0b' />
          </View>
          <Text className='class-action-btn__label'>请假审批</Text>
        </View>
      </View>
    </View>
  );
}
