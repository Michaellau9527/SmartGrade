import { Drawer, Descriptions, Tag, Divider, Spin, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import StatusTag from '@/components/StatusTag';
import { getStudentDetail } from '@/api/student';
import type { StudentItem } from '@/types/student';

interface StudentDetailProps {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}

const genderMap: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
};

const boardingMap: Record<string, string> = {
  BOARDING: '住校',
  DAY: '走读',
};

function formatDate(val: string): string {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StudentDetail({ studentId, open, onClose }: StudentDetailProps) {
  const { data: student, isLoading } = useQuery<StudentItem>({
    queryKey: ['studentDetail', studentId],
    queryFn: () => getStudentDetail(studentId!),
    enabled: !!studentId,
  });

  return (
    <Drawer title="学生详情" open={open} onClose={onClose} width={640}>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      )}
      {!isLoading && !student && <Empty description="未找到" />}
      {student && (
        <>
          <Descriptions column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="学号">{student.student_no}</Descriptions.Item>
            <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{genderMap[student.gender] || student.gender}</Descriptions.Item>
            <Descriptions.Item label="状态"><StatusTag type="student-status" value={student.status} /></Descriptions.Item>
            <Descriptions.Item label="班级">
              {student.class
                ? `${student.class.grade?.grade_name || ''} ${student.class.class_name}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="住宿类型">
              <Tag color={student.boarding_type === 'BOARDING' ? 'blue' : 'default'}>
                {boardingMap[student.boarding_type] || student.boarding_type}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions title="联系方式" column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="学生电话">{student.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="家长姓名">{student.parent_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="家长电话">{student.parent_phone || '-'}</Descriptions.Item>
          </Descriptions>

          {student.boarding_type === 'BOARDING' && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Descriptions title="宿舍信息" column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
                <Descriptions.Item label="宿舍楼">
                  {student.dorm_room?.building?.building_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="房间号">
                  {student.dorm_room ? `${student.dorm_room.room_no} (第${student.dorm_room.floor}层)` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="床位">{student.bed_no || '-'}</Descriptions.Item>
              </Descriptions>
            </>
          )}

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="创建时间">{formatDate(student.created_at)}</Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Drawer>
  );
}
