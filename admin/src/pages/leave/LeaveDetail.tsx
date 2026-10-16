import { Drawer, Descriptions, Button, Space, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import StatusTag from '@/components/StatusTag';
import { PermissionGuard } from '@/auth';
import { getLeaveDetail } from '@/api/leave';
import { LeaveTypeText } from '@/types/leave';
import type { LeaveItem } from '@/types/leave';

interface LeaveDetailProps {
  leaveId: string | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function formatDateTime(val: string | null): string {
  if (!val) return '-';
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 请假详情抽屉 — 字段对齐后端 LeaveResponse（camelCase）。
 * 列表项类型复用（详情接口字段是其超集），缺失字段按空值兜底。
 */
export default function LeaveDetail({ leaveId, open, onClose, onApprove, onReject }: LeaveDetailProps) {
  const { data: leave, isLoading } = useQuery<LeaveItem>({
    queryKey: ['leaveDetail', leaveId],
    queryFn: () => getLeaveDetail(leaveId!),
    enabled: !!leaveId,
  });

  const record = leave as (LeaveItem & {
    approverName?: string | null;
    approveRemark?: string | null;
    rejectReason?: string | null;
    timeline?: unknown[];
  }) | undefined;

  return (
    <Drawer
      width={640}
      title="请假详情"
      open={open}
      onClose={onClose}
      footer={
        <Space>
          {record && record.status === 'PENDING' && (
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
      ) : !record ? (
        <div>未找到请假记录</div>
      ) : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="请假编号">{record.leaveNo}</Descriptions.Item>
          <Descriptions.Item label="学生姓名">{record.studentName}</Descriptions.Item>
          <Descriptions.Item label="学生学号">{record.studentNo ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="班级">{record.className || '-'}</Descriptions.Item>
          <Descriptions.Item label="请假类型">
            {LeaveTypeText[record.leaveType] || record.leaveType}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="leave-status" value={record.status} />
          </Descriptions.Item>
          <Descriptions.Item label="请假原因">
            <div style={{ whiteSpace: 'pre-wrap' }}>{record.reason}</div>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatDateTime(record.startAt)}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{formatDateTime(record.endAt)}</Descriptions.Item>
          <Descriptions.Item label="申请教师">{record.applicantName}</Descriptions.Item>
          {record.approverName && (
            <Descriptions.Item label="审批教师">{record.approverName}</Descriptions.Item>
          )}
          {record.approveRemark && (
            <Descriptions.Item label="审批意见">{record.approveRemark}</Descriptions.Item>
          )}
          {record.rejectReason && (
            <Descriptions.Item label="驳回原因">{record.rejectReason}</Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Drawer>
  );
}
