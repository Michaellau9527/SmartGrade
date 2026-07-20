import { Drawer, Descriptions, Button, Space, message, Spin, Empty } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusTag from '@/components/StatusTag';
import { getNoticeDetail, confirmNotice } from '@/api/notice';
import type { NoticeItem } from '@/types/notice';

interface NoticeDetailProps {
  noticeId: string | null;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(val: string | null | undefined): string {
  if (!val) return '-';
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NoticeDetail({ noticeId, open, onClose }: NoticeDetailProps) {
  const queryClient = useQueryClient();

  const { data: notice, isLoading } = useQuery<NoticeItem>({
    queryKey: ['noticeDetail', noticeId],
    queryFn: () => getNoticeDetail(noticeId!),
    enabled: !!noticeId,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmNotice(id),
    onSuccess: () => {
      void message.success('已确认阅读');
      void queryClient.invalidateQueries({ queryKey: ['noticeList'] });
      void queryClient.invalidateQueries({ queryKey: ['noticeDetail'] });
    },
    onError: () => {
      void message.error('确认失败');
    },
  });

  const handleConfirmRead = () => {
    if (noticeId) {
      confirmMutation.mutate(noticeId);
    }
  };

  return (
    <Drawer
      width={640}
      title="通知详情"
      open={open}
      onClose={onClose}
      footer={
        <Space>
          {notice && notice.status === 'PUBLISHED' && !notice.is_read && (
            <Button
              type="primary"
              loading={confirmMutation.isPending}
              onClick={handleConfirmRead}
            >
              确认阅读
            </Button>
          )}
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      )}
      {!isLoading && !notice && <Empty description="未找到" />}
      {notice && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="标题">{notice.title}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="notice-status" value={notice.status} />
          </Descriptions.Item>
          <Descriptions.Item label="类型">
            <StatusTag type="business-type" value={notice.notice_type} />
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <StatusTag type="priority" value={notice.priority} />
          </Descriptions.Item>
          <Descriptions.Item label="发布者">{notice.publisher_name}</Descriptions.Item>
          <Descriptions.Item label="发布时间">
            {formatDateTime(notice.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="截止时间">
            {formatDateTime(notice.expired_at)}
          </Descriptions.Item>
          <Descriptions.Item label="正文">
            <div style={{ whiteSpace: 'pre-wrap' }}>{notice.content}</div>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
