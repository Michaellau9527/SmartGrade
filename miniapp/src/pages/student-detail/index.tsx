import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import AppIcon from '../../components/AppIcon';
import {
  getStudentDetail,
  updateStudent,
  deleteStudent,
  StudentDetail,
  StudentStatus
} from '../../api/student';
import { getLeaves, LeaveListItem } from '../../api/leave';
import { ensureLoggedIn, useSessionRestore } from '../../utils/session';
import './index.scss';

/* ============================================================
 * 常量 — Stitch 设计规范色值
 * ============================================================ */

const STATUS_MAP: Record<StudentStatus, { label: string; tagClass: string }> = {
  ON_CAMPUS: { label: '在校', tagClass: 'tag--green' },
  OUT_OF_SCHOOL: { label: '离校', tagClass: 'tag--orange' },
  GRADUATED: { label: '已毕业', tagClass: 'tag--gray' },
  TRANSFERRED: { label: '已转学', tagClass: 'tag--gray' }
};

const GENDER_MAP: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他' };
const BOARDING_MAP: Record<string, string> = { DAY_STUDENT: '走读', BOARDING: '住宿' };
const LEAVE_TYPE_MAP: Record<string, string> = { SICK: '病假', PERSONAL: '事假', OTHER: '其他' };

const LEAVE_STATUS: Record<string, string> = {
  PENDING: '待审批', APPROVED: '已批准', LEFT: '已离校',
  RETURNED: '已返校', REJECTED: '已驳回', CLOSED: '已销假',
  DRAFT: '草稿', CANCELLED: '已取消'
};

const LEAVE_STATUS_TAG: Record<string, string> = {
  PENDING: 'tag--orange',
  APPROVED: 'tag--green',
  LEFT: 'tag--orange',
  RETURNED: 'tag--green',
  REJECTED: 'tag--red',
  CLOSED: 'tag--gray',
  DRAFT: 'tag--gray',
  CANCELLED: 'tag--gray'
};

/* ============================================================
 * 页面组件
 * ============================================================ */

