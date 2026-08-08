import { View, Text, ScrollView, Picker, Textarea } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useCallback, useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import AppIcon from '../../components/AppIcon';
import {
  approveLeave,
  confirmLeft,
  confirmReturned,
  createLeave,
  getLeaves,
  LeaveListItem,
  LeaveStatus,
  LeaveType,
  QueryLeaveParams,
  rejectLeave
} from '../../api/leave';
import { getStudents, StudentListItem } from '../../api/student';
import { useUserStore } from '../../store/user';
import './index.scss';

/** 状态映射 */
interface StatusMeta { label: string; className: string; }
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

const LEAVE_TYPE_MAP: Record<LeaveType, string> = {
  SICK: '病假', PERSONAL: '事假', OTHER: '其他'
};

/** 离校方式 */
type LeaveMethod = 'SELF' | 'PARENT_PICKUP';
const LEAVE_METHOD_OPTIONS = [
  { value: 'SELF' as LeaveMethod, label: '自行' },
  { value: 'PARENT_PICKUP' as LeaveMethod, label: '家长接' }
];

/** 离校时间选项：06:30-22:20 每5分钟 */
function buildTimeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 6 && m < 30) continue;
      if (h === 22 && m > 20) continue;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}
const TIME_OPTIONS = buildTimeOptions();

type TabKey = 'ALL' | LeaveStatus;
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待审批' },
  { key: 'APPROVED', label: '已批准' },
  { key: 'LEFT', label: '已离校' }
];

