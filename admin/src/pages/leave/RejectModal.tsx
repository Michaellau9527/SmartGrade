import { Modal, Form, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectLeave } from '@/api/leave';
import type { RejectLeaveParams } from '@/types/leave';

interface RejectModalProps {
  leaveId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function RejectModal({ leaveId, open, onClose }: RejectModalProps) {
  const [form] = Form.useForm<{ rejectReason: string }>();
  const queryClient = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: (data: RejectLeaveParams) => rejectLeave(leaveId!, data),
    onSuccess: () => {
      void message.success('已驳回');
      void queryClient.invalidateQueries({ queryKey: ['leaveList'] });
      form.resetFields();
      onClose();
    },
    onError: () => {
      void message.error('操作失败');
    },
  });

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      rejectMutation.mutate({ rejectReason: values.rejectReason });
    } catch {
      // validation failed
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="驳回请假"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={rejectMutation.isPending}
      width={480}
      okText="驳回"
      okButtonProps={{ type: 'primary', danger: true }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="rejectReason"
          label="驳回原因"
          rules={[{ required: true, message: '请输入驳回原因' }]}
        >
          <Input.TextArea rows={3} placeholder="驳回原因（必填）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
