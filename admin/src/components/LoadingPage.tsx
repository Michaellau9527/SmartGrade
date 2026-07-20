import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingPageProps {
  tip?: string;
}

export default function LoadingPage({ tip = '加载中...' }: LoadingPageProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} />} tip={tip}>
        <div style={{ padding: 50 }} />
      </Spin>
    </div>
  );
}