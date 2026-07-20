/**
 * PageHeader - 页面级统一头部
 * 替代所有页面中重复的 inline style：display:flex / justify-content:space-between / marginBottom:24
 *
 * 用法：
 *   <PageHeader title="请假管理">
 *     <PermissionGuard permissions={[PERM.LEAVE_CREATE]}>
 *       <Button type="primary" icon={<PlusOutlined />}>新建请假</Button>
 *     </PermissionGuard>
 *   </PageHeader>
 */
import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { styles } from '@/styles/designToken';

const { Title } = Typography;

interface PageHeaderProps {
  title: ReactNode;
  extra?: ReactNode;
  description?: ReactNode;
}

export default function PageHeader({ title, extra, description }: PageHeaderProps) {
  return (
    <div style={styles.pageHeader}>
      <div>
        <Title level={4} style={styles.pageTitle}>
          {title}
        </Title>
        {description && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
            {description}
          </div>
        )}
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}
