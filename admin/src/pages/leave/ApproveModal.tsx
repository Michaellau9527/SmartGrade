import { Modal, Form, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveLeave } from '@/api/leave';
import type { ApproveLeaveParams } from '@/types/leave';

interface ApproveModalProps {
  leaveId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function ApproveModal({ leaveId, open, onClose }: ApproveModalProps) {
  const [form] = Form.useForm<{ approveRemark?: string }>();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (data: ApproveLeaveParams) => approveLeave(leaveId!, data),
    onSuccess: () => {
      void message.success('审批通过');
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
      approveMutation.mutate({ approveRemark: values.approveRemark });
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
      title="审批请假"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={approveMutation.isPending}
      width={480}
      okText="通过"
      okButtonProps={{ type: 'primary' }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="approveRemark" label="审批备注">
          <Input.TextArea rows={3} placeholder="审批备注（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