export default function Leave() {
  // tabBar 不支持 URL 参数，改用 storage 传递
  const presetStudentId = Taro.getStorageSync('presetLeaveStudentId') || '';
  const [list, setList] = useState<LeaveListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [classCount, setClassCount] = useState(0);

  const teacherName = useUserStore((s) => s.teacherName);

  // ===== 创建表单 =====
  const [form, setForm] = useState({
    studentId: '', studentIndex: -1,
    leaveType: 'SICK' as LeaveType, leaveTypeIdx: 0,
    leaveTime: '08:00', leaveTimeIdx: TIME_OPTIONS.indexOf('08:00'),
    leaveMethod: 'SELF' as LeaveMethod, leaveMethodIdx: 0,
    remark: '',
    date: dayjs().format('YYYY-MM-DD')
  });

  /** 统计：班级人数 + 当前请假人数（PENDING/APPROVED/LEFT） */
  const leaveCount = useMemo(() => {
    return list.filter((l) =>
      l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'LEFT'
    ).length;
  }, [list]);

  const pendingCount = useMemo(() =>
    list.filter((l) => l.status === 'PENDING').length,
  [list]);

  /** 筛选后的列表 */
  const filteredList = useMemo(() => {
    let result = list;
    if (activeTab !== 'ALL') {
      result = result.filter((l) => l.status === activeTab);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter((l) =>
        l.studentName.toLowerCase().includes(kw) ||
        l.studentNo?.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [list, activeTab, keyword]);

  /** 拉取班级人数 */
  const fetchClassCount = useCallback(async () => {
    try {
      const all = await getStudents();
      setClassCount(all.length);
    } catch { /* 静默降级 */ }
  }, []);

  /** 拉取请假列表 */
  const fetchList = useCallback(async (tab?: TabKey) => {
    setLoading(true);
    setError('');
    const t = tab ?? activeTab;
    try {
      const params: QueryLeaveParams = {};
      if (t !== 'ALL') params.status = t;
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
  }, [activeTab]);

  useEffect(() => { fetchClassCount(); fetchList(); }, []);
  useEffect(() => { fetchList(activeTab); }, [activeTab]);
  // 从学生详情跳转过来时自动打开请假弹窗
  useEffect(() => {
    if (presetStudentId) { openCreate(); }
  }, [presetStudentId]);

  usePullDownRefresh(() => {
    Promise.all([fetchClassCount(), fetchList()]).finally(() =>
      Taro.stopPullDownRefresh()
    );
  });

  const markActioning = (id: string, on: boolean) => {
    setActioningIds((prev) => {
      const next = new Set(prev); on ? next.add(id) : next.delete(id); return next;
    });
  };

  const handleApprove = useCallback(async (id: string) => {
    const c = await Taro.showModal({ title: '审批确认', content: '确定通过该请假申请吗？', confirmText: '通过', cancelText: '取消' });
    if (!c.confirm) return;
    markActioning(id, true);
    try { await approveLeave(id); Taro.showToast({ title: '已通过', icon: 'success' }); await fetchList(); }
    catch (err) { Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' }); }
    finally { markActioning(id, false); }
  }, [fetchList]);

  const handleReject = useCallback(async (id: string) => {
    const m = await Taro.showModal({ title: '驳回原因', editable: true, placeholderText: '请输入驳回原因', confirmText: '驳回', cancelText: '取消' });
    if (!m.confirm) return;
    const reason = (m.content || '').trim();
    if (!reason) { Taro.showToast({ title: '请输入驳回原因', icon: 'none' }); return; }
    markActioning(id, true);
    try { await rejectLeave(id, reason); Taro.showToast({ title: '已驳回', icon: 'success' }); await fetchList(); }
    catch (err) { Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' }); }
    finally { markActioning(id, false); }
  }, [fetchList]);

  const handleConfirmReturn = useCallback(async (id: string, name: string) => {
    const c = await Taro.showModal({
      title: '确认返校', content: `确认 ${name} 已返校？`, confirmText: '确认返校', cancelText: '取消'
    });
    if (!c.confirm) return;
    markActioning(id, true);
    try { await confirmReturned(id); Taro.showToast({ title: '已确认返校', icon: 'success' }); await fetchList(); }
    catch (err) { Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' }); }
    finally { markActioning(id, false); }
  }, [fetchList]);

  const handleConfirmLeft = useCallback(async (id: string, name: string) => {
    const c = await Taro.showModal({
      title: '确认离校', content: `确认 ${name} 已离校？`, confirmText: '确认离校', cancelText: '取消'
    });
    if (!c.confirm) return;
    markActioning(id, true);
    try { await confirmLeft(id); Taro.showToast({ title: '已确认离校', icon: 'success' }); await fetchList(); }
    catch (err) { Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' }); }
    finally { markActioning(id, false); }
  }, [fetchList]);

  /** 打开创建弹窗 */
  const openCreate = useCallback(async () => {
    setShowCreate(true);
    const today = dayjs().format('YYYY-MM-DD');
    const t8Idx = TIME_OPTIONS.indexOf('08:00');
    setForm((p) => ({
      ...p, date: today,
      leaveTimeIdx: t8Idx >= 0 ? t8Idx : 0,
      leaveTime: t8Idx >= 0 ? '08:00' : TIME_OPTIONS[0],
      studentId: '', studentIndex: -1
    }));
    if (students.length === 0) {
      try {
        const s = await getStudents();
        const onCampus = s.filter((x) => x.currentStatus === 'ON_CAMPUS');
        setStudents(onCampus);
        // 如果带了 studentId 参数，自动选中
        if (presetStudentId) {
          const idx = onCampus.findIndex((x) => x.id === presetStudentId);
          if (idx >= 0) {
            setForm((p) => ({ ...p, studentId: presetStudentId, studentIndex: idx }));
          }
          Taro.removeStorageSync('presetLeaveStudentId');
        }
      } catch { Taro.showToast({ title: '加载学生失败', icon: 'none' }); }
    } else if (presetStudentId) {
      const idx = students.findIndex((x) => x.id === presetStudentId);
      if (idx >= 0) {
        setForm((p) => ({ ...p, studentId: presetStudentId, studentIndex: idx }));
      }
      Taro.removeStorageSync('presetLeaveStudentId');
    }
  }, [students, presetStudentId]);

  /** 提交创建 */
  const handleCreateSubmit = useCallback(async () => {
    if (!form.studentId) { Taro.showToast({ title: '请选择学生', icon: 'none' }); return; }
    const startAt = `${form.date}T${form.leaveTime}:00`;
    setSubmitting(true);
    try {
      const note = `离校方式:${LEAVE_METHOD_OPTIONS[form.leaveMethodIdx].label}${form.remark ? ' | 备注:' + form.remark : ''}`;
      await createLeave({
        studentId: form.studentId,
        leaveType: form.leaveType,
        leaveReasonType: (form.leaveType === 'SICK' ? 'ILLNESS' : form.leaveType === 'PERSONAL' ? 'PERSONAL' : 'OTHER') as any,
        reason: note,
        startAt,
        endAt: startAt
      });
      Taro.showToast({ title: '提交成功', icon: 'success' });
      setShowCreate(false);
      setForm((p) => ({ ...p, studentId: '', studentIndex: -1, remark: '' }));
      await fetchList();
    } catch (err) {
      Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' });
    } finally { setSubmitting(false); }
  }, [form, fetchList]);

  if (loading && list.length === 0) {
    return <View className='leave'><View className='state-tip'>加载中…</View></View>;
  }

  return (
    <View className='leave'>
      {/* ===== 统计卡 ===== */}
      <View className='stat-row'>
        <View className='stat-card'>
          <Text className='stat-num'>{classCount}</Text>
          <Text className='stat-label'>班级人数</Text>
        </View>
        <View className='stat-card stat-card--warn'>
          <Text className='stat-num'>{leaveCount}</Text>
          <Text className='stat-label'>当前请假</Text>
          {pendingCount > 0 && <Text className='stat-badge'>{pendingCount} 待审批</Text>}
        </View>
      </View>

      {/* ===== 搜索 + 新增 ===== */}
      <View className='action-row'>
        <View className='search-box'>
          <AppIcon name='search' size={18} color='#94a3b8' className='search-icon' />
          <Textarea
            className='search-input'
            placeholder='搜索学生姓名 / 学号'
            value={keyword}
            onInput={(e: any) => setKeyword(e.detail.value)}
            maxlength={20}
            autoHeight
          />
        </View>
        <View className='add-btn' onClick={openCreate}>+ 请假</View>
      </View>

      {/* ===== Tab ===== */}
      <ScrollView className='tab-scroll' scrollX>
        <View className='tab-row'>
          {TABS.map((tab) => (
            <View
              key={tab.key}
              className={`tab-chip ${tab.key === activeTab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.key === 'PENDING' && pendingCount > 0 ? `${tab.label} ${pendingCount}` : tab.label}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ===== 列表 ===== */}
      {filteredList.length === 0 ? (
        <View className='empty'>暂无请假记录</View>
      ) : (
        <View className='leave-list'>
          {filteredList.map((item) => {
            const st = STATUS_MAP[item.status];
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isLeft = item.status === 'LEFT';
            const actioning = actioningIds.has(item.id);
            // 离校方式提取（临时：从 reason 中解析）
            const methodMatch = item.reason?.match(/离校方式:(\S+)/);
            const leaveMethod = methodMatch ? methodMatch[1] : null;
            const remark = item.reason?.replace(/离校方式:\S+\s*\|?\s*备注:?/, '').trim() || '';

            return (
              <View key={item.id} className='leave-card'>
                <View className='card-top'>
                  <View className='card-left'>
                    <View className='card-name'>{item.studentName}</View>
                    <View className='card-class'>{item.className}</View>
                  </View>
                  <View className='card-tags'>
                    <Text className={`ltag ltag-type`}>{LEAVE_TYPE_MAP[item.leaveType]}</Text>
                    <Text className={`ltag ${st.className}`}>{st.label}</Text>
                  </View>
                </View>

                <View className='card-info'>
                  <View className='ci-row'>
                    <Text className='ci-label'>离校</Text>
                    <Text className='ci-value'>{dayjs(item.startAt).format('MM-DD HH:mm')}</Text>
                  </View>
                  {leaveMethod && (
                    <View className='ci-row'>
                      <Text className='ci-label'>方式</Text>
                      <Text className='ci-value'>{leaveMethod}</Text>
                    </View>
                  )}
                  {remark && (
                    <View className='ci-row'>
                      <Text className='ci-label'>备注</Text>
                      <Text className='ci-value ci-remark'>{remark}</Text>
                    </View>
                  )}
                </View>

                {/* 操作按钮 */}
                <View className='card-actions'>
                  {isPending && (
                    <>
                      <View className={`act-btn act-approve ${actioning ? 'act-disabled' : ''}`}
                        onClick={() => { if (!actioning) handleApprove(item.id); }}>通过</View>
                      <View className={`act-btn act-reject ${actioning ? 'act-disabled' : ''}`}
                        onClick={() => { if (!actioning) handleReject(item.id); }}>驳回</View>
                    </>
                  )}
                  {isApproved && (
                    <View className={`act-btn act-warn ${actioning ? 'act-disabled' : ''}`}
                      onClick={() => { if (!actioning) handleConfirmLeft(item.id, item.studentName); }}>
                      确认离校
                    </View>
                  )}
                  {isLeft && (
                    <View className={`act-btn act-primary ${actioning ? 'act-disabled' : ''}`}
                      onClick={() => { if (!actioning) handleConfirmReturn(item.id, item.studentName); }}>
                      确认返校
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ===== 创建弹窗 ===== */}
      {showCreate && (
        <View className='create-overlay' onClick={() => setShowCreate(false)}>
          <View className='create-sheet' onClick={(e: any) => e.stopPropagation()}>
            <View className='create-header'>
              <Text className='create-title'>新增请假</Text>
              <View className='create-close' onClick={() => setShowCreate(false)}>
                <AppIcon name='close' size={18} color='#94a3b8' />
              </View>
            </View>

            <ScrollView className='create-body' scrollY>
              {/* 学生 */}
              <View className='form-item'>
                <Text className='form-label'>学生</Text>
                <Picker mode='selector' range={students.map((s) => `${s.name}（${s.studentNo}）`)} value={form.studentIndex}
                  onChange={(e) => {
                    const i = Number(e.detail.value);
                    setForm((p) => ({ ...p, studentIndex: i, studentId: students[i]?.id || '' }));
                  }}>
                  <View className='form-picker'>{form.studentIndex >= 0 ? students[form.studentIndex]?.name : '请选择学生'}</View>
                </Picker>
              </View>

              {/* 请假类型 */}
              <View className='form-item'>
                <Text className='form-label'>请假类型</Text>
                <View className='radio-group'>
                  {['SICK', 'PERSONAL', 'OTHER'].map((t, i) => (
                    <View key={t} className={`radio-chip ${form.leaveTypeIdx === i ? 'radio-active' : ''}`}
                      onClick={() => setForm((p) => ({ ...p, leaveType: t as LeaveType, leaveTypeIdx: i }))}>
                      {['病假', '事假', '其他'][i]}
                    </View>
                  ))}
                </View>
              </View>

              {/* 离校时间 */}
              <View className='form-item'>
                <Text className='form-label'>离校时间</Text>
                <View className='form-row'>
                  <Picker mode='date' value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.detail.value }))}>
                    <View className='form-picker form-picker--date'>{form.date}</View>
                  </Picker>
                  <Picker mode='selector' range={TIME_OPTIONS} value={form.leaveTimeIdx}
                    onChange={(e) => {
                      const i = Number(e.detail.value);
                      setForm((p) => ({ ...p, leaveTimeIdx: i, leaveTime: TIME_OPTIONS[i] }));
                    }}>
                    <View className='form-picker form-picker--time'>{form.leaveTime}</View>
                  </Picker>
                </View>
              </View>

              {/* 离校方式 */}
              <View className='form-item'>
                <Text className='form-label'>离校方式</Text>
                <View className='radio-group'>
                  {LEAVE_METHOD_OPTIONS.map((m, i) => (
                    <View key={m.value} className={`radio-chip ${form.leaveMethodIdx === i ? 'radio-active' : ''}`}
                      onClick={() => setForm((p) => ({ ...p, leaveMethod: m.value, leaveMethodIdx: i }))}>
                      {m.label}
                    </View>
                  ))}
                </View>
              </View>

              {/* 备注 */}
              <View className='form-item'>
                <Text className='form-label'>备注（选填）</Text>
                <Textarea className='form-textarea' placeholder='补充说明'
                  value={form.remark} onInput={(e: any) => setForm((p) => ({ ...p, remark: e.detail.value }))}
                  maxlength={100} autoHeight />
              </View>
            </ScrollView>

            <View className='create-footer'>
              <View className='create-btn cancel' onClick={() => setShowCreate(false)}>取消</View>
              <View className={`create-btn submit ${submitting ? 'disabled' : ''}`}
                onClick={() => { if (!submitting) handleCreateSubmit(); }}>
                {submitting ? '提交中…' : '提交'}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
