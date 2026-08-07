import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  getStudentDetail,
  updateStudent,
  deleteStudent,
  StudentDetail,
  StudentStatus
} from '../../api/student';
import { getLeaves, LeaveListItem } from '../../api/leave';
import './index.scss';

/* ===== 常量 ===== */
const STATUS_MAP: Record<StudentStatus, { label: string; className: string; icon: string }> = {
  ON_CAMPUS: { label: '在校', className: 'tag-on-campus', icon: '🟢' },
  OUT_OF_SCHOOL: { label: '离校', className: 'tag-out-of-school', icon: '🟠' },
  GRADUATED: { label: '已毕业', className: 'tag-graduated', icon: '⚪' },
  TRANSFERRED: { label: '已转学', className: 'tag-transferred', icon: '⚪' }
};

const GENDER_MAP: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他' };
const BOARDING_MAP: Record<string, string> = { DAY_STUDENT: '走读', BOARDING: '住宿' };
const LEAVE_TYPE_MAP: Record<string, string> = { SICK: '病假', PERSONAL: '事假', OTHER: '其他' };
const LEAVE_STATUS: Record<string, string> = {
  PENDING: '待审批', APPROVED: '已批准', LEFT: '已离校',
  RETURNED: '已返校', REJECTED: '已驳回', CLOSED: '已销假'
};

