import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  approveLeave,
  getLeaves,
  LeaveListItem,
  LeaveStatus,
  LeaveType,
  QueryLeaveParams,
  rejectLeave
} from '../../api/leave';
import { useUserStore } from '../../store/user';
import './index.scss';

/** 状态 -> 文案 & 样式 */
interface StatusMeta {
  label: string;
  className: string;
}

const STATUS_MAP: Record<LeaveStatus, StatusMeta> = {
  DRAFT: { label: '草稿', className: 'tag-draft' },
  PENDING: { label: '待审批', className: 'tag-pending' },
  APPROVED: { label: '已批准', className: 'tag-approved' },
  REJECTED: { label: '已驳回', className: 'tag-rejected' },
  LEFT: { label: '已离校', className: 'tag-left' },
  RETURNED: { label: '已返校', className: 'tag-returned' },
  CLOSED: { label: '已销假', className: 'tag-closed' },
  CANCELLED: { label: '已取消', className: 'tag-cancelled' }
};

/** 请假类型 -> 中文 */
const LEAVE_TYPE_MAP: Record<LeaveType, string> = {
  SICK: '病假',
  PERSONAL: '事假',
  OTHER: '其他'
};

type TabKey = 'ALL' | LeaveStatus;

interface TabItem {
  key: TabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待审批' },
  { key: 'APPROVED', label: '已批准' },
  { key: 'LEFT', label: '已离校' },
  { key: 'CLOSED', label: '已销假' }
];

export default function Leave() {
  const [list, setList] = useState<LeaveListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const teacherName = useUserStore((s) => s.teacherName);

  const fetchList = useCallback(async (status: TabKey) => {
    setLoading(true);
    setError('');
    try {
      const params: QueryLeaveParams = {};
      if (status !== 'ALL') {
        params.status = status;
      }
      const res = await getLeaves(params);
      setList(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Leave] 列表加载失败:', msg);
      setError(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(activeTab);
  }, [activeTab, fetchList]);

  usePullDownRefresh(() => {
    fetchList(activeTab).finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const markActioning = useCallback((id: string, on: boolean) => {
    setActioningIds((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  /** 通过审批 */
  const handleApprove = useCallback(
    async (id: string) => {
      const confirm = await Taro.showModal({
        title: '审批确认',
        content: '确定通过该请假申请吗？',
        confirmText: '通过',
        cancelText: '取消'
      });
      if (!confirm.confirm) return;

      markActioning(id, true);
      try {
        await approveLeave(id);
        Taro.showToast({ title: '已通过', icon: 'success' });
        await fetchList(activeTab);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Taro.showToast({ title: `操作失败：${msg}`, icon: 'none' });
      } finally {
        markActioning(id, false);
      }
    },
    [activeTab, fetchList, markActioning]
  );

  /** 驳回审批，需要填写原因 */
  const handleReject = useCallback(
    async (id: string) => {
      const modal = await Taro.showModal({
        title: '驳回原因',
        editable: true,
        placeholderText: '请输入驳回原因',
        confirmText: '驳回',
        cancelText: '取消'
      });
      if (!modal.confirm) return;
      const reason = (modal.content || '').trim();
      if (!reason) {
        Taro.showToast({ title: '请输入驳回原因', icon: 'none' });
        return;
      }

      markActioning(id, true);
      try {
        await rejectLeave(id, reason);
        Taro.showToast({ title: '已驳回', icon: 'success' });
        await fetchList(activeTab);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Taro.showToast({ title: `操作失败：${msg}`, icon: 'none' });
      } finally {
        markActioning(id, false);
      }
    },
    [activeTab, fetchList, markActioning]
  );

  // 首次加载中
  if (loading && list.length === 0) {
    return (
      <View className='leave'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 加载失败且无缓存
  if (error && list.length === 0) {
    return (
      <View className='leave'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  return (
    <View className='leave'>
      {/* 顶部标题栏 */}
      <View className='header'>
        <View className='header-title'>请假管理</View>
        <View className='header-sub'>{teacherName || '老师'}，请及时处理待审批申请</View>
      </View>

      {/* 状态筛选 Tab */}
      <ScrollView className='tab-bar' scrollX scrollWithAnimation>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <View
              key={tab.key}
              className={`tab-item ${active ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </View>
          );
        })}
      </ScrollView>

      {/* 请假列表 */}
      {list.length === 0 ? (
        <View className='empty'>暂无请假记录</View>
      ) : (
        <View className='leave-list'>
          {list.map((item) => {
            const status = STATUS_MAP[item.status];
            const isPending = item.status === 'PENDING';
            const actioning = actioningIds.has(item.id);
            return (
              <View key={item.id} className='leave-card'>
                <View className='card-header'>
                  <View className='student-info'>
                    <Text className='student-name'>{item.studentName}</Text>
                    <Text className='student-class'>{item.className}</Text>
                  </View>
                  <Text className={`tag ${status.className}`}>{status.label}</Text>
                </View>

                <View className='card-row'>
                  <Text className='row-label'>请假类型</Text>
                  <Text className='row-value'>{LEAVE_TYPE_MAP[item.leaveType]}</Text>
                </View>

                {item.reason ? (
                  <View className='card-row'>
                    <Text className='row-label'>请假原因</Text>
                    <Text className='row-value reason-text'>{item.reason}</Text>
                  </View>
                ) : null}

                <View className='card-row'>
                  <Text className='row-label'>时间范围</Text>
                  <Text className='row-value'>
                    {dayjs(item.startAt).format('MM-DD HH:mm')}
                    {' ~ '}
                    {dayjs(item.endAt).format('MM-DD HH:mm')}
                  </Text>
                </View>

                {isPending ? (
                  <View className='action-row'>
                    <View
                      className={`action-btn btn-approve ${actioning ? 'btn-disabled' : ''}`}
                      onClick={() => {
                        if (!actioning) handleApprove(item.id);
                      }}
                    >
                      通过
                    </View>
                    <View
                      className={`action-btn btn-reject ${actioning ? 'btn-disabled' : ''}`}
                      onClick={() => {
                        if (!actioning) handleReject(item.id);
                      }}
                    >
                      驳回
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
