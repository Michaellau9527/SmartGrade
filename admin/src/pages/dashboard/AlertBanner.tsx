import { Alert } from 'antd';

interface AlertBannerProps {
  todoCount: number;
  urgentCount: number;
}

export default function AlertBanner({ todoCount, urgentCount }: AlertBannerProps) {
  return (
    <Alert
      type="warning"
      message="今日待办通知"
      description={`今天共有 ${todoCount} 项待处理事务，其中 ${urgentCount} 项紧急，请及时处理。`}
      showIcon
      closable
      style={{ marginBottom: 24, borderRadius: 12 }}
    />
  );
}
