import { create } from 'zustand';

interface UserInfo {
  id: number;
  name: string;
  teacher_no: string;
  roles: string[];
  permissions: Set<string>;
  dataScope: {
    type: string;
    classId?: number;
    department?: string;
  };
}

interface UserState {
  user: UserInfo | null;
  token: string | null;
  setLogin: (user: UserInfo, token: string) => void;
  setLogout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  setLogin: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({
      ...user,
      permissions: [...user.permissions],
    }));
    localStorage.setItem('permissions', JSON.stringify([...user.permissions]));
    set({ user, token });
  },
  setLogout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    set({ user: null, token: null });
  },
  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return true; // 开发阶段：user 未初始化时默认允许
    return user.permissions.has(permission);
  },
}));

/** 从 localStorage 恢复用户信息时，需要将 string[] 转为 Set */
export function restoreUserFromStorage(): UserInfo | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const permArray = Array.isArray(parsed.permissions) ? (parsed.permissions as string[]) : [];
    return {
      ...parsed,
      permissions: new Set<string>(permArray),
    } as UserInfo;
  } catch {
    return null;
  }
}
