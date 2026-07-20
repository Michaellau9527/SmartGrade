import { Row, Col, Card } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

interface LeaveStatsData {
  total: number;
  pending: number;
  approved: number;
  today: number;
}

interface LeaveStatsProps {
  stats: LeaveStatsData;
}

interface StatItem {
  title: string;
  value: number;
  bgColor: string;
  iconColor: string;
  icon: ReactNode;
}

const statItems: StatItem[] = [
  {
    title: '请假总数',
    value: 0,
    bgColor: '#e6f4ff',
    iconColor: '#1677ff',
    icon: <FileTextOutlined />,
  },
  {
    title: '待审批',
    value: 0,
    bgColor: '#fff7e6',
    iconColor: '#faad14',
    icon: <ClockCircleOutlined />,
  },
  {
    title: '审批通过',
    value: 0,
    bgColor: '#f6ffed',
    iconColor: '#52c41a',
    icon: <CheckCircleOutlined />,
  },
  {
    title: '今日请假',
    value: 0,
    bgColor: '#fff1f0',
    iconColor: '#ff4d4f',
    icon: <RiseOutlined />,
  },
];

export default function LeaveStats({ stats }: LeaveStatsProps) {
  const items: StatItem[] = [
    { ...statItems[0], value: stats.total },
    { ...statItems[1], value: stats.pending },
    { ...statItems[2], value: stats.approved },
    { ...statItems[3], value: stats.today },
  ];

  return (
    <Row gutter={24} style={{ marginBottom: 24 }}>
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
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
