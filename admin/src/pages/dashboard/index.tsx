import { Row, Col } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getOverview } from '@/api/dashboard';
import { LoadingPage } from '@/components';
import AlertBanner from './AlertBanner';
import StatsCards from './StatsCards';
import RecentTodo from './RecentTodo';
import RecentLeave from './RecentLeave';
import RecentNotice from './RecentNotice';
import QuickActions from './QuickActions';

export default function Dashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: getOverview,
  });

  if (isLoading) {
    return <LoadingPage tip="加载中..." />;
  }

  const stats = overview ?? {
    totalStudents: 0,
    inSchool: 0,
    leftSchool: 0,
    pendingLeave: 0,
    todayLeaves: 0,
    unreadNotices: 0,
    todoCount: 0,
  };

  return (
    <div style={{ padding: 0 }}>
      <AlertBanner todoCount={stats.todoCount} urgentCount={stats.pendingLeave} />
      <StatsCards stats={stats} />
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={16}>
          <RecentTodo style={{ marginBottom: 24 }} />
          <RecentLeave />
        </Col>
        <Col span={8}>
          <RecentNotice style={{ marginBottom: 24 }} />
          <QuickActions />
        </Col>
      </Row>
    </div>
  );
}
