import { Card, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  FileTextOutlined,
  BellOutlined,
  TeamOutlined,
  HomeOutlined,
  UserOutlined,
  MoreOutlined,
} from '@ant-design/icons';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

const actions: ActionItem[] = [
  { icon: <FileTextOutlined />, label: '请假审批', path: '/leave', color: '#1677ff' },
  { icon: <BellOutlined />, label: '发布通知', path: '/notice', color: '#ff4d4f' },
  { icon: <TeamOutlined />, label: '学生查询', path: '/student', color: '#52c41a' },
  { icon: <HomeOutlined />, label: '宿舍管理', path: '/dorm', color: '#faad14' },
  { icon: <UserOutlined />, label: '教师管理', path: '/teacher', color: '#722ed1' },
  { icon: <MoreOutlined />, label: '更多...', path: '/config', color: 'var(--color-text-secondary)' },
];

interface QuickActionsProps {
  style?: React.CSSProperties;
}

export default function QuickActions({ style }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card title="快捷入口" style={style}>
      <Row gutter={[16, 16]}>
        {actions.map((action) => (
          <Col span={12} key={action.path}>
            <div
              className="action-card"
              onClick={() => navigate(action.path)}
              style={{ color: action.color }}
            >
              <div style={{ fontSize: 24 }}>{action.icon}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{action.label}</div>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
