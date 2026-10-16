import { useEffect, useMemo } from 'react';
import { Form, Input, Modal, Select, Button, Space, Alert } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClass, updateClass, getGradeOptions } from '@/api/class';
import { getTeacherList } from '@/api/teacher';
import type { ClassItem, CreateClassParams, UpdateClassParams } from '@/types/class';

/** 与后端 Prisma enum ClassStatus 保持一致 */
const CLASS_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '启用' },
  { value: 'GRADUATED', label: '已毕业' },
  { value: 'ARCHIVED', label: '归档' },
];

interface ClassFormModalProps {
  open: boolean;
  /** 传入则为编辑模式 */
  editItem?: ClassItem | null;
  onClose: () => void;
}

interface ClassFormValues {
  gradeId: string;
  code: string;
  name: string;
  headTeacherId?: string | null;
  status: string;
}

export default function ClassFormModal({ open, editItem, onClose }: ClassFormModalProps) {
  const isEdit = !!editItem;
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ClassFormValues>();

  // 可选年级受后端数据范围约束：年级主任只会拿到本人负责的年级
  const { data: gradeData, isLoading: gradeLoading } = useQuery({
    queryKey: ['classGradeOptions'],
    queryFn: () => getGradeOptions(),
    enabled: open,
  });

  const { data: teacherData } = useQuery({
    queryKey: ['classTeacherOptions'],
    queryFn: () => getTeacherList({ page: 1, pageSize: 100 }),
    enabled: open,
  });

  const gradeOptions = useMemo(
    () =>
      (gradeData?.list ?? []).map((g) => ({
        value: g.id,
        label: `${g.name}（${g.code}）`,
      })),
    [gradeData],
  );

  const teacherOptions = useMemo(
    () =>
      (teacherData?.list ?? []).map((t) => ({
        value: t.id,
        label: `${t.name}（${t.teacherNo}）`,
      })),
    [teacherData],
  );

  // 仅一个可选年级（年级主任）时自动选中并锁定，避免误选到无权限年级
  const gradeLocked = gradeOptions.length === 1;

  useEffect(() => {
    if (!open) return;
    if (isEdit && editItem) {
      form.setFieldsValue({
        gradeId: editItem.gradeId,
        code: editItem.code,
        name: editItem.name,
        headTeacherId: editItem.headTeacherId ?? undefined,
        status: editItem.status || 'ACTIVE',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'ACTIVE',
        ...(gradeLocked && gradeOptions[0] ? { gradeId: gradeOptions[0].value } : {}),
      });
    }
  }, [open, isEdit, editItem, form, gradeLocked, gradeOptions]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['classList'] });
    void queryClient.invalidateQueries({ queryKey: ['allClassesOptions'] });
    void queryClient.invalidateQueries({ queryKey: ['classGradeOptions'] });
  };

  // 失败提示由 request 拦截器统一弹出（含后端 400/403 的具体原因），此处仅保持弹窗打开
  const createMutation = useMutation({
    mutationFn: (data: CreateClassParams) => createClass(data),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: UpdateClassParams }) => updateClass(vars.id, vars.data),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && editItem) {
        const data: UpdateClassParams = {
          gradeId: values.gradeId,
          code: values.code,
          name: values.name,
          headTeacherId: values.headTeacherId ?? null,
          status: values.status,
        };
        updateMutation.mutate({ id: editItem.id, data });
      } else {
        const data: CreateClassParams = {
          gradeId: values.gradeId,
          code: values.code,
          name: values.name,
          headTeacherId: values.headTeacherId ?? null,
          status: values.status,
        };
        createMutation.mutate(data);
      }
    } catch {
      // 表单校验失败：由 antd 在字段上提示
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑班级' : '新增班级'}
      open={open}
      onCancel={onClose}
      width={560}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      }
    >
      {gradeOptions.length === 0 && !gradeLoading && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="没有可管理的年级"
          description="当前账号的数据范围内没有可用年级，无法新增或调整班级。请联系管理员确认年级主任的负责年级设置。"
        />
      )}

      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="gradeId"
          label="所属年级"
          rules={[{ required: true, message: '请选择所属年级' }]}
          extra={gradeLocked ? '年级主任仅能管理本人负责的年级' : undefined}
        >
          <Select
            placeholder="请选择年级"
            loading={gradeLoading}
            disabled={gradeLocked && !isEdit}
            options={gradeOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="班级编码"
          rules={[
            { required: true, message: '请输入班级编码' },
            { max: 30, message: '班级编码不能超过 30 个字符' },
          ]}
        >
          <Input placeholder="如 01 / 14，同一grade内唯一" maxLength={30} />
        </Form.Item>

        <Form.Item
          name="name"
          label="班级名称"
          rules={[
            { required: true, message: '请输入班级名称' },
            { max: 50, message: '班级名称不能超过 50 个字符' },
          ]}
        >
          <Input placeholder="如 高二(14)班" maxLength={50} />
        </Form.Item>

        <Form.Item name="headTeacherId" label="班主任">
          <Select
            allowClear
            placeholder="请选择班主任（选填）"
            options={teacherOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
          <Select options={CLASS_STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
