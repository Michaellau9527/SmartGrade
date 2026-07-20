import { Select, Input } from 'antd';
import FilterBar from '@/components/FilterBar';
import type { TodoQueryParams, BusinessType, Priority, TodoStatus } from '@/types/todo';

interface TodoFilterProps {
  filters: TodoQueryParams;
  onChange: (filters: Partial<TodoQueryParams>) => void;
}

const businessTypeOptions = [
  { label: '全部类型', value: '' },
  { label: '请假', value: 'LEAVE' },
  { label: '通知', value: 'NOTICE' },
  { label: '宿舍', value: 'DORM' },
];

const priorityOptions = [
  { label: '全部优先级', value: '' },
  { label: '紧急', value: 'URGENT' },
  { label: '高', value: 'HIGH' },
  { label: '普通', value: 'NORMAL' },
  { label: '低', value: 'LOW' },
];

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'TODO' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已完成', value: 'DONE' },
  { label: '已取消', value: 'CANCELLED' },
];

export default function TodoFilter({ filters, onChange }: TodoFilterProps) {
  const handleBusinessTypeChange = (value: string) => {
    onChange({ businessType: (value || undefined) as BusinessType | undefined, page: 1 });
  };
  const handlePriorityChange = (value: string) => {
    onChange({ priority: (value || undefined) as Priority | undefined, page: 1 });
  };
  const handleStatusChange = (value: string) => {
    onChange({ status: (value || undefined) as TodoStatus | undefined, page: 1 });
  };

  const handleSearch = () => {
    onChange({ page: 1 });
  };

  const handleReset = () => {
    onChange({ businessType: undefined, priority: undefined, status: undefined, page: 1 });
  };

  return (
    <FilterBar onSearch={handleSearch} onReset={handleReset}>
      <Input.Search
        placeholder="搜索待办"
        allowClear
        onSearch={handleSearch}
        style={{ width: 200 }}
      />
      <Select
        placeholder="全部类型"
        value={filters.businessType ?? ''}
        onChange={handleBusinessTypeChange}
        options={businessTypeOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="全部优先级"
        value={filters.priority ?? ''}
        onChange={handlePriorityChange}
        options={priorityOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="全部状态"
        value={filters.status ?? ''}
        onChange={handleStatusChange}
        options={statusOptions}
        style={{ width: 140 }}
        allowClear
      />
    </FilterBar>
  );
}
