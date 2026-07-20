import { create } from 'zustand';

interface LeaveStore {
  draftFilters: Record<string, string | undefined>;
  appliedFilters: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  setDraftFilter: (key: string, value: string | undefined) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setPage: (page: number, pageSize: number) => void;
}

export const useLeaveStore = create<LeaveStore>((set) => ({
  draftFilters: {},
  appliedFilters: {},
  page: 1,
  pageSize: 10,
  setDraftFilter: (key, value) =>
    set((state) => ({
      draftFilters: { ...state.draftFilters, [key]: value },
    })),
  applyFilters: () =>
    set((state) => ({
      appliedFilters: { ...state.draftFilters },
      page: 1,
    })),
  resetFilters: () =>
    set({
      draftFilters: {},
      appliedFilters: {},
      page: 1,
    }),
  setPage: (page, pageSize) => set({ page, pageSize }),
}));
