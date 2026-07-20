import { Tag } from 'antd';
import { getStatusMap } from '@/constants/statusMaps';
import type { StatusMapType } from '@/constants/statusMaps';

interface StatusTagProps {
  type: StatusMapType;
  value: string;
  onClick?: () => void;
}

export default function StatusTag({ type, value, onClick }: StatusTagProps) {
  const map = getStatusMap(type);
  const entry = map[value];
  return (
    <Tag
      color={entry?.color || 'default'}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {entry?.label || value}
    </Tag>
  );
}
