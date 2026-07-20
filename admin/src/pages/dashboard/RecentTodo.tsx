import { Card } from 'antd';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusTag, ProTable } from '@/components';
import { getTodoList } from '@/api/todo';
import type { TodoItem } from '@/types/todo';
import type { ColumnsType } from 'antd/es/table';

function formatTime(str: string): string {
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const columns: ColumnsType<TodoItem> = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '类型',
    dataIndex: 'business_type',
    key: 'business_type',
    width: 80,
    render: (val: string) => <StatusTag type="business-type" value={val} />,
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (val: string) => <StatusTag type="priority" value={val} />,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    render: (val: string) => <StatusTag type="todo-status" value={val} />,
  },
  {
    title: '时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 110,
    render: (val: string) => formatTime(val),
  },
];

interface RecentTodoProps {
  style?: React.CSSProperties;
}

export default function RecentTodo({ style }: RecentTodoProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['todoList', { page: 1, pageSize: 5 }],
    queryFn: () => getTodoList({ page: 1, pageSize: 5 }),
  });

  const list = data?.list ?? [];

  return (
    <Card title="最近待办" extra={<Link to="/todo">查看全部</Link>} style={style}>
      <ProTable<TodoItem>
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