export default function StudentDetailPage() {
  useSessionRestore();
  const router = useRouter();
  const studentId = router.params.id || '';

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [leaves, setLeaves] = useState<LeaveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑表单状态
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editGenderIdx, setEditGenderIdx] = useState(0);
  const [editBoarding, setEditBoarding] = useState('');
  const [editBoardingIdx, setEditBoardingIdx] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editDormNo, setEditDormNo] = useState('');
  const [editBedNo, setEditBedNo] = useState('');

  /** 计算当前请假状态覆盖 */
  const leaveStatus = (() => {
    const active = leaves.find((l) =>
      l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'LEFT'
    );
    if (!active) return null;
    if (active.status === 'LEFT') return { label: '已离校', tagClass: 'tag--orange' };
    return { label: '请假中', tagClass: 'tag--orange' };
  })();

  /* —— 数据获取（保持原有接口调用） —— */
  const fetchAll = useCallback(async () => {
    if (!studentId) { setError('缺少学生 ID'); setLoading(false); return; }
    try {
      // 先确保登录完成，避免 token 未就绪就发请求导致 401
      await ensureLoggedIn();

      const [data, leaveData] = await Promise.all([
        getStudentDetail(studentId),
        getLeaves({ studentId }).catch(() => [] as LeaveListItem[])
      ]);
      setDetail(data);
      setLeaves(leaveData);
      setEditName(data.name);
      setEditGender(data.gender);
      setEditGenderIdx(data.gender === 'FEMALE' ? 1 : 0);
      setEditBoarding(data.boardingType);
      setEditBoardingIdx(data.boardingType === 'BOARDING' ? 1 : 0);
      setEditPhone(data.phone || '');
      setEditDormNo(data.dormName || '');
      setEditBedNo(data.bedNo || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* —— 保存编辑 —— */
  const handleSave = useCallback(async () => {
    if (!editName.trim()) { Taro.showToast({ title: '姓名不能为空', icon: 'none' }); return; }
    const c = await Taro.showModal({
      title: '确认修改', content: '确认修改学生信息？', confirmText: '确认', cancelText: '取消'
    });
    if (!c.confirm) return;
    setSaving(true);
    try {
      await updateStudent(studentId, {
        name: editName.trim(), gender: editGender, boardingType: editBoarding,
        phone: editPhone || undefined,
        dorm_room_id: editBoarding === 'BOARDING' ? editDormNo || undefined : undefined,
        bedNo: editBoarding === 'BOARDING' ? editBedNo || undefined : undefined
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setEditing(false);
      await fetchAll();
    } catch (err) {
      Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' });
    } finally { setSaving(false); }
  }, [studentId, editName, editGender, editBoarding, editPhone, editDormNo, editBedNo, fetchAll]);

  /* —— 删除学生 —— */
  const handleDelete = useCallback(async () => {
    const r = await Taro.showModal({
      title: '确认删除',
      content: `确定删除 ${detail?.name || '该学生'} 吗？\n删除后数据无法恢复。`,
      confirmText: '删除', confirmColor: '#EF4444'
    });
    if (!r.confirm) return;
    try {
      await deleteStudent(studentId);
      Taro.showToast({ title: '已删除', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      Taro.showToast({ title: `失败：${err instanceof Error ? err.message : err}`, icon: 'none' });
    }
  }, [studentId, detail]);

  /* —— 更多操作（ActionSheet） —— */
  const handleMoreActions = useCallback(() => {
    Taro.showActionSheet({
      itemList: ['删除学生'],
      itemColor: '#EF4444',
    }).then((res) => {
      if (res.tapIndex === 0) handleDelete();
    }).catch(() => { /* 用户取消 */ });
  }, [handleDelete]);

  /* —— 跳转发起请假 —— */
  const handleApplyLeave = () => {
    Taro.setStorageSync('presetLeaveStudentId', studentId);
    Taro.switchTab({ url: '/pages/leave/index' });
  };

  /* —— 加载状态 —— */
  if (loading) return <View className='sd-page'><View className='state-tip'>加载中…</View></View>;
  if (error) return <View className='sd-page'><View className='state-tip'>加载失败：{error}</View></View>;
  if (!detail) return <View className='sd-page'><View className='state-tip'>暂无数据</View></View>;

  const status = STATUS_MAP[detail.currentStatus];
  const isBoarding = detail.boardingType === 'BOARDING';
  const recentLeaves = leaves.slice(0, 5);

  /* ============================================================
   * 编辑模式
   * ============================================================ */
  if (editing) {
    return (
      <View className='sd-page'>
        <View className='edit-form'>
          {/* 基本信息 */}
          <View className='edit-section'>
            <View className='edit-section-title'>编辑学生信息</View>
            <View className='edit-form-item'>
              <Text className='edit-form-label'>姓名</Text>
              <Input className='edit-form-input' value={editName} onInput={(e) => setEditName(e.detail.value)} />
            </View>
            <View className='edit-form-item'>
              <Text className='edit-form-label'>性别</Text>
              <Picker mode='selector' range={['男', '女']} value={editGenderIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditGenderIdx(i); setEditGender(i === 0 ? 'MALE' : 'FEMALE'); }}>
                <View className='edit-form-picker'>{editGenderIdx === 0 ? '男' : '女'}</View>
              </Picker>
            </View>
            <View className='edit-form-item'>
              <Text className='edit-form-label'>学生类型</Text>
              <Picker mode='selector' range={['走读', '住宿']} value={editBoardingIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditBoardingIdx(i); setEditBoarding(i === 0 ? 'DAY_STUDENT' : 'BOARDING'); }}>
                <View className='edit-form-picker'>{editBoardingIdx === 0 ? '走读' : '住宿'}</View>
              </Picker>
            </View>
            <View className='edit-form-item'>
              <Text className='edit-form-label'>联系电话</Text>
              <Input className='edit-form-input' type='number' value={editPhone} onInput={(e) => setEditPhone(e.detail.value)} />
            </View>
          </View>

          {/* 住宿信息（仅住宿生显示） */}
          {editBoarding === 'BOARDING' && (
            <View className='edit-section'>
              <View className='edit-section-title'>住宿信息</View>
              <View className='edit-form-item'>
                <Text className='edit-form-label'>宿舍</Text>
                <Input className='edit-form-input' value={editDormNo} onInput={(e) => setEditDormNo(e.detail.value)} />
              </View>
              <View className='edit-form-item'>
                <Text className='edit-form-label'>床位号</Text>
                <Input className='edit-form-input' value={editBedNo} onInput={(e) => setEditBedNo(e.detail.value)} />
              </View>
            </View>
          )}

          {/* 提交按钮 */}
          <View className='edit-submit-bar'>
            <View className='edit-submit-btn edit-submit-btn--cancel' onClick={() => setEditing(false)}>取消</View>
            <View
              className={`edit-submit-btn edit-submit-btn--primary ${saving ? 'is-disabled' : ''}`}
              onClick={() => { if (!saving) handleSave(); }}
            >
              {saving ? '保存中…' : '确认保存'}
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ============================================================
   * 查看模式 — Stitch 设计风格
   * ============================================================ */
  return (
    <View className='sd-page'>

      {/* ===== 一、学生信息头部卡片 ===== */}
      <View className='header-card'>
        <View className='header-avatar'>
          <AppIcon name='user' size={32} color='#1677ff' />
        </View>
        <View className='header-info'>
          <View className='header-name-row'>
            <Text className='header-name'>{detail.name}</Text>
            <View className={`tag ${isBoarding ? 'tag--blue' : 'tag--gray'}`}>
              {BOARDING_MAP[detail.boardingType]}
            </View>
            <View className={`tag ${leaveStatus ? leaveStatus.tagClass : status.tagClass}`}>
              {leaveStatus ? leaveStatus.label : status.label}
            </View>
          </View>
          <View className='header-meta'>
            <Text className='header-meta-text'>学号: {detail.studentNo}</Text>
            <Text className='header-meta-text'>{detail.className}</Text>
          </View>
        </View>
      </View>

      {/* ===== 二、学生基础信息 ===== */}
      <View className='info-card'>
        <View className='card-title-row'>
          <AppIcon name='users' size={18} color='#1677ff' />
          <Text className='card-title'>基本信息</Text>
        </View>
        <View className='info-grid'>
          <View className='info-cell'>
            <Text className='info-label'>姓名</Text>
            <Text className='info-value'>{detail.name}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>学号</Text>
            <Text className='info-value'>{detail.studentNo}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>性别</Text>
            <Text className='info-value'>{GENDER_MAP[detail.gender] || detail.gender}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>班级</Text>
            <Text className='info-value'>{detail.className || '-'}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>年级</Text>
            <Text className='info-value'>{detail.gradeName || '-'}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>住宿类型</Text>
            <Text className='info-value'>{BOARDING_MAP[detail.boardingType]}</Text>
          </View>
        </View>
      </View>

      {/* ===== 三、宿舍信息 ===== */}
      <View className='info-card'>
        <View className='card-title-row'>
          <AppIcon name='bed' size={18} color='#1677ff' />
          <Text className='card-title'>宿舍信息</Text>
        </View>
        {isBoarding ? (
          <View className='info-grid'>
            <View className='info-cell'>
              <Text className='info-label'>宿舍</Text>
              <Text className='info-value'>{detail.dormName || '-'}</Text>
            </View>
            <View className='info-cell'>
              <Text className='info-label'>床位号</Text>
              <Text className='info-value'>{detail.bedNo || '-'}</Text>
            </View>
          </View>
        ) : (
          <View className='info-single'>
            <Text className='info-label'>住宿类型</Text>
            <Text className='info-value'>走读</Text>
          </View>
        )}
      </View>

      {/* ===== 四、联系方式 ===== */}
      <View className='info-card'>
        <View className='card-title-row'>
          <AppIcon name='bell' size={18} color='#1677ff' />
          <Text className='card-title'>联系方式</Text>
        </View>
        <View className='info-single'>
          <Text className='info-label'>联系电话</Text>
          <Text className='info-value'>{detail.phone || '未填写'}</Text>
        </View>
      </View>

      {/* ===== 五、请假记录 ===== */}
      <View className='info-card'>
        <View className='card-title-row'>
          <AppIcon name='calendar' size={18} color='#1677ff' />
          <Text className='card-title'>请假记录</Text>
        </View>
        {recentLeaves.length === 0 ? (
          <View className='empty-state'>
            <AppIcon name='calendar' size={40} color='#ccc' />
            <Text className='empty-text'>暂无请假记录</Text>
          </View>
        ) : (
          recentLeaves.map((l) => {
            const ls = LEAVE_STATUS[l.status] || l.status;
            const statusTag = LEAVE_STATUS_TAG[l.status] || 'tag--gray';
            return (
              <View key={l.id} className='leave-item'>
                <View className='leave-item-top'>
                  <Text className='leave-date'>{dayjs(l.startAt).format('MM-DD')}</Text>
                  <Text className='leave-type'>{LEAVE_TYPE_MAP[l.leaveType] || l.leaveType}</Text>
                  <View className={`tag tag--sm ${statusTag}`}>{ls}</View>
                </View>
                <Text className='leave-reason'>{l.reason || '无备注'}</Text>
                <Text className='leave-time'>{dayjs(l.startAt).format('YYYY-MM-DD HH:mm')} 离校</Text>
              </View>
            );
          })
        )}
      </View>

      <View className='sd-spacer' />

      {/* ===== 六、底部固定操作栏 ===== */}
      <View className='action-bar'>
        <View className='action-btn action-btn--secondary' onClick={() => setEditing(true)}>
          <AppIcon name='edit' size={18} color='#666' />
          <Text className='action-btn-text'>编辑</Text>
        </View>
        <View className='action-btn action-btn--primary' onClick={handleApplyLeave}>
          <AppIcon name='file-check' size={18} color='#fff' />
          <Text className='action-btn-text action-btn-text--white'>发起请假</Text>
        </View>
        <View className='action-btn action-btn--secondary' onClick={handleMoreActions}>
          <AppIcon name='list-todo' size={18} color='#666' />
          <Text className='action-btn-text'>更多</Text>
        </View>
      </View>
    </View>
  );
}
