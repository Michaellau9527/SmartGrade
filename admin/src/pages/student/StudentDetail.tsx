import { useState } from 'react';
import { Drawer, Descriptions, Tag, Divider, Spin, Empty, Modal, Button, Popconfirm, message, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusTag from '@/components/StatusTag';
import { PermissionButton } from '@/components';
import { PERM } from '@/auth/permission';
import { getStudentDetail } from '@/api/student';
import { getCredentialStatus, issueCredential, revokeCredential } from '@/api/credential';
import { QRCodeSVG } from '@rc-component/qrcode';
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
  const queryClient = useQueryClient();
  const { data: student, isLoading } = useQuery<StudentItem>({
    queryKey: ['studentDetail', studentId],
    queryFn: () => getStudentDetail(studentId!),
    enabled: !!studentId,
  });

  // 身份二维码凭证状态
  const { data: cred } = useQuery({
    queryKey: ['credentialStatus', studentId],
    queryFn: () => getCredentialStatus(studentId!),
    enabled: !!studentId,
  });

  const [qrToken, setQrToken] = useState<string | null>(null);

  const issueMutation = useMutation({
    mutationFn: () => issueCredential(studentId!),
    onSuccess: (data) => {
      setQrToken(data.token);
      void message.success('已签发，二维码仅显示一次，请截图保存');
      void queryClient.invalidateQueries({ queryKey: ['credentialStatus', studentId] });
    },
    onError: () => void message.error('签发失败，请重试'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeCredential(studentId!),
    onSuccess: () => {
      void message.success('已撤销该学生全部有效凭证');
      void queryClient.invalidateQueries({ queryKey: ['credentialStatus', studentId] });
    },
    onError: () => void message.error('撤销失败，请重试'),
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

          {/* 身份二维码凭证管理（F1 后端已上线） */}
          <Descriptions title="身份二维码" column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="凭证状态">
              {cred?.hasActive ? (
                <Tag color="green">有效</Tag>
              ) : cred && cred.totalIssued > 0 ? (
                <Tag color="default">已撤销</Tag>
              ) : (
                <Tag color="orange">未签发</Tag>
              )}
              {cred?.active && (
                <span style={{ marginLeft: 8, color: '#888' }}>
                  签发于 {formatDate(cred.active.issuedAt)}
                </span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="操作">
              <Space size="small">
                <PermissionButton
                  permission={PERM.STUDENT_QRCODE_ISSUE}
                  type="primary"
                  loading={issueMutation.isPending}
                  onClick={() => issueMutation.mutate()}
                >
                  {cred?.hasActive ? '补发' : '签发'}
                </PermissionButton>
                {cred?.hasActive && (
                  <Popconfirm
                    title="确认撤销该学生当前全部有效凭证？"
                    description="撤销后已发二维码立即失效"
                    onConfirm={() => revokeMutation.mutate()}
                    okText="确认"
                    cancelText="取消"
                    okButtonProps={{ loading: revokeMutation.isPending }}
                  >
                    <Button danger>撤销</Button>
                  </Popconfirm>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="创建时间">{formatDate(student.created_at)}</Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Modal
        open={!!qrToken}
        title="学生身份二维码"
        footer={null}
        onCancel={() => setQrToken(null)}
        centered
      >
        {qrToken && (
          <div style={{ textAlign: 'center' }}>
            <QRCodeSVG value={qrToken} size={240} level="M" marginSize={4} title="学生身份二维码" />
            <p style={{ marginTop: 12, color: '#fa8c16' }}>
              二维码仅显示一次，请截图保存；关闭后不可再次查看。
            </p>
          </div>
        )}
      </Modal>
    </Drawer>
  );
}
