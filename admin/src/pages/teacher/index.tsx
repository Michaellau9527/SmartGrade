import { useState } from 'react';
import { Tag, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, ProTable, PermissionButton } from '@/components';
import { getTeacherList } from '@/api/teacher';
import { PERM } from '@/auth/permission';
import type { TeacherItem, TeacherQueryParams } from '@/types/teacher';
import TeacherDetail from './TeacherDetail';
import TeacherForm from './TeacherForm';

const genderMap: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
};

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '在职', color: 'green' },
  RESIGNED: { label: '已离职', color: 'default' },
};

export default function TeacherPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState<string>('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<TeacherItem | null>(null);
  const queryClient = useQueryClient();

  const queryParams: TeacherQueryParams = { page, pageSize, keyword: keyword || undefined };

  const { data: listData, isLoading } = useQuery({
    queryKey: ['teacherList', { page, pageSize, keyword }],
    queryFn: () => getTeacherList(queryParams),
  });

  const columns = [
    {
      title: '工号',
      dataIndex: 'teacherNo',
      key: 'teacherNo',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string, record: TeacherItem) => (
        <a onClick={() => setDetailId(record.id)}>{text}</a>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (val: string) => genderMap[val] || val,
    },
    {
      title: '职务',
      dataIndex: 'position',
      key: 'position',
      width: 140,
      render: (val: string | null) => val || '-',
    },
    {
      title: '教研组',
      dataIndex: 'teachingGroup',
      key: 'teachingGroup',
      width: 140,
      render: (val: string | null) => val || '-',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (val: string | null) => val || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: string) => (
        <Tag color={statusMap[val]?.color || 'default'}>{statusMap[val]?.label || val}</Tag>
      ),
    },
    {
        title: '操作',
        key: 'action',
        width: 140,
        render: (_: unknown, record: TeacherItem) => (
          <Space size="middle">
            <a onClick={() => setDetailId(record.id)}>查看</a>
            <PermissionButton
              permission={PERM.TEACHER_UPDATE}
              type="link"
              onClick={() => {
                setEditTarget(record);
                setFormMode('edit');
                setFormOpen(true);
              }}
            >
              编辑
            </PermissionButton>
          </Space>
        ),
      },
    ];

  return (
    <div>
      <PageHeader title="教师管理" />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Input
          allowClear
          placeholder="按工号 / 姓名搜索"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => setPage(1)}
          style={{ width: 280 }}
        />
        <PermissionButton
          permission={PERM.TEACHER_CREATE}
          type="primary"
          onClick={() => {
            setEditTarget(null);
            setFormMode('create');
            setFormOpen(true);
          }}
        >
          新增教师
        </PermissionButton>
      </div>

      <ProTable<TeacherItem>
        columns={columns}
        dataSource={listData?.list ?? []}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        rowKey="id"
        headerTitle="教师列表"
        scroll={{ x: 900 }}
        onChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
      />

      <TeacherDetail
        teacherId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />

      <TeacherForm
        open={formOpen}
        mode={formMode}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['teacherList'] })}
      />
    </div>
  );
}