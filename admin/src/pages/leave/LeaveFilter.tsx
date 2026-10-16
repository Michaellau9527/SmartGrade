import { Select } from 'antd';
import FilterBar from '@/components/FilterBar';
import type { LeaveType } from '@/types/leave';

interface LeaveFilterProps {
  filters: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
}

/**
 * 筛选项对齐后端 GET /leaves 实际支持的参数：status / leaveType。
 * 说明：班级与日期范围筛选后端暂未实现，为避免「看似可筛实则无效」，
 * 此处不提供；如后续后端支持再补。
 */
const statusOptions = [
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已离校', value: 'LEFT' },
  { label: '已返校', value: 'RETURNED' },
  { label: '已销假', value: 'CLOSED' },
  { label: '已撤销', value: 'CANCELLED' },
];

const leaveTypeOptions: { label: string; value: LeaveType }[] = [
  { label: '病假', value: 'SICK' },
  { label: '事假', value: 'PERSONAL' },
  { label: '其他', value: 'OTHER' },
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

  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      <Select
        placeholder="请假状态"
        value={filters.status}
        onChange={handleChange('status')}
        options={statusOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="请假类型"
        value={filters.leaveType as LeaveType | undefined}
        onChange={handleChange('leaveType')}
        options={leaveTypeOptions}
        style={{ width: 140 }}
        allowClear
      />
    </FilterBar>
  );
}
