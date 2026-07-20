import { Row, Col, Card } from 'antd';
import {
  FileTextOutlined,
  BellOutlined,
  TeamOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import type { DashboardOverview } from '@/types/dashboard';

interface StatsCardsProps {
  stats: DashboardOverview;
}

interface StatItem {
  title: string;
  value: number;
  trend: React.ReactNode;
  bgColor: string;
  iconColor: string;
  icon: React.ReactNode;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const items: StatItem[] = [
    {
      title: '待办',
      value: stats.todoCount,
      trend: <span style={{ color: '#faad14' }}>待处理</span>,
      bgColor: '#e6f4ff',
      iconColor: '#1677ff',
      icon: <CheckSquareOutlined />,
    },
    {
      title: '今日请假',
      value: stats.todayLeaves,
      trend: <span style={{ color: '#faad14' }}>待审批 {stats.pendingLeave}</span>,
      bgColor: '#fff7e6',
      iconColor: '#faad14',
      icon: <FileTextOutlined />,
    },
    {
      title: '未读通知',
      value: stats.unreadNotices,
      trend: <span style={{ color: '#ff4d4f' }}>条未读</span>,
      bgColor: '#fff1f0',
      iconColor: '#ff4d4f',
      icon: <BellOutlined />,
    },
    {
      title: '在校学生',
      value: stats.inSchool,
      trend: <span style={{ color: 'var(--color-text-secondary)' }}>共 {stats.totalStudents} 名</span>,
      bgColor: '#f6ffed',
      iconColor: '#52c41a',
      icon: <TeamOutlined />,
    },
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
              <div>
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
                  {item.trend}
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
