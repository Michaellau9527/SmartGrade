import { Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import FilterBar from '@/components/FilterBar';

interface LeaveFilterProps {
  filters: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
}

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已离校', value: 'LEFT' },
  { label: '已销假', value: 'FINISHED' },
  { label: '已撤销', value: 'CANCELLED' },
];

const leaveTypeOptions = [
  { label: '全部', value: '' },
  { label: '离校请假', value: 'LEAVE_SCHOOL' },
  { label: '回寝请假', value: 'RETURN_DORM' },
  { label: '其他', value: 'OTHER' },
];

const classOptions = [
  { label: '全部', value: '' },
  { label: '高一1班', value: 'CLASS_1' },
  { label: '高一2班', value: 'CLASS_2' },
];

export default function LeaveFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: LeaveFilterProps) {
  const handleChange = (key: string) => (value: string) => {
    onChange(key, value || undefined);
  };

  const handleDateChange = (key: string) => (date: Dayjs | null) => {
    onChange(key, date ? date.format('YYYY-MM-DD') : undefined);
  };

  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      <Select
        placeholder="请假状态"
        value={filters.status ?? ''}
        onChange={handleChange('status')}
        options={statusOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="请假类型"
        value={filters.leave_type ?? ''}
        onChange={handleChange('leave_type')}
        options={leaveTypeOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="班级"
        value={filters.class_name ?? ''}
        onChange={handleChange('class_name')}
        options={classOptions}
        style={{ width: 140 }}
        allowClear
      />
      <DatePicker
        placeholder="开始日期"
        value={filters.start_date ? dayjs(filters.start_date) : undefined}
        onChange={handleDateChange('start_date')}
        style={{ width: 140 }}
      />
      <DatePicker
        placeholder="结束日期"
        value={filters.end_date ? dayjs(filters.end_date) : undefined}
        onChange={handleDateChange('end_date')}
        style={{ width: 140 }}
      />
    </FilterBar>
  );
}
