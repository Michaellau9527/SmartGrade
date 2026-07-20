import { useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Space, Button, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStudent, updateStudent, getStudentDetail } from '@/api/student';
import type { CreateStudentParams, UpdateStudentParams } from '@/types/student';

const { Option } = Select;

interface CreateStudentModalProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

interface StudentFormData {
  name: string;
  student_no: string;
  gender: string;
  class_id: string;
  boarding_type: string;
  dorm_room_id?: string;
  bed_no?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
}

export default function CreateStudentModal({ open, onClose, editId }: CreateStudentModalProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<StudentFormData>();
  const isEdit = !!editId;

  const { data: editStudent } = useQuery({
    queryKey: ['studentDetail', editId],
    queryFn: () => getStudentDetail(editId!),
    enabled: open && isEdit && !!editId,
  });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      void message.success('创建成功');
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['studentList'] });
      void queryClient.invalidateQueries({ queryKey: ['studentDetail'] });
      onClose();
    },
    onError: () => {
      void message.error('创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: UpdateStudentParams }) => updateStudent(vars.id, vars.data),
    onSuccess: () => {
      void message.success('保存成功');
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['studentList'] });
      void queryClient.invalidateQueries({ queryKey: ['studentDetail'] });
      onClose();
    },
    onError: () => {
      void message.error('保存失败');
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && editStudent) {
      form.setFieldsValue({
        name: editStudent.name,
        student_no: editStudent.student_no,
        gender: editStudent.gender,
        class_id: String(editStudent.class_id),
        boarding_type: editStudent.boarding_type,
        dorm_room_id: editStudent.dorm_room_id != null ? String(editStudent.dorm_room_id) : undefined,
        bed_no: editStudent.bed_no ?? undefined,
        phone: editStudent.phone ?? undefined,
        parent_name: editStudent.parent_name ?? undefined,
        parent_phone: editStudent.parent_phone ?? undefined,
      });
    } else if (!isEdit) {
      form.resetFields();
      form.setFieldsValue({
        gender: 'MALE',
        boarding_type: 'BOARDING',
      });
    }
  }, [open, isEdit, editStudent, form]);

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && editId) {
        const updateData: UpdateStudentParams = {
          name: values.name,
          gender: values.gender,
          boarding_type: values.boarding_type,
          dorm_room_id: values.dorm_room_id ? Number(values.dorm_room_id) : undefined,
          bed_no: values.bed_no || undefined,
          phone: values.phone || undefined,
          parent_name: values.parent_name || undefined,
          parent_phone: values.parent_phone || undefined,
        };
        updateMutation.mutate({ id: editId, data: updateData });
      } else {
        const createData: CreateStudentParams = {
          student_no: values.student_no,
          name: values.name,
          gender: values.gender,
          class_id: Number(values.class_id),
          boarding_type: values.boarding_type,
          dorm_room_id: values.dorm_room_id ? Number(values.dorm_room_id) : undefined,
          bed_no: values.bed_no || undefined,
          phone: values.phone || undefined,
          parent_name: values.parent_name || undefined,
          parent_phone: values.parent_phone || undefined,
        };
        createMutation.mutate(createData);
      }
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑学生' : '新建学生'}
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入学生姓名' }]}
        >
          <Input placeholder="请输入学生姓名" maxLength={20} />
        </Form.Item>

        <Form.Item
          name="student_no"
          label="学号"
          rules={[{ required: true, message: '请输入学号' }]}
        >
          <Input placeholder="请输入学号" maxLength={20} disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Radio.Group>
            <Radio value="MALE">男</Radio>
            <Radio value="FEMALE">女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="class_id"
          label="班级"
          rules={[{ required: true, message: '请选择班级' }]}
        >
          <Select placeholder="请选择班级" disabled={isEdit}>
            <Option value="1">高一(1)班</Option>
            <Option value="2">高一(2)班</Option>
            <Option value="3">高一(3)班</Option>
            <Option value="4">高二(1)班</Option>
            <Option value="5">高二(2)班</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="boarding_type"
          label="住宿类型"
          rules={[{ required: true, message: '请选择住宿类型' }]}
        >
          <Radio.Group>
            <Radio value="BOARDING">住校</Radio>
            <Radio value="DAY">走读</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="dorm_room_id" label="宿舍房间ID">
          <Input placeholder="请输入宿舍房间ID（选填）" maxLength={20} />
        </Form.Item>

        <Form.Item name="bed_no" label="床位号">
          <Input placeholder="请输入床位号（选填）" maxLength={20} />
        </Form.Item>

        <Form.Item name="phone" label="学生电话">
          <Input placeholder="请输入学生电话" maxLength={20} />
        </Form.Item>

        <Form.Item name="parent_name" label="家长姓名">
          <Input placeholder="请输入家长姓名" maxLength={20} />
        </Form.Item>

        <Form.Item name="parent_phone" label="家长电话">
          <Input placeholder="请输入家长电话" maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
