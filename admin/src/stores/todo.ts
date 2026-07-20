import { create } from 'zustand';
import type { TodoStatistics, TodoQueryParams } from '@/types/todo';

interface TodoStore {
  statistics: TodoStatistics | null;
  loading: boolean;
  filters: TodoQueryParams;
  setStatistics: (s: TodoStatistics) => void;
  setLoading: (l: boolean) => void;
  updateFilters: (f: Partial<TodoQueryParams>) => void;
  resetFilters: () => void;
}

const defaultFilters: TodoQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useTodoStore = create<TodoStore>((set) => ({
  statistics: null,
  loading: false,
  filters: { ...defaultFilters },
  setStatistics: (s: TodoStatistics) => set({ statistics: s }),
  setLoading: (l: boolean) => set({ loading: l }),
  updateFilters: (f: Partial<TodoQueryParams>) =>
    set((state) => ({
      filters: { ...state.filters, ...f },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
