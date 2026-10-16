import { Select, Input } from 'antd';
import { useQuery } from '@tanstack/react-query';
import FilterBar from '@/components/FilterBar';
import { getClassList } from '@/api/class';

interface StudentFilterProps {
  filters: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
}

/**
 * 状态筛选值 = 后端 QueryStudentDto.status 筛选口径
 * （IN_SCHOOL / PENDING_LEAVE / LEFT_SCHOOL，服务端映射到 currentStatus）。
 */
const statusOptions = [
  { label: '在校', value: 'IN_SCHOOL' },
  { label: '请假中', value: 'PENDING_LEAVE' },
  { label: '离校', value: 'LEFT_SCHOOL' },
];

const genderOptions = [
  { label: '全部性别', value: '' },
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
];

/** 住宿类型枚举对齐后端：BOARDING | DAY_STUDENT（旧 'DAY' 已废弃） */
const boardingOptions = [
  { label: '住校', value: 'BOARDING' },
  { label: '走读', value: 'DAY_STUDENT' },
];

export default function StudentFilter({ filters, onChange, onSearch, onReset }: StudentFilterProps) {
  const handleChange = (key: string) => (value: string) => {
    onChange(key, value || undefined);
  };

  // 班级下拉来自真实班级列表接口（生产 class.id 为 cuid/UUID 字符串）
  const { data: classData } = useQuery({
    queryKey: ['classListForFilter'],
    queryFn: () => getClassList({ page: 1, pageSize: 100 }),
  });
  const classOptions = (classData?.list ?? []).map((c) => ({
    value: c.id,
    label: c.grade?.name ? `${c.grade.name} ${c.name}` : c.name,
  }));

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
        showSearch
        optionFilterProp="label"
        loading={!classData}
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
