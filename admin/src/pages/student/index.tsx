import { useState } from 'react';
import { Button, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProTable, PageHeader } from '@/components';
import StatusTag from '@/components/StatusTag';
import { PermissionGuard } from '@/auth';
import { PERM } from '@/auth/permission';
import { useStudentStore } from '@/stores/student';
import { getStudentList, deleteStudent } from '@/api/student';
import type {
  StudentItem,
  StudentQueryParams,
  StudentStatus,
  BoardingType,
} from '@/types/student';
import StudentStats from './StudentStats';
import StudentFilter from './StudentFilter';
import StudentDetail from './StudentDetail';
import CreateStudentModal from './CreateStudentModal';

interface StudentStatsData {
  total: number;
  inSchool: number;
  onLeave: number;
  boarding: number;
}

const genderMap: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
};

export default function StudentPage() {
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
  } = useStudentStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const queryParams: StudentQueryParams = {
    page,
    pageSize,
    status: appliedFilters.status as StudentStatus | undefined,
    classId: appliedFilters.classId ? Number(appliedFilters.classId) : undefined,
    gender: appliedFilters.gender,
    boardingType: appliedFilters.boardingType as BoardingType | undefined,
    keyword: appliedFilters.keyword,
  };

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['studentList', { page, pageSize, ...appliedFilters }],
    queryFn: () => getStudentList(queryParams),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      void message.success('删除成功');
      void queryClient.invalidateQueries({ queryKey: ['studentList'] });
    },
    onError: () => {
      void message.error('删除失败');
    },
  });

  const stats: StudentStatsData = {
    total: listData?.total ?? 0,
    inSchool: listData?.list.filter((s) => s.status === 'IN_SCHOOL').length ?? 0,
    onLeave:
      listData?.list.filter(
        (s) => s.status === 'PENDING_LEAVE' || s.status === 'LEFT_SCHOOL',
      ).length ?? 0,
    boarding: listData?.list.filter((s) => s.boarding_type === 'BOARDING').length ?? 0,
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

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage, nextPageSize);
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setCreateOpen(true);
  };

  const handleCloseModal = () => {
    setCreateOpen(false);
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const columns = [
    {
      title: '学号',
      dataIndex: 'student_no',
      key: 'student_no',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string, record: StudentItem) => (
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
      title: '班级',
      dataIndex: 'class',
      key: 'class',
      width: 140,
      render: (_: unknown, record: StudentItem) => {
        const cls = record.class;
        return cls ? `${cls.grade?.grade_name || ''} ${cls.class_name}` : '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: string) => <StatusTag type="student-status" value={val} />,
    },
    {
      title: '住宿',
      dataIndex: 'boarding_type',
      key: 'boarding_type',
      width: 90,
      render: (val: string) => (
        <Tag color={val === 'BOARDING' ? 'blue' : 'default'}>
          {val === 'BOARDING' ? '住校' : '走读'}
        </Tag>
      ),
    },
    {
      title: '宿舍',
      dataIndex: 'dorm_room',
      key: 'dorm_room',
      width: 180,
      render: (_: unknown, record: StudentItem) => {
        if (!record.dorm_room) return '-';
        const b = record.dorm_room.building;
        return `${b?.building_name || ''} ${record.dorm_room.room_no}`;
      },
    },
    {
      title: '家长电话',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      width: 140,
      render: (val: string | null) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: StudentItem) => (
        <Space size="small">
          <a onClick={() => setDetailId(record.id)}>查看</a>
          <PermissionGuard permissions={[PERM.STUDENT_UPDATE]}>
            <a onClick={() => handleEdit(record.id)}><EditOutlined /> 编辑</a>
          </PermissionGuard>
          <PermissionGuard permissions={[PERM.STUDENT_DELETE]}>
            <Popconfirm
              title="确认删除该学生吗？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ loading: deleteMutation.isPending }}
            >
              <a style={{ color: '#ff4d4f' }}><DeleteOutlined /> 删除</a>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* PageHeader */}
      <PageHeader
        title="学生管理"
        extra={
          <PermissionGuard permissions={[PERM.STUDENT_CREATE]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建学生
            </Button>
          </PermissionGuard>
        }
      />

      {/* Stats */}
      <StudentStats stats={stats} />

      {/* Filter */}
      <StudentFilter
        filters={draftFilters}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleFilterReset}
      />

      {/* Table */}
      <ProTable<StudentItem>
        columns={columns}
        dataSource={listData?.list ?? []}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={listLoading}
        rowKey="id"
        headerTitle="学生列表"
        scroll={{ x: 1000 }}
        onChange={handlePageChange}
      />

      {/* Detail Drawer */}
      <StudentDetail studentId={detailId} open={!!detailId} onClose={() => setDetailId(null)} />

      {/* Create/Edit Modal */}
      <CreateStudentModal open={createOpen} onClose={handleCloseModal} editId={editId} />
    </div>
  );
}
