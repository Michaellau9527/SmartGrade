import { useState } from 'react';
import { Input, Select, Button, Space, Tag, Card } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { ProTable, PageHeader } from '@/components';
import { getClassList } from '@/api/class';
import type { ClassItem, ClassQueryParams } from '@/types/class';

const STATUS_LABEL: Record<string, { color: string; text: string }> = {
  ACTIVE: { color: 'green', text: '启用' },
  INACTIVE: { color: 'default', text: '停用' },
  ARCHIVED: { color: 'orange', text: '归档' },
};

export default function ClassPage() {
  const [filters, setFilters] = useState<{ schoolId?: string; gradeId?: string; keyword?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 拉取全量班级用于派生学校/年级筛选选项
  const { data: allData } = useQuery({
    queryKey: ['allClassesOptions'],
    queryFn: () => getClassList({ page: 1, pageSize: 200 }),
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

  const columns = [
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
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
  ];

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

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
        scroll={{ x: 900 }}
        onChange={(nextPage: number, nextPageSize: number) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
      />
    </div>
  );
}
