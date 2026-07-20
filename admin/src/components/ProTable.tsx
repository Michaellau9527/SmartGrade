import { Table, Empty, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { ReactNode } from 'react';

interface ProTableProps<T extends Record<string, unknown>> {
  columns: ColumnsType<T>;
  dataSource: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  onChange?: (page: number, pageSize: number) => void;
  onRow?: (record: T) => Record<string, unknown>;
  scroll?: { x?: number; y?: number };
  headerTitle?: ReactNode;
  extra?: ReactNode;
  toolbar?: ReactNode;
  pagination?: false;
}

export default function ProTable<T extends Record<string, unknown>>(props: ProTableProps<T>) {
  const {
    columns,
    dataSource,
    total,
    page,
    pageSize,
    loading,
    rowKey = 'id',
    onChange,
    onRow,
    scroll,
    headerTitle,
    extra,
    toolbar,
    pagination,
  } = props;

  const paginationConfig: TablePaginationConfig | false = pagination === false
    ? false
    : {
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (t: number) => `共 ${t} 条`,
        onChange: (p: number, ps: number) => {
          onChange?.(p, ps);
        },
      };

  return (
    <div>
      {(headerTitle || extra || toolbar) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{headerTitle}</span>
          <Space>{extra || toolbar}</Space>
        </div>
      )}
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        scroll={scroll}
        onRow={onRow}
        pagination={paginationConfig}
        locale={{ emptyText: <Empty description="暂无数据" /> }}
      />
    </div>
  );
}