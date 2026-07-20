import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface EmptyPageProps {
  description?: string;
  action?: ReactNode;
}

export default function EmptyPage({ description = '暂无数据', action }: EmptyPageProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Empty description={description}>
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </Empty>
    </div>
  );
}