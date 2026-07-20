import { Card, Row, Col, Spin } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { TodoStatistics as TodoStatisticsType } from '@/types/todo';

interface TodoStatisticsProps {
  statistics: TodoStatisticsType | null;
  loading?: boolean;
}

interface StatItem {
  title: string;
  value: number;
  description: string;
  bgColor: string;
  iconColor: string;
  icon: ReactNode;
}

export default function TodoStatistics({ statistics, loading }: TodoStatisticsProps) {
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  const items: StatItem[] = [
    {
      title: '待处理',
      value: statistics ? statistics.todo + statistics.processing : 0,
      description: '待办 + 处理中',
      bgColor: '#fff7e6',
      iconColor: '#faad14',
      icon: <ClockCircleOutlined />,
    },
    {
      title: '处理中',
      value: statistics?.processing ?? 0,
      description: '进行中',
      bgColor: '#e6f4ff',
      iconColor: '#1677ff',
      icon: <SyncOutlined spin />,
    },
    {
      title: '已完成',
      value: statistics?.done ?? 0,
      description: '已完成',
      bgColor: '#f6ffed',
      iconColor: '#52c41a',
      icon: <CheckCircleOutlined />,
    },
    {
      title: '已取消',
      value: statistics?.cancelled ?? 0,
      description: '已取消',
      bgColor: '#f5f5f5',
      iconColor: '#8c8c8c',
      icon: <CloseCircleOutlined />,
    },
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
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
                  {item.value}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 8 }}>
                  {item.description}
                </div>
              </div>
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
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
