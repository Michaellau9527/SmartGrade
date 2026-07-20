import { useState } from 'react';
import { Button, Space, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { ProTable, PageHeader } from '@/components';
import StatusTag from '@/components/StatusTag';
import { PermissionGuard } from '@/auth';
import { PERM } from '@/auth/permission';
import { useNoticeStore } from '@/stores/notice';
import { getNoticeList, deleteNotice } from '@/api/notice';
import type {
  NoticeItem,
  NoticeQueryParams,
  NoticeStatus,
  NoticeType,
  NoticePriority,
} from '@/types/notice';
import NoticeStats from './NoticeStats';
import NoticeFilter from './NoticeFilter';
import NoticeDetail from './NoticeDetail';
import CreateNoticeModal from './CreateNoticeModal';

function formatDateTime(val: string): string {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NoticePage() {
  const queryClient = useQueryClient();
  const {
    draftFilters,
    appliedFilters,
    page,
    pageSize,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
  } = useNoticeStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const queryParams: NoticeQueryParams = {
    page,
    pageSize,
    status: appliedFilters.status as NoticeStatus | undefined,
    noticeType: appliedFilters.notice_type as NoticeType | undefined,
    priority: appliedFilters.priority as NoticePriority | undefined,
    unread:
      appliedFilters.unread === 'UNREAD' ? true : appliedFilters.unread === 'READ' ? false : undefined,
  };

  const { data: listData, isLoading } = useQuery({
    queryKey: ['noticeList', { page, pageSize, ...appliedFilters }],
    queryFn: () => getNoticeList(queryParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => {
      void message.success('删除成功');
      void queryClient.invalidateQueries({ queryKey: ['noticeList'] });
    },
    onError: () => {
      void message.error('删除失败');
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFilterChange = (key: string, value: string | undefined) => {
    setDraftFilter(key, value);
  };

  const handleFilterReset = () => {
    resetFilters();
  };

  const handleSearch = () => {
    applyFilters();
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p, ps);
  };

  const list = listData?.list ?? [];
  const stats = {
    total: listData?.total ?? 0,
    unread: list.filter((n) => !n.is_read).length,
    draft: list.filter((n) => n.status === 'DRAFT').length,
    todayPublished: list.filter((n) => dayjs(n.created_at).isSame(dayjs(), 'day')).length,
  };

  const columns: ColumnsType<NoticeItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: NoticeItem) => (
        <a onClick={() => setDetailId(record.id)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'notice_type',
      key: 'notice_type',
      width: 100,
      render: (val: NoticeType) => <StatusTag type="business-type" value={val} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: NoticeStatus) => <StatusTag type="notice-status" value={val} />,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (val: NoticePriority) => <StatusTag type="priority" value={val} />,
    },
    {
      title: '发布者',
      dataIndex: 'publisher_name',
      key: 'publisher_name',
      width: 120,
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: NoticeItem) => (
        <Space size="small">
          <a onClick={() => setDetailId(record.id)}>查看</a>
          <PermissionGuard permissions={[PERM.NOTICE_DELETE]}>
            {(record.status === 'PUBLISHED' || record.status === 'DRAFT') && (
              <Popconfirm
                title="确认删除该通知吗？"
                description="删除后不可恢复"
                onConfirm={() => handleDelete(record.id)}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: deleteMutation.isPending }}
              >
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>
            )}
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* PageHeader */}
      <PageHeader
        title="通知管理"
        extra={
          <PermissionGuard permissions={[PERM.NOTICE_CREATE]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建通知
            </Button>
          </PermissionGuard>
        }
      />

      {/* Stats */}
      <NoticeStats stats={stats} />

      {/* Filter */}
      <NoticeFilter
        filters={draftFilters}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleFilterReset}
      />

      {/* Table */}
      <ProTable<NoticeItem>
        columns={columns}
        dataSource={list}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onChange={handlePageChange}
        rowKey="id"
        headerTitle="通知列表"
        scroll={{ x: 800 }}
      />

      {/* Detail Drawer */}
      <NoticeDetail noticeId={detailId} open={!!detailId} onClose={() => setDetailId(null)} />

      {/* Create Modal */}
      <CreateNoticeModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
