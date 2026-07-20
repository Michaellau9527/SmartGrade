import { Row, Col, Card } from 'antd';
import {
  BellOutlined,
  BellFilled,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

interface NoticeStatsData {
  total: number;
  unread: number;
  draft: number;
  todayPublished: number;
}

interface NoticeStatsProps {
  stats: NoticeStatsData;
}

interface StatItem {
  title: string;
  value: number;
  description: string;
  bgColor: string;
  iconColor: string;
  icon: ReactNode;
}

const statItems: StatItem[] = [
  {
    title: '通知总数',
    value: 0,
    description: '全部通知',
    bgColor: '#e6f4ff',
    iconColor: '#1677ff',
    icon: <BellOutlined />,
  },
  {
    title: '未读通知',
    value: 0,
    description: '待阅读通知',
    bgColor: '#fff1f0',
    iconColor: '#ff4d4f',
    icon: <BellFilled />,
  },
  {
    title: '草稿',
    value: 0,
    description: '未发布通知',
    bgColor: '#fff7e6',
    iconColor: '#faad14',
    icon: <FileTextOutlined />,
  },
  {
    title: '今日发布',
    value: 0,
    description: '今日新增',
    bgColor: '#f6ffed',
    iconColor: '#52c41a',
    icon: <SendOutlined />,
  },
];

export default function NoticeStats({ stats }: NoticeStatsProps) {
  const items: StatItem[] = [
    { ...statItems[0], value: stats.total },
    { ...statItems[1], value: stats.unread },
    { ...statItems[2], value: stats.draft },
    { ...statItems[3], value: stats.todayPublished },
  ];

  return (
    <Row gutter={24}>
      {items.map((item) => (
        <Col span={6} key={item.title}>
          <Card className="stats-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  background: item.bgColor,
                  color: item.iconColor,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1, marginLeft: 16 }}>
                <div
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {item.description}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
