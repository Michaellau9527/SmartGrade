import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { createTeacher, updateTeacher } from '@/api/teacher';
import type { TeacherItem, TeacherUpsertInput } from '@/types/teacher';

interface TeacherFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: TeacherItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
  { value: 'OTHER', label: '其他' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '在职' },
  { value: 'RESIGNED', label: '已离职' },
];

export default function TeacherForm({ open, mode, initial, onClose, onSuccess }: TeacherFormProps) {
  const [form] = Form.useForm<TeacherUpsertInput>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      form.setFieldsValue({
        teacherNo: initial.teacherNo,
        name: initial.name,
        gender: (initial.gender as TeacherUpsertInput['gender']) ?? 'MALE',
        phone: initial.phone ?? undefined,
        email: initial.email ?? undefined,
        teachingGroup: initial.teachingGroup ?? undefined,
        position: initial.position ?? undefined,
        status: (initial.status as TeacherUpsertInput['status']) ?? 'ACTIVE',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ gender: 'MALE', status: 'ACTIVE' });
    }
  }, [open, mode, initial, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (mode === 'edit' && initial) {
        await updateTeacher(initial.id, values);
        message.success('教师信息已更新');
      } else {
        await createTeacher(values);
        message.success('教师已创建');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(e?.response?.data?.message || e?.message || '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? '编辑教师' : '新增教师'}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          label="工号"
          name="teacherNo"
          rules={[{ required: true, message: '请输入工号' }]}
        >
          <Input placeholder="请输入工号（唯一）" allowClear />
        </Form.Item>

        <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" allowClear />
        </Form.Item>

        <Form.Item
          label="性别"
          name="gender"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select options={GENDER_OPTIONS} placeholder="请选择" />
        </Form.Item>

        <Form.Item label="职务" name="position">
          <Input placeholder="如：年级主任 / 班主任" allowClear />
        </Form.Item>

        <Form.Item label="教研组" name="teachingGroup">
          <Input placeholder="如：数学组" allowClear />
        </Form.Item>

        <Form.Item label="电话" name="phone">
          <Input placeholder="请输入联系电话" allowClear />
        </Form.Item>

        <Form.Item label="邮箱" name="email">
          <Input placeholder="请输入邮箱" allowClear />
        </Form.Item>

        <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
          <Select options={STATUS_OPTIONS} placeholder="请选择" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
