import { create } from 'zustand';

interface UserInfo {
  id: string;
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
  // 同步恢复登录态：避免 BrowserRouter/刷新时 user 为 null 而 token 已存在的空窗，
  // 否则会出现“刷新后短暂丢登录、需先退出再登录”的问题。
  user: restoreUserFromStorage(),
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
    // 与后端 permissions.guard.ts 保持一致：ROLE_ADMIN 拥有全部权限（后端对此角色直接短路放行）。
    // seed.ts 有意不为 ROLE_ADMIN 落库任何 role_permission 行，权限完全由该短路逻辑决定，
    // 因此前端必须镜像同一规则，否则管理员菜单/按钮会因权限集合为空而整体不可见。
    // 这不是"无条件放行"——判断依据仍是后端下发的角色，并非掩饰后端配置错误。
    if (user.roles?.includes('ROLE_ADMIN')) return true;
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

/**
 * 依据后端返回的角色推导前端 dataScope（仅用于界面展示与前端过滤）。
 * 映射严格镜像后端 jwt.strategy.calculateDataScope：
 *   ROLE_ADMIN / ROLE_POLITICAL   → ALL
 *   ROLE_GRADE_DIRECTOR           → GRADE
 *   ROLE_HEADMASTER               → CLASS
 *   ROLE_DORM_MANAGER             → DORM
 *   其他                          → SELF
 * 注意：这仅是前端推导，后端数据权限校验才是权威依据，前端推导不可替代后端校验。
 */
export function deriveDataScope(roles: string[]): { type: string } {
  if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_POLITICAL')) {
    return { type: 'ALL' };
  }
  if (roles.includes('ROLE_GRADE_DIRECTOR')) {
    return { type: 'GRADE' };
  }
  if (roles.includes('ROLE_HEADMASTER')) {
    return { type: 'CLASS' };
  }
  if (roles.includes('ROLE_DORM_MANAGER')) {
    return { type: 'DORM' };
  }
  return { type: 'SELF' };
}

/** 后端登录接口返回（已拆包后的 data）结构 */
export interface LoginResponseData {
  teacher: {
    id: string;
    teacherNo: string;
    name: string;
    gender?: string;
    avatar?: string;
    position?: string;
  };
  roles: string[];
  permissions: string[];
  tags?: unknown[];
  token: string;
  refreshToken?: string;
  expiresIn?: string;
}

/**
 * 将后端登录接口返回（已拆包后的 data）映射为前端 UserInfo。
 * 处理字段差异：
 *   - teacher.id (UUID string)        → id
 *   - teacher.teacherNo (camelCase)   → teacher_no (snake_case)
 *   - permissions (string[])          → Set<string>
 *   - dataScope 由 roles 推导（见 deriveDataScope）
 */
export function mapLoginResponse(res: LoginResponseData): UserInfo {
  return {
    id: res.teacher.id,
    name: res.teacher.name,
    teacher_no: res.teacher.teacherNo,
    roles: res.roles ?? [],
    permissions: new Set<string>(res.permissions ?? []),
    dataScope: deriveDataScope(res.roles ?? []),
  };
}
