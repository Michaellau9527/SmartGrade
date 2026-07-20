import { Result, Button } from 'antd';

type ErrorStatus = 'network' | 'server' | 'forbidden' | 'not-found' | 'generic';

interface ErrorPageProps {
  status?: ErrorStatus;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const statusConfig: Record<ErrorStatus, { resultStatus: 403 | 404 | 500 | 'error'; defaultTitle: string; defaultDesc: string }> = {
  network: { resultStatus: 'error', defaultTitle: '网络异常', defaultDesc: '请检查网络连接后重试' },
  server: { resultStatus: 500, defaultTitle: '服务器错误', defaultDesc: '服务器内部错误，请稍后重试' },
  forbidden: { resultStatus: 403, defaultTitle: '权限不足', defaultDesc: '您没有权限访问此页面' },
  'not-found': { resultStatus: 404, defaultTitle: '页面不存在', defaultDesc: '请求的资源不存在' },
  generic: { resultStatus: 'error', defaultTitle: '出错了', defaultDesc: '发生了未知错误' },
};

export default function ErrorPage({
  status = 'generic',
  title,
  description,
  onRetry,
}: ErrorPageProps) {
  const config = statusConfig[status];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Result
        status={config.resultStatus}
        title={title || config.defaultTitle}
        subTitle={description || config.defaultDesc}
        extra={
          onRetry && (
            <Button type="primary" onClick={onRetry}>
              重试
            </Button>
          )
        }
      />
    </div>
  );
}
