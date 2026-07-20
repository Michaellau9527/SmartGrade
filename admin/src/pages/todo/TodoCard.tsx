import { Card, Tag, Button, Space } from 'antd';
import dayjs from 'dayjs';
import type { TodoItem, Priority } from '@/types/todo';
import { StatusTag } from '@/components';

interface TodoCardProps {
  todo: TodoItem;
  onComplete: (id: string) => void;
  onClick: (id: string) => void;
}

const priorityColorMap: Record<Priority, string> = {
  URGENT: '#ff4d4f',
  HIGH: '#faad14',
  NORMAL: '#1677ff',
  LOW: '#8c8c8c',
};

const businessTypeLabel: Record<string, string> = {
  LEAVE: '请假',
  NOTICE: '通知',
  DORM: '宿舍',
  SYSTEM: '系统',
};

const businessTypeColorMap: Record<string, string> = {
  LEAVE: 'purple',
  NOTICE: 'blue',
  DORM: 'cyan',
  SYSTEM: 'default',
};

export default function TodoCard({ todo, onComplete, onClick }: TodoCardProps) {
  return (
    <Card
      style={{
        marginBottom: 16,
        cursor: 'pointer',
        borderLeft: `4px solid ${priorityColorMap[todo.priority] ?? '#d9d9d9'}`,
      }}
      onClick={() => onClick(todo.id)}
    >
      <div style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: 16, fontWeight: 600 }}>{todo.title}</strong>
      </div>
      {todo.content && (
        <div style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          {todo.content.length > 100 ? todo.content.slice(0, 100) + '...' : todo.content}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={[0, 8]} wrap>
          <Tag color={businessTypeColorMap[todo.business_type] ?? 'default'}>
            {businessTypeLabel[todo.business_type] ?? todo.business_type}
          </Tag>
          <StatusTag type="priority" value={todo.priority} />
          <StatusTag type="todo-status" value={todo.status} />
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            {dayjs(todo.created_at).format('YYYY-MM-DD HH:mm')}
          </span>
        </Space>
        {todo.status !== 'DONE' && todo.status !== 'CANCELLED' && (
          <Button
            type="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(todo.id);
            }}
          >
            完成
          </Button>
        )}
      </div>
    </Card>
  );
}
