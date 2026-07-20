import { Card, List } from 'antd';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusTag } from '@/components';
import { getRecentNotices } from '@/api/dashboard';
import type { RecentNoticeItem } from '@/types/dashboard';

function formatTime(str: string): string {
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface RecentNoticeProps {
  style?: React.CSSProperties;
}

export default function RecentNotice({ style }: RecentNoticeProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['recentNotices'],
    queryFn: getRecentNotices,
  });

  const list = data ?? [];

  return (
    <Card title="最新通知" extra={<Link to="/notice">查看全部</Link>} style={style}>
      <List<RecentNoticeItem>
        loading={isLoading}
        dataSource={list}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ff4d4f',
                  }}
                />
              }
              title={
                <span style={{ fontWeight: 600 }}>
                  {item.title}
                </span>
              }
              description={`${item.publisher_name}  ${formatTime(item.created_at)}`}
            />
            <StatusTag type="priority" value={item.priority} />
          </List.Item>
        )}
        style={{ maxHeight: 300, overflow: 'auto' }}
      />
    </Card>
  );
}
