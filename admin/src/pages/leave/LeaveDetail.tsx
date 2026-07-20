import { Drawer, Descriptions, Button, Space, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import StatusTag from '@/components/StatusTag';
import { PermissionGuard } from '@/auth';
import { getLeaveDetail } from '@/api/leave';
import type { LeaveItem } from '@/types/leave';

interface LeaveDetailProps {
  leaveId: string | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const leaveTypeNames: Record<string, string> = {
  LEAVE_SCHOOL: '离校请假',
  RETURN_DORM: '回寝请假',
  OTHER: '其他',
};

const boardingTypeNames: Record<string, string> = {
  BOARDING: '住宿生',
  DAY: '走读生',
};

function formatDateTime(val: string): string {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LeaveDetail({ leaveId, open, onClose, onApprove, onReject }: LeaveDetailProps) {
  const { data: leave, isLoading } = useQuery<LeaveItem>({
    queryKey: ['leaveDetail', leaveId],
    queryFn: () => getLeaveDetail(leaveId!),
    enabled: !!leaveId,
  });

  return (
    <Drawer
      width={640}
      title="请假详情"
      open={open}
      onClose={onClose}
      footer={
        <Space>
          {leave && leave.status === 'PENDING' && (
            <PermissionGuard permissions={['leave:approve']}>
              <Button type="primary" onClick={onApprove}>审批</Button>
              <Button danger onClick={onReject}>驳回</Button>
            </PermissionGuard>
          )}
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : !leave ? (
        <div>未找到请假记录</div>
      ) : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="请假编号">{leave.leave_no}</Descriptions.Item>
          <Descriptions.Item label="学生姓名">{leave.student_name}</Descriptions.Item>
          <Descriptions.Item label="学生学号">{leave.student_no}</Descriptions.Item>
          <Descriptions.Item label="请假类型">
            {leaveTypeNames[leave.leave_type] || leave.leave_type}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="leave-status" value={leave.status} />
          </Descriptions.Item>
          <Descriptions.Item label="请假原因">
            <div style={{ whiteSpace: 'pre-wrap' }}>{leave.leave_reason}</div>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatDateTime(leave.start_time)}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{formatDateTime(leave.end_time)}</Descriptions.Item>
          <Descriptions.Item label="住宿类型">
            {boardingTypeNames[leave.boarding_type] || leave.boarding_type}
          </Descriptions.Item>
          <Descriptions.Item label="申请教师">{leave.apply_teacher_name}</Descriptions.Item>
          {leave.approve_teacher_name && (
            <Descriptions.Item label="审批教师">{leave.approve_teacher_name}</Descriptions.Item>
          )}
          {leave.approve_remark && (
            <Descriptions.Item label="审批备注">{leave.approve_remark}</Descriptions.Item>
          )}
          {leave.reject_reason && (
            <Descriptions.Item label="驳回原因">{leave.reject_reason}</Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Drawer>
  );
}
