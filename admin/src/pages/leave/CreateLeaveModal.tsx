import { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Dayjs } from 'dayjs';
import { createLeave } from '@/api/leave';
import { getStudentList } from '@/api/student';
import type {
  CreateLeaveParams,
  LeaveType,
  LeaveReasonType,
} from '@/types/leave';

interface CreateLeaveModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 新建请假表单 — 字段对齐后端 CreateLeaveRequest：
 * studentId / leaveType / leaveReasonType / reason / startAt / endAt。
 * - studentId 为学生 cuid 字符串，通过学生列表接口按关键词远程搜索选择；
 * - startAt/endAt 提交 ISO 8601；
 * - 后端无 remark 字段（审批备注属于审批环节），不提供。
 */
interface LeaveFormData {
  studentId: string;
  leaveType: LeaveType;
  leaveReasonType: LeaveReasonType;
  reason: string;
  range: [Dayjs, Dayjs];
}

const leaveTypeOptions: { label: string; value: LeaveType }[] = [
  { label: '病假', value: 'SICK' },
  { label: '事假', value: 'PERSONAL' },
  { label: '其他', value: 'OTHER' },
];

const leaveReasonTypeOptions: { label: string; value: LeaveReasonType }[] = [
  { label: '身体原因（生病、受伤）', value: 'ILLNESS' },
  { label: '个人事务', value: 'PERSONAL' },
  { label: '家庭原因', value: 'FAMILY' },
  { label: '体育/训练', value: 'SPORT' },
  { label: '学校活动', value: 'SCHOOL_ACTIVITY' },
  { label: '其他', value: 'OTHER' },
];

/** 身体原因默认病假：leaveType 与 leaveReasonType 联动的常见组合提示 */
export default function CreateLeaveModal({ open, onClose }: CreateLeaveModalProps) {
  const [form] = Form.useForm<LeaveFormData>();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; label: string } | null>(null);

  // 远程搜索学生（复用学生列表接口 keyword 过滤，数据范围由后端保证）
  const { data: studentData, isFetching: studentsFetching } = useQuery({
    queryKey: ['leaveStudentOptions', keyword],
    queryFn: () => getStudentList({ page: 1, pageSize: 20, keyword: keyword || undefined }),
    enabled: open,
  });

  const studentOptions = (studentData?.list ?? []).map((s) => ({
    value: s.id,
    label: `${s.name}（${s.studentNo}${s.className ? ` · ${s.className}` : ''}）`,
  }));

  const createMutation = useMutation({
    mutationFn: (data: CreateLeaveParams) => createLeave(data),
    onSuccess: () => {
      void message.success('新建请假成功');
      void queryClient.invalidateQueries({ queryKey: ['leaveList'] });
      form.resetFields();
      setSelectedStudent(null);
      onClose();
    },
    onError: (err: unknown) => {
      const resp = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data;
      const detail = Array.isArray(resp?.message) ? resp!.message.join('；') : resp?.message;
      void message.error(detail || '创建失败，请检查表单');
    },
  });

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        studentId: values.studentId,
        leaveType: values.leaveType,
        leaveReasonType: values.leaveReasonType,
        reason: values.reason,
        startAt: values.range[0].toISOString(),
        endAt: values.range[1].toISOString(),
      });
    } catch {
      // validation failed
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedStudent(null);
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
      okText="提交"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="studentId"
          label="学生"
          rules={[{ required: true, message: '请选择学生' }]}
        >
          <Select
            showSearch
            filterOption={false}
            placeholder="输入姓名或学号搜索学生"
            options={studentOptions}
            loading={studentsFetching}
            onSearch={(v) => setKeyword(v)}
            onChange={(value: string) => {
              const opt = studentOptions.find((o) => o.value === value);
              setSelectedStudent(opt ? { id: value, label: opt.label } : null);
            }}
            notFoundContent={studentsFetching ? '搜索中...' : '无匹配学生'}
          />
        </Form.Item>
        {selectedStudent && (
          <div style={{ marginBottom: 16, color: 'var(--color-text-secondary, #666)' }}>
            已选：{selectedStudent.label}
          </div>
        )}
        <Form.Item
          name="leaveType"
          label="请假类型"
          rules={[{ required: true, message: '请选择请假类型' }]}
        >
          <Select placeholder="请选择请假类型" options={leaveTypeOptions} />
        </Form.Item>
        <Form.Item
          name="leaveReasonType"
          label="请假原因分类"
          rules={[{ required: true, message: '请选择原因分类' }]}
        >
          <Select placeholder="请选择原因分类" options={leaveReasonTypeOptions} />
        </Form.Item>
        <Form.Item
          name="reason"
          label="请假原因"
          rules={[
            { required: true, message: '请输入请假原因' },
            { max: 200, message: '请假原因不能超过 200 字' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="请输入请假原因" maxLength={200} showCount />
        </Form.Item>
        <Form.Item
          name="range"
          label="请假时间段"
          rules={[
            { required: true, message: '请选择请假时间段' },
            {
              validator: (_, val: [Dayjs, Dayjs] | undefined) => {
                if (val && val[0] && val[1] && val[1].isBefore(val[0])) {
                  return Promise.reject(new Error('结束时间不能早于开始时间'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
