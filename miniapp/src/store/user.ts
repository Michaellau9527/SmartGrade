import { create } from 'zustand';
import Taro from '@tarojs/taro';

/** 用户基本信息（仅存需要持久化的字段） */
export interface UserInfo {
  token: string;
  teacherNo: string;
  teacherName: string;
  roles: string[];
  permissions: string[];
}

interface UserState extends UserInfo {
  /** 写入用户信息并同步持久化到 Taro storage */
  setUserInfo: (data: UserInfo) => void;
  /** 退出登录，清空 state 与 storage */
  logout: () => void;
  /** 是否已登录（持有 token） */
  hasToken: () => boolean;
}

const TOKEN_KEY = 'token';
const TEACHER_NO_KEY = 'teacherNo';
const TEACHER_NAME_KEY = 'teacherName';
const ROLES_KEY = 'roles';
const PERMISSIONS_KEY = 'permissions';

function readString(key: string): string {
  const v = Taro.getStorageSync(key);
  return typeof v === 'string' ? v : '';
}

function readStringArray(key: string): string[] {
  const v = Taro.getStorageSync(key);
  return Array.isArray(v) ? (v as string[]) : [];
}

const initialToken = readString(TOKEN_KEY);

export const useUserStore = create<UserState>((set, get) => ({
  token: initialToken,
  teacherNo: readString(TEACHER_NO_KEY),
  teacherName: readString(TEACHER_NAME_KEY),
  roles: readStringArray(ROLES_KEY),
  permissions: readStringArray(PERMISSIONS_KEY),

  setUserInfo(data) {
    Taro.setStorageSync(TOKEN_KEY, data.token);
    Taro.setStorageSync(TEACHER_NO_KEY, data.teacherNo);
    Taro.setStorageSync(TEACHER_NAME_KEY, data.teacherName);
    Taro.setStorageSync(ROLES_KEY, data.roles);
    Taro.setStorageSync(PERMISSIONS_KEY, data.permissions);
    set({
      token: data.token,
      teacherNo: data.teacherNo,
      teacherName: data.teacherName,
      roles: data.roles,
      permissions: data.permissions
    });
  },

  logout() {
    Taro.removeStorageSync(TOKEN_KEY);
    Taro.removeStorageSync(TEACHER_NO_KEY);
    Taro.removeStorageSync(TEACHER_NAME_KEY);
    Taro.removeStorageSync(ROLES_KEY);
    Taro.removeStorageSync(PERMISSIONS_KEY);
    set({
      token: '',
      teacherNo: '',
      teacherName: '',
      roles: [],
      permissions: []
    });
  },

  hasToken() {
    return !!get().token;
  }
}));

export default useUserStore;
