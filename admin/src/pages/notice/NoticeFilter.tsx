import { Select } from 'antd';
import FilterBar from '@/components/FilterBar';

interface NoticeFilterProps {
  filters: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
}

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已撤回', value: 'WITHDRAWN' },
];

const typeOptions = [
  { label: '全部', value: '' },
  { label: '全部类型', value: 'ALL' },
  { label: '按角色', value: 'ROLE' },
  { label: '按标签', value: 'TAG' },
  { label: '按组织', value: 'ORGANIZATION' },
];

const priorityOptions = [
  { label: '全部', value: '' },
  { label: '紧急', value: 'URGENT' },
  { label: '高', value: 'HIGH' },
  { label: '普通', value: 'NORMAL' },
  { label: '低', value: 'LOW' },
];

const unreadOptions = [
  { label: '全部', value: '' },
  { label: '未读', value: 'UNREAD' },
  { label: '已读', value: 'READ' },
];

export default function NoticeFilter({ filters, onChange, onSearch, onReset }: NoticeFilterProps) {
  const handleChange = (key: string) => (value: string) => {
    onChange(key, value || undefined);
  };

  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      <Select
        placeholder="状态"
        value={filters.status ?? ''}
        onChange={handleChange('status')}
        options={statusOptions}
        style={{ width: 120 }}
        allowClear
      />
      <Select
        placeholder="类型"
        value={filters.notice_type ?? ''}
        onChange={handleChange('notice_type')}
        options={typeOptions}
        style={{ width: 120 }}
        allowClear
      />
      <Select
        placeholder="优先级"
        value={filters.priority ?? ''}
        onChange={handleChange('priority')}
        options={priorityOptions}
        style={{ width: 120 }}
        allowClear
      />
      <Select
        placeholder="是否未读"
        value={filters.unread ?? ''}
        onChange={handleChange('unread')}
        options={unreadOptions}
        style={{ width: 120 }}
        allowClear
      />
    </FilterBar>
  );
}