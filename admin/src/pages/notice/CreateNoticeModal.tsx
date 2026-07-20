import { Modal, Form, Input, Select, Switch, DatePicker, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import { createNotice } from '@/api/notice';
import type { CreateNoticeParams, NoticeType, NoticePriority } from '@/types/notice';

interface CreateNoticeModalProps {
  open: boolean;
  onClose: () => void;
}

interface NoticeFormValues {
  title: string;
  content: string;
  noticeType: NoticeType;
  publishScope: string;
  priority?: NoticePriority;
  needConfirm?: boolean;
  expiredAt?: Dayjs;
}

const noticeTypeOptions: { label: string; value: NoticeType }[] = [
  { label: '全员', value: 'ALL' },
  { label: '按角色', value: 'ROLE' },
  { label: '按标签', value: 'TAG' },
  { label: '按组织', value: 'ORGANIZATION' },
];

const priorityOptions: { label: string; value: NoticePriority }[] = [
  { label: '低', value: 'LOW' },
  { label: '普通', value: 'NORMAL' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' },
];

export default function CreateNoticeModal({ open, onClose }: CreateNoticeModalProps) {
  const [form] = Form.useForm<NoticeFormValues>();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (params: CreateNoticeParams) => createNotice(params),
    onSuccess: () => {
      void message.success('通知发布成功');
      void queryClient.invalidateQueries({ queryKey: ['noticeList'] });
      form.resetFields();
      onClose();
    },
    onError: () => {
      void message.error('发布失败');
    },
  });

  const handleOk = () => {
    form.submit();
  };

  const handleFinish = (values: NoticeFormValues) => {
    const params: CreateNoticeParams = {
      title: values.title,
      content: values.content,
      noticeType: values.noticeType,
      publishScope: values.publishScope,
      priority: values.priority,
      needConfirm: values.needConfirm,
      expiredAt: values.expiredAt ? values.expiredAt.toISOString() : undefined,
    };
    createMutation.mutate(params);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title="发布通知"
      width={640}
      open={open}
      okText="发布"
      cancelText="取消"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ priority: 'NORMAL', needConfirm: false }}
      >
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input.TextArea rows={2} placeholder="请输入通知标题" />
        </Form.Item>
        <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
          <Input.TextArea rows={6} placeholder="请输入通知正文" />
        </Form.Item>
        <Form.Item name="noticeType" label="通知类型" rules={[{ required: true, message: '请选择通知类型' }]}>
          <Select options={noticeTypeOptions} placeholder="请选择通知类型" />
        </Form.Item>
        <Form.Item name="publishScope" label="发布范围">
          <Input.TextArea rows={2} placeholder='{"type":"ALL"}' />
        </Form.Item>
        <Form.Item name="priority" label="优先级">
          <Select options={priorityOptions} placeholder="请选择优先级" />
        </Form.Item>
        <Form.Item name="needConfirm" label="需要确认阅读" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="expiredAt" label="截止时间">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
