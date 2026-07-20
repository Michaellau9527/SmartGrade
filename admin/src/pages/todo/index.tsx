import { useState } from 'react';
import { List, Pagination, Button, message, Space, Alert } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTodoStore } from '@/stores/todo';
import { getTodoList, getTodoStatistics, completeTodo, batchCompleteTodos } from '@/api/todo';
import { PageHeader } from '@/components';
import TodoStatistics from './TodoStatistics';
import TodoFilter from './TodoFilter';
import TodoCard from './TodoCard';
import TodoDetail from './TodoDetail';

export default function TodoPage() {
  const queryClient = useQueryClient();
  const { filters, updateFilters } = useTodoStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: ['todoStatistics'],
    queryFn: getTodoStatistics,
  });

  const {
    data: listData,
    isLoading: listLoading,
  } = useQuery({
    queryKey: ['todoList', filters],
    queryFn: () => getTodoList(filters),
  });

  const completeMutation = useMutation({
    mutationFn: completeTodo,
    onSuccess: () => {
      void message.success('已完成');
      void queryClient.invalidateQueries({ queryKey: ['todoList'] });
      void queryClient.invalidateQueries({ queryKey: ['todoStatistics'] });
    },
    onError: () => {
      void message.error('操作失败');
    },
  });

  const batchCompleteMutation = useMutation({
    mutationFn: batchCompleteTodos,
    onSuccess: () => {
      void message.success('批量完成成功');
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['todoList'] });
      void queryClient.invalidateQueries({ queryKey: ['todoStatistics'] });
    },
    onError: () => {
      void message.error('批量操作失败');
    },
  });

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const handleBatchComplete = () => {
    if (selectedIds.length === 0) {
      void message.warning('请先选择待办事项');
      return;
    }
    batchCompleteMutation.mutate(selectedIds);
  };

  const handleCardClick = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailId(null);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    updateFilters(newFilters);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    updateFilters({ page, pageSize });
  };

  return (
    <div>
      <PageHeader title="待办管理" />

      <TodoStatistics statistics={statistics ?? null} loading={statisticsLoading} />

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <TodoFilter filters={filters} onChange={handleFilterChange} />
      </div>

      {selectedIds.length > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          message={
            <Space>
              <span>已选择 {selectedIds.length} 项</span>
              <Button
                type="primary"
                size="small"
                onClick={handleBatchComplete}
                loading={batchCompleteMutation.isPending}
              >
                批量完成
              </Button>
              <Button size="small" onClick={() => setSelectedIds([])}>
                取消选择
              </Button>
            </Space>
          }
          type="info"
          showIcon
          closable
          onClose={() => setSelectedIds([])}
        />
      )}

      <List
        loading={listLoading}
        dataSource={listData?.list ?? []}
        renderItem={(item) => (
          <TodoCard
            key={item.id}
            todo={item}
            onComplete={handleComplete}
            onClick={handleCardClick}
          />
        )}
        locale={{ emptyText: '暂无待办事项' }}
      />

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Pagination
          current={filters.page ?? 1}
          pageSize={filters.pageSize ?? 10}
          total={listData?.total ?? 0}
          onChange={handlePageChange}
          showSizeChanger
          showTotal={(total) => `共 ${total} 条`}
        />
      </div>

      <TodoDetail
        todoId={detailId}
        open={detailOpen}
        onClose={handleDetailClose}
        onComplete={handleComplete}
      />
    </div>
  );
}
