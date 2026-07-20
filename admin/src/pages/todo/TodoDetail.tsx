import { Drawer, Descriptions, Button, Space, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getTodoDetail } from '@/api/todo';
import { StatusTag } from '@/components';
import type { TodoItem } from '@/types/todo';

interface TodoDetailProps {
  todoId: string | null;
  open: boolean;
  onClose: () => void;
  onComplete: (id: string) => void;
}

const businessTypeRoute: Record<string, string> = {
  LEAVE: '/leave',
  NOTICE: '/notice',
  DORM: '/document',
  SYSTEM: '/config',
};

export default function TodoDetail({ todoId, open, onClose, onComplete }: TodoDetailProps) {
  const navigate = useNavigate();

  const { data: todo, isLoading } = useQuery<TodoItem>({
    queryKey: ['todo', todoId],
    queryFn: () => getTodoDetail(todoId!),
    enabled: !!todoId && open,
  });

  const handleViewBusiness = () => {
    if (todo && todo.business_type && todo.business_id) {
      const route = businessTypeRoute[todo.business_type];
      if (route) {
        navigate(route);
        onClose();
      }
    }
  };

  const footer = (
    <Space>
      {todo && (todo.status === 'TODO' || todo.status === 'PROCESSING') && (
        <Button type="primary" onClick={() => onComplete(todo.id)}>
          完成
        </Button>
      )}
      <Button onClick={onClose}>关闭</Button>
    </Space>
  );

  return (
    <Drawer
      title="待办详情"
      open={open}
      onClose={onClose}
      width={640}
      footer={footer}
    >
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      )}
      {todo && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="待办编号">{todo.todo_no}</Descriptions.Item>
          <Descriptions.Item label="标题">{todo.title}</Descriptions.Item>
          <Descriptions.Item label="内容">
            {todo.content ?? '无'}
          </Descriptions.Item>
          <Descriptions.Item label="业务类型">
            <StatusTag type="business-type" value={todo.business_type} />
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <StatusTag type="priority" value={todo.priority} />
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="todo-status" value={todo.status} />
          </Descriptions.Item>
          <Descriptions.Item label="截止时间">
            {todo.deadline ? dayjs(todo.deadline).format('YYYY-MM-DD HH:mm') : '无'}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {todo.finished_at ? dayjs(todo.finished_at).format('YYYY-MM-DD HH:mm') : '无'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(todo.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="处理教师">
            {todo.teacher ? `${todo.teacher.name}（${todo.teacher.teacher_no}）` : '无'}
          </Descriptions.Item>
          <Descriptions.Item label="业务详情">
            {todo.business_type && todo.business_id && (
              <Button type="link" size="small" onClick={handleViewBusiness}>
                查看{todo.business_type}
              </Button>
            )}
            {!todo.business_id && '无关联业务'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
