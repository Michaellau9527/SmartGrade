import { Card } from 'antd';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusTag, ProTable } from '@/components';
import { getRecentLeaves } from '@/api/dashboard';
import type { RecentLeaveItem } from '@/types/dashboard';
import type { ColumnsType } from 'antd/es/table';

const leaveTypeMap: Record<string, string> = {
  LEAVE_SCHOOL: '离校请假',
  RETURN_DORM: '回寝请假',
  OTHER: '其他',
};

function formatTime(str: string): string {
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const columns: ColumnsType<RecentLeaveItem & Record<string, unknown>> = [
  {
    title: '编号',
    dataIndex: 'leave_no',
    key: 'leave_no',
    width: 160,
  },
  {
    title: '学生',
    dataIndex: 'student_name',
    key: 'student_name',
    width: 100,
  },
  {
    title: '类型',
    dataIndex: 'leave_type',
    key: 'leave_type',
    width: 100,
    render: (val: string) => leaveTypeMap[val] ?? val,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    render: (val: string) => <StatusTag type="leave-status" value={val} />,
  },
  {
    title: '时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 110,
    render: (val: string) => formatTime(val),
  },
];

interface RecentLeaveProps {
  style?: React.CSSProperties;
}

export default function RecentLeave({ style }: RecentLeaveProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['recentLeaves'],
    queryFn: getRecentLeaves,
  });

  const list = (data ?? []) as (RecentLeaveItem & Record<string, unknown>)[];

  return (
    <Card title="最近请假" extra={<Link to="/leave">查看全部</Link>} style={style}>
      <ProTable<RecentLeaveItem & Record<string, unknown>>
        columns={columns}
        dataSource={list}
        total={list.length}
        page={1}
        pageSize={list.length}
        loading={isLoading}
        pagination={false}
        rowKey="id"
      />
    </Card>
  );
}
