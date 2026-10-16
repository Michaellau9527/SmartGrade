import { useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Space, Button, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStudent, updateStudent, getStudentDetail } from '@/api/student';
import { getClassList } from '@/api/class';
import type { CreateStudentParams, UpdateStudentParams, BoardingType } from '@/types/student';

interface CreateStudentModalProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

/** 表单字段名与后端 CreateStudentDto / UpdateStudentDto 一致（camelCase） */
interface StudentFormData {
  name: string;
  studentNo: string;
  gender: string;
  classId: string;
  boardingType: BoardingType;
  dormRoomId?: string;
  bedNo?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
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

  // 班级下拉：来自真实班级列表接口（旧版硬编码数字 ID 与生产 VARCHAR(36) 班级 ID 不符）
  const { data: classData } = useQuery({
    queryKey: ['classListForStudentForm'],
    queryFn: () => getClassList({ page: 1, pageSize: 100 }),
    enabled: open,
  });
  const classOptions = (classData?.list ?? []).map((c) => ({
    value: c.id,
    label: c.grade?.name ? `${c.grade.name} ${c.name}` : c.name,
  }));

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      void message.success('创建成功');
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['studentList'] });
      void queryClient.invalidateQueries({ queryKey: ['studentDetail'] });
      onClose();
    },
    onError: (err: unknown) => {
      const resp = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data;
      const detail = Array.isArray(resp?.message) ? resp!.message.join('；') : resp?.message;
      void message.error(detail || '创建失败');
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
    onError: (err: unknown) => {
      const resp = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data;
      const detail = Array.isArray(resp?.message) ? resp!.message.join('；') : resp?.message;
      void message.error(detail || '保存失败');
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && editStudent) {
      form.setFieldsValue({
        name: editStudent.name,
        studentNo: editStudent.studentNo,
        gender: editStudent.gender,
        classId: editStudent.classId,
        boardingType: editStudent.boardingType,
        dormRoomId: editStudent.dormId ?? undefined,
        bedNo: editStudent.bedNo ?? undefined,
        phone: editStudent.phone ?? undefined,
      });
    } else if (!isEdit) {
      form.resetFields();
      form.setFieldsValue({
        gender: 'MALE',
        boardingType: 'BOARDING',
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
          boardingType: values.boardingType,
          dormRoomId: values.dormRoomId || undefined,
          bedNo: values.bedNo || undefined,
          phone: values.phone || undefined,
          parentName: values.parentName || undefined,
          parentPhone: values.parentPhone || undefined,
        };
        updateMutation.mutate({ id: editId, data: updateData });
      } else {
        const createData: CreateStudentParams = {
          studentNo: values.studentNo,
          name: values.name,
          gender: values.gender,
          classId: values.classId,
          boardingType: values.boardingType,
          dormRoomId: values.dormRoomId || undefined,
          bedNo: values.bedNo || undefined,
          phone: values.phone || undefined,
          parentName: values.parentName || undefined,
          parentPhone: values.parentPhone || undefined,
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
          name="studentNo"
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
          name="classId"
          label="班级"
          rules={[{ required: true, message: '请选择班级' }]}
        >
          <Select
            placeholder="请选择班级"
            disabled={isEdit}
            options={classOptions}
            showSearch
            optionFilterProp="label"
            notFoundContent="暂无班级数据"
          />
        </Form.Item>

        <Form.Item
          name="boardingType"
          label="住宿类型"
          rules={[{ required: true, message: '请选择住宿类型' }]}
        >
          <Radio.Group>
            <Radio value="BOARDING">住校</Radio>
            <Radio value="DAY_STUDENT">走读</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="dormRoomId" label="宿舍房间ID">
          <Input placeholder="宿舍房间ID（选填，住宿生）" maxLength={36} />
        </Form.Item>

        <Form.Item name="bedNo" label="床位号">
          <Input placeholder="请输入床位号（选填）" maxLength={20} />
        </Form.Item>

        <Form.Item name="phone" label="学生电话">
          <Input placeholder="请输入学生电话" maxLength={20} />
        </Form.Item>

        <Form.Item name="parentName" label="家长姓名" extra="预留字段，当前版本暂不保存">
          <Input placeholder="请输入家长姓名" maxLength={20} />
        </Form.Item>

        <Form.Item name="parentPhone" label="家长电话" extra="预留字段，当前版本暂不保存">
          <Input placeholder="请输入家长电话" maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
