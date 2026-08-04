import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { getStudentDetail, StudentDetail, StudentStatus } from '../../api/student';
import './index.scss';

const STATUS_MAP: Record<StudentStatus, { label: string; className: string }> = {
  ON_CAMPUS: { label: '在校', className: 'tag-on-campus' },
  OUT_OF_SCHOOL: { label: '离校', className: 'tag-out-of-school' },
  GRADUATED: { label: '已毕业', className: 'tag-graduated' },
  TRANSFERRED: { label: '已转学', className: 'tag-transferred' }
};

const GENDER_MAP: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他'
};

const BOARDING_MAP: Record<string, string> = {
  DAY_STUDENT: '走读',
  BOARDING: '住宿'
};

export default function StudentDetailPage() {
  const router = useRouter();
  const studentId = router.params.id || '';

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) {
      setError('缺少学生 ID');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getStudentDetail(studentId);
        setDetail(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) {
    return (
      <View className='student-detail'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  if (error) {
    return (
      <View className='student-detail'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View className='student-detail'>
        <View className='state-tip'>暂无数据</View>
      </View>
    );
  }

  const status = STATUS_MAP[detail.currentStatus];

  return (
    <View className='student-detail'>
      {/* 顶部学生信息卡 */}
      <View className='info-card'>
        <View className='info-header'>
          <View className='info-name'>{detail.name}</View>
          <Text className={`tag ${status.className}`}>{status.label}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>学号</Text>
          <Text className='row-value'>{detail.studentNo}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>性别</Text>
          <Text className='row-value'>{GENDER_MAP[detail.gender] || detail.gender}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>年级</Text>
          <Text className='row-value'>{detail.gradeName}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>班级</Text>
          <Text className='row-value'>{detail.className}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>住宿类型</Text>
          <Text className='row-value'>{BOARDING_MAP[detail.boardingType] || detail.boardingType}</Text>
        </View>
        <View className='info-row'>
          <Text className='row-label'>当前位置</Text>
          <Text className='row-value'>{detail.currentLocation || '-'}</Text>
        </View>
      </View>

      {/* 住宿信息 */}
      {detail.boardingType === 'BOARDING' && (
        <View className='card'>
          <View className='card-title'>住宿信息</View>
          <View className='info-row'>
            <Text className='row-label'>宿舍</Text>
            <Text className='row-value'>{detail.dormName || '-'}</Text>
          </View>
          <View className='info-row'>
            <Text className='row-label'>床位号</Text>
            <Text className='row-value'>{detail.bedNo || '-'}</Text>
          </View>
        </View>
      )}

      {/* 联系方式 */}
      <View className='card'>
        <View className='card-title'>联系方式</View>
        <View className='info-row'>
          <Text className='row-label'>联系电话</Text>
          <Text className='row-value'>{detail.phone || '-'}</Text>
        </View>
      </View>

      {/* 入学信息 */}
      <View className='card'>
        <View className='card-title'>入学信息</View>
        <View className='info-row'>
          <Text className='row-label'>入学日期</Text>
          <Text className='row-value'>{detail.enrolledAt ? detail.enrolledAt.split('T')[0] : '-'}</Text>
        </View>
      </View>
    </View>
  );
}