export default function StudentDetailPage() {
  const router = useRouter();
  const studentId = router.params.id || '';

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [leaves, setLeaves] = useState<LeaveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑表单
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editGenderIdx, setEditGenderIdx] = useState(0);
  const [editBoarding, setEditBoarding] = useState('');
  const [editBoardingIdx, setEditBoardingIdx] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editDormNo, setEditDormNo] = useState('');
  const [editBedNo, setEditBedNo] = useState('');

  /** 计算当前请假状态 */
  const leaveStatus = (() => {
    const active = leaves.find((l) =>
      l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'LEFT'
    );
    if (!active) return null;
    if (active.status === 'LEFT') return { label: '已离校', icon: '🟠', className: 'leave-left' };
    return { label: '请假中', icon: '🟡', className: 'leave-pending' };
  })();

  const fetchAll = useCallback(async () => {
    if (!studentId) { setError('缺少学生 ID'); setLoading(false); return; }
    try {
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

  /** 保存编辑 — 带二次确认 */
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

  /** 删除学生 */
  const handleDelete = useCallback(async () => {
    const r = await Taro.showModal({
      title: '确认删除', content: `确定删除 ${detail?.name || '该学生'} 吗？\n删除后数据无法恢复。`,
      confirmText: '删除', confirmColor: '#ff4d4f'
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

  /** 跳转发起请假 — 用 storage 传参（tabBar 不支持 URL 参数） */
  const handleApplyLeave = () => {
    Taro.setStorageSync('presetLeaveStudentId', studentId);
    Taro.switchTab({ url: '/pages/leave/index' });
  };

  if (loading) return <View className='sd-page'><View className='state-tip'>加载中…</View></View>;
  if (error) return <View className='sd-page'><View className='state-tip'>加载失败：{error}</View></View>;
  if (!detail) return <View className='sd-page'><View className='state-tip'>暂无数据</View></View>;

  const status = STATUS_MAP[detail.currentStatus];
  const isBoarding = detail.boardingType === 'BOARDING';
  const recentLeaves = leaves.slice(0, 5);

  // ===== 编辑模式 =====
  if (editing) {
    return (
      <View className='sd-page'>
        <View className='edit-form'>
          <View className='section'>
            <View className='section-title'>编辑学生信息</View>
            <View className='form-item'><Text className='form-label'>姓名</Text><Input className='form-input' value={editName} onInput={(e) => setEditName(e.detail.value)} /></View>
            <View className='form-item'><Text className='form-label'>性别</Text>
              <Picker mode='selector' range={['男', '女']} value={editGenderIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditGenderIdx(i); setEditGender(i === 0 ? 'MALE' : 'FEMALE'); }}>
                <View className='form-picker'>{editGenderIdx === 0 ? '男' : '女'}</View>
              </Picker>
            </View>
            <View className='form-item'><Text className='form-label'>学生类型</Text>
              <Picker mode='selector' range={['走读', '住宿']} value={editBoardingIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditBoardingIdx(i); setEditBoarding(i === 0 ? 'DAY_STUDENT' : 'BOARDING'); }}>
                <View className='form-picker'>{editBoardingIdx === 0 ? '走读' : '住宿'}</View>
              </Picker>
            </View>
            <View className='form-item'><Text className='form-label'>联系电话</Text><Input className='form-input' type='number' value={editPhone} onInput={(e) => setEditPhone(e.detail.value)} /></View>
          </View>
          {editBoarding === 'BOARDING' && (
            <View className='section'>
              <View className='section-title'>住宿信息</View>
              <View className='form-item'><Text className='form-label'>宿舍</Text><Input className='form-input' value={editDormNo} onInput={(e) => setEditDormNo(e.detail.value)} /></View>
              <View className='form-item'><Text className='form-label'>床位号</Text><Input className='form-input' value={editBedNo} onInput={(e) => setEditBedNo(e.detail.value)} /></View>
            </View>
          )}
          <View className='submit-bar'>
            <View className='submit-btn cancel' onClick={() => setEditing(false)}>取消</View>
            <View className={`submit-btn primary ${saving ? 'disabled' : ''}`} onClick={() => { if (!saving) handleSave(); }}>
              {saving ? '保存中…' : '确认保存'}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ===== 查看模式 =====
  return (
    <View className='sd-page'>
      {/* 学生身份卡 */}
      <View className='id-card'>
        <View className='id-top'>
          <View className='id-name'>{detail.name}</View>
          <View className='id-status'>
            <Text className='id-status-icon'>
              {leaveStatus ? leaveStatus.icon : status.icon}
            </Text>
            <Text className={`id-status-text ${leaveStatus?.className || ''}`}>
              {leaveStatus ? leaveStatus.label : status.label}
            </Text>
          </View>
        </View>
        <View className='id-meta'>
          <Text className='id-no'>学号 {detail.studentNo}</Text>
          <Text className='id-sep'>·</Text>
          <Text className='id-class'>{detail.className}</Text>
        </View>
      </View>

      {/* 基本信息 */}
      <View className='card'>
        <View className='card-title'>基本信息</View>
        <View className='ir'><Text className='ir-l'>性别</Text><Text className='ir-v'>{GENDER_MAP[detail.gender] || detail.gender}</Text></View>
        <View className='ir'><Text className='ir-l'>住宿类型</Text><Text className='ir-v'>{BOARDING_MAP[detail.boardingType]}</Text></View>
        {isBoarding && detail.dormName && (
          <View className='ir'><Text className='ir-l'>宿舍</Text><Text className='ir-v'>{detail.dormName}{detail.bedNo ? ` ${detail.bedNo}床` : ''}</Text></View>
        )}
        <View className='ir'><Text className='ir-l'>联系方式</Text><Text className='ir-v'>{detail.phone || '未填写'}</Text></View>
      </View>

      {/* 快捷操作 */}
      <View className='card'>
        <View className='card-title'>快捷操作</View>
        <View className='actions'>
          <View className='act-card act-card--primary' onClick={handleApplyLeave}>
            <Text className='act-icon'>📝</Text>
            <View>
              <Text className='act-label'>发起请假</Text>
              <Text className='act-sub'>替该学生提交请假申请</Text>
            </View>
            <Text className='act-arrow'>›</Text>
          </View>
          <View className='act-card' onClick={() => setEditing(true)}>
            <Text className='act-icon'>✏️</Text>
            <View>
              <Text className='act-label'>编辑学生</Text>
              <Text className='act-sub'>修改基本信息或住宿信息</Text>
            </View>
            <Text className='act-arrow'>›</Text>
          </View>
        </View>
      </View>

      {/* 请假记录 */}
      <View className='card'>
        <View className='card-title'>请假记录</View>
        {recentLeaves.length === 0 ? (
          <View className='empty-sm'>暂无请假记录</View>
        ) : (
          recentLeaves.map((l) => {
            const ls = LEAVE_STATUS[l.status] || l.status;
            const timeStr = dayjs(l.startAt).format('MM-DD HH:mm');
            const methodMatch = l.reason?.match(/离校方式:(\S+)/);
            const method = methodMatch ? methodMatch[1] : null;
            return (
              <View key={l.id} className='leave-item'>
                <View className='li-top'>
                  <Text className='li-date'>{dayjs(l.startAt).format('MM-DD')}</Text>
                  <Text className='li-type'>{LEAVE_TYPE_MAP[l.leaveType] || l.leaveType}</Text>
                  {method && <Text className='li-method'>{method}</Text>}
                  <Text className={`li-status li-${l.status.toLowerCase()}`}>{ls}</Text>
                </View>
                <View className='li-meta'>{timeStr} 离校</View>
              </View>
            );
          })
        )}
      </View>

      {/* 危险操作 */}
      <View className='card card--danger'>
        <View className='card-title'>危险操作</View>
        <View className='danger-btn' onClick={handleDelete}>
          <Text>🗑</Text>
          <Text>删除学生</Text>
          <Text>›</Text>
        </View>
      </View>

      <View className='sd-spacer' />
    </View>
  );
}
