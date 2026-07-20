import { useState } from 'react';
import { Button, Space } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  onSearch?: () => void;
  onReset?: () => void;
  loading?: boolean;
  maxRows?: number;
}

export default function FilterBar({ children, onSearch, onReset, loading, maxRows = 2 }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: expanded ? 'wrap' : undefined,
          gap: 12,
          alignItems: 'center',
          maxHeight: expanded ? undefined : maxRows * 40,
          overflow: expanded ? 'visible' : 'hidden',
          transition: 'max-height 0.3s',
        }}
      >
        {children}
      </div>
      <Space style={{ marginTop: 8 }}>
        <Button type="primary" loading={loading} onClick={onSearch}>
          查询
        </Button>
        <Button onClick={onReset}>
          重置
        </Button>
        <Button
          type="link"
          onClick={() => setExpanded(!expanded)}
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
        >
          {expanded ? '收起' : '展开'}
        </Button>
      </Space>
    </div>
  );
}