import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState, useCallback } from 'react';
import {
  getStudentDetail,
  updateStudent,
  deleteStudent,
  StudentDetail,
  StudentStatus
} from '../../api/student';
import './index.scss';

const STATUS_MAP: Record<StudentStatus, { label: string; className: string }> = {
  ON_CAMPUS: { label: '在校', className: 'tag-on-campus' },
  OUT_OF_SCHOOL: { label: '离校', className: 'tag-out-of-school' },
  GRADUATED: { label: '已毕业', className: 'tag-graduated' },
  TRANSFERRED: { label: '已转学', className: 'tag-transferred' }
};

const GENDER_MAP: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他' };
const BOARDING_MAP: Record<string, string> = { DAY_STUDENT: '走读', BOARDING: '住宿' };

export default function StudentDetailPage() {
  const router = useRouter();
  const studentId = router.params.id || '';

  const [detail, setDetail] = useState<StudentDetail | null>(null);
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

  const fetchDetail = useCallback(async () => {
    if (!studentId) { setError('缺少学生 ID'); setLoading(false); return; }
    try {
      const data = await getStudentDetail(studentId);
      setDetail(data);
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
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /** 保存编辑 */
  const handleSave = useCallback(async () => {
    if (!editName.trim()) { Taro.showToast({ title: '姓名不能为空', icon: 'none' }); return; }
    setSaving(true);
    try {
      await updateStudent(studentId, {
        name: editName.trim(),
        gender: editGender,
        boardingType: editBoarding,
        phone: editPhone || undefined,
        dorm_room_id: editBoarding === 'BOARDING' ? editDormNo || undefined : undefined,
        bedNo: editBoarding === 'BOARDING' ? editBedNo || undefined : undefined
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setEditing(false);
      await fetchDetail();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Taro.showToast({ title: `保存失败：${msg}`, icon: 'none' });
    } finally {
      setSaving(false);
    }
  }, [studentId, editName, editGender, editBoarding, editPhone, editDormNo, editBedNo, fetchDetail]);

  /** 删除学生 */
  const handleDelete = useCallback(async () => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: `确定删除 ${detail?.name || '该学生'} 吗？\n删除后数据无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f'
    });
    if (!res.confirm) return;
    try {
      await deleteStudent(studentId);
      Taro.showToast({ title: '已删除', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Taro.showToast({ title: `删除失败：${msg}`, icon: 'none' });
    }
  }, [studentId, detail]);

  if (loading) return <View className='student-detail'><View className='state-tip'>加载中…</View></View>;
  if (error) return <View className='student-detail'><View className='state-tip'>加载失败：{error}</View></View>;
  if (!detail) return <View className='student-detail'><View className='state-tip'>暂无数据</View></View>;

  const status = STATUS_MAP[detail.currentStatus];

  return (
    <View className='student-detail'>
      {/* 编辑模式 */}
      {editing ? (
        <View className='edit-form'>
          <View className='section'>
            <View className='section-title'>基础信息</View>
            <View className='form-item'>
              <Text className='form-label'>姓名</Text>
              <Input className='form-input' value={editName} onInput={(e) => setEditName(e.detail.value)} />
            </View>
            <View className='form-item'>
              <Text className='form-label'>性别</Text>
              <Picker mode='selector' range={['男', '女']} value={editGenderIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditGenderIdx(i); setEditGender(i === 0 ? 'MALE' : 'FEMALE'); }}>
                <View className='form-picker'>{editGenderIdx === 0 ? '男' : '女'}</View>
              </Picker>
            </View>
            <View className='form-item'>
              <Text className='form-label'>学生类型</Text>
              <Picker mode='selector' range={['走读', '住宿']} value={editBoardingIdx}
                onChange={(e) => { const i = Number(e.detail.value); setEditBoardingIdx(i); setEditBoarding(i === 0 ? 'DAY_STUDENT' : 'BOARDING'); }}>
                <View className='form-picker'>{editBoardingIdx === 0 ? '走读' : '住宿'}</View>
              </Picker>
            </View>
            <View className='form-item'>
              <Text className='form-label'>联系电话</Text>
              <Input className='form-input' type='number' value={editPhone} onInput={(e) => setEditPhone(e.detail.value)} />
            </View>
          </View>
          {editBoarding === 'BOARDING' && (
            <View className='section'>
              <View className='section-title'>住宿信息</View>
              <View className='form-item'>
                <Text className='form-label'>宿舍</Text>
                <Input className='form-input' value={editDormNo} onInput={(e) => setEditDormNo(e.detail.value)} />
              </View>
              <View className='form-item'>
                <Text className='form-label'>床位号</Text>
                <Input className='form-input' value={editBedNo} onInput={(e) => setEditBedNo(e.detail.value)} />
              </View>
            </View>
          )}
          <View className='submit-bar'>
            <View className='submit-btn cancel' onClick={() => setEditing(false)}>取消</View>
            <View className={`submit-btn primary ${saving ? 'disabled' : ''}`} onClick={() => { if (!saving) handleSave(); }}>
              {saving ? '保存中…' : '保存'}
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* 顶部操作栏 */}
          <View className='detail-actions'>
            <View className='action-btn edit' onClick={() => setEditing(true)}>编辑</View>
            <View className='action-btn delete' onClick={handleDelete}>删除</View>
          </View>

          {/* 基本信息 */}
          <View className='info-card'>
            <View className='info-header'>
              <View className='info-name'>{detail.name}</View>
              <Text className={`tag ${status.className}`}>{status.label}</Text>
            </View>
            <View className='info-row'><Text className='row-label'>学号</Text><Text className='row-value'>{detail.studentNo}</Text></View>
            <View className='info-row'><Text className='row-label'>性别</Text><Text className='row-value'>{GENDER_MAP[detail.gender] || detail.gender}</Text></View>
            <View className='info-row'><Text className='row-label'>年级</Text><Text className='row-value'>{detail.gradeName}</Text></View>
            <View className='info-row'><Text className='row-label'>班级</Text><Text className='row-value'>{detail.className}</Text></View>
            <View className='info-row'><Text className='row-label'>住宿类型</Text><Text className='row-value'>{BOARDING_MAP[detail.boardingType] || detail.boardingType}</Text></View>
          </View>

          {detail.boardingType === 'BOARDING' && (
            <View className='card'>
              <View className='card-title'>住宿信息</View>
              <View className='info-row'><Text className='row-label'>宿舍</Text><Text className='row-value'>{detail.dormName || '-'}</Text></View>
              <View className='info-row'><Text className='row-label'>床位号</Text><Text className='row-value'>{detail.bedNo || '-'}</Text></View>
            </View>
          )}

          <View className='card'>
            <View className='card-title'>联系方式</View>
            <View className='info-row'><Text className='row-label'>联系电话</Text><Text className='row-value'>{detail.phone || '-'}</Text></View>
          </View>

          <View className='card'>
            <View className='card-title'>入学信息</View>
            <View className='info-row'><Text className='row-label'>入学日期</Text><Text className='row-value'>{detail.enrolledAt ? detail.enrolledAt.split('T')[0] : '-'}</Text></View>
          </View>
        </>
      )}
    </View>
  );
}
