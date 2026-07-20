import { Card, Row, Col } from 'antd';
import { TeamOutlined, CheckCircleOutlined, FieldTimeOutlined, HomeOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface StudentStatsData {
  total: number;
  inSchool: number;
  onLeave: number;
  boarding: number;
}

interface StudentStatsProps {
  stats: StudentStatsData;
}

interface StatItem {
  title: string;
  value: number;
  description: string;
  bgColor: string;
  iconColor: string;
  icon: ReactNode;
}

const items: StatItem[] = [
  {
    title: '学生总数',
    value: 0,
    description: '全部学生',
    bgColor: '#e6f4ff',
    iconColor: '#1677ff',
    icon: <TeamOutlined />,
  },
  {
    title: '在校',
    value: 0,
    description: '在校学生',
    bgColor: '#f6ffed',
    iconColor: '#52c41a',
    icon: <CheckCircleOutlined />,
  },
  {
    title: '请假中',
    value: 0,
    description: '待离校/已离校',
    bgColor: '#fff7e6',
    iconColor: '#faad14',
    icon: <FieldTimeOutlined />,
  },
  {
    title: '住宿生',
    value: 0,
    description: '住校学生',
    bgColor: '#f9f0ff',
    iconColor: '#722ed1',
    icon: <HomeOutlined />,
  },
];

export default function StudentStats({ stats }: StudentStatsProps) {
  const data: StatItem[] = [
    { ...items[0], value: stats.total },
    { ...items[1], value: stats.inSchool },
    { ...items[2], value: stats.onLeave },
    { ...items[3], value: stats.boarding },
  ];

  return (
    <Row gutter={24} style={{ marginBottom: 24 }}>
      {data.map((item) => (
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
