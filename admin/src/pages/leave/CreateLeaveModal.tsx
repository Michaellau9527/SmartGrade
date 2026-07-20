import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeave } from '@/api/leave';
import type { CreateLeaveParams, LeaveType } from '@/types/leave';

interface CreateLeaveModalProps {
  open: boolean;
  onClose: () => void;
}

const leaveTypeOptions: { label: string; value: LeaveType }[] = [
  { label: '离校请假', value: 'LEAVE_SCHOOL' },
  { label: '回寝请假', value: 'RETURN_DORM' },
  { label: '其他', value: 'OTHER' },
];

export default function CreateLeaveModal({ open, onClose }: CreateLeaveModalProps) {
  const [form] = Form.useForm<CreateLeaveParams>();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateLeaveParams) => createLeave(data),
    onSuccess: () => {
      void message.success('新建请假成功');
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
      createMutation.mutate({
        studentId: values.studentId,
        leaveType: values.leaveType,
        leaveReason: values.leaveReason,
        remark: values.remark,
      });
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
      title="新建请假"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="studentId"
          label="学生ID"
          rules={[{ required: true, message: '请输入学生ID' }]}
        >
          <InputNumber placeholder="请输入学生ID" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="leaveType"
          label="请假类型"
          rules={[{ required: true, message: '请选择请假类型' }]}
        >
          <Select placeholder="请选择请假类型" options={leaveTypeOptions} />
        </Form.Item>
        <Form.Item
          name="leaveReason"
          label="请假原因"
          rules={[{ required: true, message: '请输入请假原因' }]}
        >
          <Input.TextArea rows={3} placeholder="请输入请假原因" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="备注（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
