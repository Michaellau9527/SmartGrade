import { useState } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { ProTable, PageHeader } from '@/components';
import StatusTag from '@/components/StatusTag';
import { PermissionGuard } from '@/auth';
import { PERM } from '@/auth/permission';
import { useLeaveStore } from '@/stores/leave';
import LeaveStats from './LeaveStats';
import LeaveFilter from './LeaveFilter';
import LeaveDetail from './LeaveDetail';
import ApproveModal from './ApproveModal';
import RejectModal from './RejectModal';
import CreateLeaveModal from './CreateLeaveModal';
import { getLeaveList } from '@/api/leave';
import type {
  LeaveItem,
  LeaveQueryParams,
  LeaveStatus,
  LeaveType,
} from '@/types/leave';

const leaveTypeNames: Record<string, string> = {
  LEAVE_SCHOOL: '离校请假',
  RETURN_DORM: '回寝请假',
  OTHER: '其他',
};

interface LeaveStatsData {
  total: number;
  pending: number;
  approved: number;
  today: number;
}

function fmtDate(val: string): string {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LeavePage() {
  const {
    draftFilters,
    appliedFilters,
    page,
    pageSize,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
  } = useLeaveStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const queryParams: LeaveQueryParams = {
    page,
    pageSize,
    status: appliedFilters.status as LeaveStatus | undefined,
    leaveType: appliedFilters.leave_type as LeaveType | undefined,
  };

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['leaveList', { page, pageSize, ...appliedFilters }],
    queryFn: () => getLeaveList(queryParams),
  });

  const stats: LeaveStatsData = {
    total: listData?.total ?? 0,
    pending: listData?.list.filter((item) => item.status === 'PENDING').length ?? 0,
    approved: listData?.list.filter((item) => item.status === 'APPROVED').length ?? 0,
    today:
      listData?.list.filter(
        (item) => new Date(item.created_at).toDateString() === new Date().toDateString(),
      ).length ?? 0,
  };

  const handleFilterChange = (key: string, value: string | undefined) => {
    setDraftFilter(key, value);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const handleReset = () => {
    resetFilters();
  };

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage, nextPageSize);
  };

  const handleDetailApprove = () => {
    setApproveId(detailId);
    setDetailId(null);
  };

  const handleDetailReject = () => {
    setRejectId(detailId);
    setDetailId(null);
  };

  const columns = [
    { title: '请假编号', dataIndex: 'leave_no', key: 'leave_no', width: 140 },
    { title: '学生姓名', dataIndex: 'student_name', key: 'student_name', width: 100 },
    { title: '请假类型', dataIndex: 'leave_type', key: 'leave_type', width: 100, render: (val: string) => leaveTypeNames[val] || val },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (val: string) => <StatusTag type="leave-status" value={val} /> },
    { title: '申请教师', dataIndex: 'apply_teacher_name', key: 'apply_teacher_name', width: 100 },
    { title: '申请时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (val: string) => fmtDate(val) },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: LeaveItem) => (
        <Space size="small">
          <a onClick={() => setDetailId(record.id)}>查看</a>
          <PermissionGuard permissions={[PERM.LEAVE_APPROVE]}>
            {record.status === 'PENDING' && (
              <>
                <a onClick={() => setApproveId(record.id)}>审批</a>
                <a onClick={() => setRejectId(record.id)} style={{ color: '#ff4d4f' }}>驳回</a>
              </>
            )}
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="请假管理"
        extra={
          <PermissionGuard permissions={[PERM.LEAVE_CREATE]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建请假
            </Button>
          </PermissionGuard>
        }
      />

      <LeaveStats stats={stats} />
      <LeaveFilter filters={draftFilters} onChange={handleFilterChange} onSearch={handleSearch} onReset={handleReset} />
      <ProTable<LeaveItem>
        columns={columns}
        dataSource={listData?.list ?? []}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={listLoading}
        onChange={handlePageChange}
        rowKey="id"
        headerTitle="请假列表"
        scroll={{ x: 900 }}
      />
      <LeaveDetail
        leaveId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onApprove={handleDetailApprove}
        onReject={handleDetailReject}
      />
      <ApproveModal leaveId={approveId} open={!!approveId} onClose={() => setApproveId(null)} />
      <RejectModal leaveId={rejectId} open={!!rejectId} onClose={() => setRejectId(null)} />
      <CreateLeaveModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
