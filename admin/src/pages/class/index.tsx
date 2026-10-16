import { useState } from 'react';
import { Input, Select, Button, Space, Tag, Card, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProTable, PageHeader } from '@/components';
import { getClassList, deleteClass } from '@/api/class';
import { PERM } from '@/auth/permission';
import { useUserStore } from '@/stores/user';
import type { ClassItem, ClassQueryParams } from '@/types/class';
import ClassFormModal from './ClassFormModal';

/** 与后端 Prisma enum ClassStatus 保持一致 */
const STATUS_LABEL: Record<string, { color: string; text: string }> = {
  ACTIVE: { color: 'green', text: '启用' },
  GRADUATED: { color: 'blue', text: '已毕业' },
  ARCHIVED: { color: 'orange', text: '归档' },
};

export default function ClassPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ schoolId?: string; gradeId?: string; keyword?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 前端按钮门控仅为体验，真正拦截在后端（@RequirePermissions + 数据范围校验）
  const canCreate = useUserStore((s) => s.hasPermission(PERM.CLASS_CREATE));
  const canUpdate = useUserStore((s) => s.hasPermission(PERM.CLASS_UPDATE));
  const canDelete = useUserStore((s) => s.hasPermission(PERM.CLASS_DELETE));

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClassItem | null>(null);

  // 拉取全量班级用于派生学校/年级筛选选项
  const { data: allData } = useQuery({
    queryKey: ['allClassesOptions'],
    queryFn: () => getClassList({ page: 1, pageSize: 100 }),
  });

  const schoolOptions = Array.from(
    new Map((allData?.list ?? []).map((c) => [c.schoolId, c.school])).values(),
  )
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ value: s.id, label: s.name }));

  const gradeOptions = Array.from(
    new Map((allData?.list ?? []).map((c) => [c.gradeId, c.grade])).values(),
  )
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }));

  const queryParams: ClassQueryParams = {
    page,
    pageSize,
    schoolId: filters.schoolId,
    gradeId: filters.gradeId,
    keyword: filters.keyword,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['classList', { page, pageSize, ...filters }],
    queryFn: () => getClassList(queryParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      void message.success('删除成功');
      void queryClient.invalidateQueries({ queryKey: ['classList'] });
      void queryClient.invalidateQueries({ queryKey: ['allClassesOptions'] });
    },
    // 失败原因（如「仍存在关联数据（12 名学生…）」）由 request 拦截器统一提示
  });

  const handleCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (record: ClassItem) => {
    setEditItem(record);
    setModalOpen(true);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  const columns = [
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (_: unknown, record: ClassItem) => (
        <span>
          {record.name}
          <span style={{ color: '#999', marginLeft: 6 }}>({record.code})</span>
        </span>
      ),
    },
    {
      title: '年级',
      dataIndex: ['grade', 'name'],
      key: 'grade',
      width: 120,
      render: (_: unknown, record: ClassItem) => record.grade?.name ?? '-',
    },
    {
      title: '所属学校',
      dataIndex: ['school', 'name'],
      key: 'school',
      width: 180,
      render: (_: unknown, record: ClassItem) => record.school?.name ?? '-',
    },
    {
      title: '班主任',
      dataIndex: ['headTeacher', 'name'],
      key: 'headTeacher',
      width: 120,
      render: (_: unknown, record: ClassItem) => record.headTeacher?.name ?? '-',
    },
    {
      title: '学生人数',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: string) => {
        const s = STATUS_LABEL[val];
        return s ? <Tag color={s.color}>{s.text}</Tag> : <Tag>{val}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: ClassItem) => {
        if (!canUpdate && !canDelete) return <span style={{ color: '#bbb' }}>—</span>;
        return (
          <Space size="small">
            {canUpdate && (
              <Button type="link" size="small" onClick={() => handleEdit(record)}>
                编辑
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="确认删除该班级？"
                description="存在关联学生、教师班级关系、请假记录或时间轴事件时将被拒绝；删除为软删除，历史数据保留。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="班级管理" />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            placeholder="班级名称 / 编码"
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            onPressEnter={handleSearch}
          />
          <Select
            allowClear
            placeholder="按学校筛选"
            style={{ width: 200 }}
            value={filters.schoolId}
            options={schoolOptions}
            onChange={(v) => setFilters((f) => ({ ...f, schoolId: v }))}
          />
          <Select
            allowClear
            placeholder="按年级筛选"
            style={{ width: 200 }}
            value={filters.gradeId}
            options={gradeOptions}
            onChange={(v) => setFilters((f) => ({ ...f, gradeId: v }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <ProTable<ClassItem>
        columns={columns}
        dataSource={data?.list ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        rowKey="id"
        headerTitle="班级列表"
        scroll={{ x: 1000 }}
        extra={
          canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增班级
            </Button>
          ) : null
        }
        onChange={(nextPage: number, nextPageSize: number) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
      />

      <ClassFormModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
