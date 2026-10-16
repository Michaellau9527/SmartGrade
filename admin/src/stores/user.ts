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

/** 解析 JWT 载荷（仅 base64 解码，不校验签名）；解析失败返回 null */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 判断 token 是否「可确定为已过期」。
 * - 仅在能解析出数值 `exp` 且已过期（含 30s 时钟偏移）时返回 true；
 * - 非 JWT / 无 exp / 解析失败一律返回 false，交由后端 401 兜底。
 * 这样既能清掉过期 token（消除“幽灵登录态”），又不会误清仍在有效期内的 token。
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;
  return exp * 1000 < Date.now() - 30_000;
}

// 启动时检验持久化的 token：若确定已过期，清空存储，避免把过期 token 当成“已登录”，
// 否则首开后台会进入受保护页面（随之 401），表现为“页面异常、需要先退出再登录”。
const initialToken = localStorage.getItem('token');
const initialExpired = isTokenExpired(initialToken);
if (initialExpired) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');
}

export const useUserStore = create<UserState>((set, get) => ({
  // 同步恢复登录态：避免刷新时 user 为 null 而 token 已存在的空窗，
  // 否则会出现“刷新后短暂丢登录、需先退出再登录”的问题。
  // 注意：仅恢复「未过期」的 token，过期 token 已在上面被清理。
  user: initialExpired ? null : restoreUserFromStorage(),
  token: initialExpired ? null : initialToken,
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
