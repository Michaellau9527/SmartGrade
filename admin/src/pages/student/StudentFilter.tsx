import { Select, Input } from 'antd';
import FilterBar from '@/components/FilterBar';

interface StudentFilterProps {
  filters: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
}

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '在校', value: 'IN_SCHOOL' },
  { label: '待离校', value: 'PENDING_LEAVE' },
  { label: '离校', value: 'LEFT_SCHOOL' },
  { label: '休学', value: 'SUSPENDED' },
  { label: '毕业', value: 'GRADUATED' },
];

const classOptions = [
  { label: '全部班级', value: '' },
  { label: '高一(1)班', value: '1' },
  { label: '高一(2)班', value: '2' },
  { label: '高一(3)班', value: '3' },
  { label: '高二(1)班', value: '4' },
  { label: '高二(2)班', value: '5' },
];

const genderOptions = [
  { label: '全部性别', value: '' },
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
];

const boardingOptions = [
  { label: '全部住宿', value: '' },
  { label: '住校', value: 'BOARDING' },
  { label: '走读', value: 'DAY' },
];

export default function StudentFilter({ filters, onChange, onSearch, onReset }: StudentFilterProps) {
  const handleChange = (key: string) => (value: string) => {
    onChange(key, value || undefined);
  };

  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      <Select
        placeholder="学生状态"
        value={filters.status ?? ''}
        onChange={handleChange('status')}
        options={statusOptions}
        style={{ width: 140 }}
        allowClear
      />
      <Select
        placeholder="班级"
        value={filters.classId ?? ''}
        onChange={handleChange('classId')}
        options={classOptions}
        style={{ width: 160 }}
        allowClear
      />
      <Select
        placeholder="性别"
        value={filters.gender ?? ''}
        onChange={handleChange('gender')}
        options={genderOptions}
        style={{ width: 120 }}
        allowClear
      />
      <Select
        placeholder="住宿类型"
        value={filters.boardingType ?? ''}
        onChange={handleChange('boardingType')}
        options={boardingOptions}
        style={{ width: 120 }}
        allowClear
      />
      <Input.Search
        placeholder="姓名/学号"
        value={filters.keyword ?? ''}
        onChange={(e) => onChange('keyword', e.target.value || undefined)}
        onSearch={onSearch}
        style={{ width: 200 }}
        allowClear
      />
    </FilterBar>
  );
}
