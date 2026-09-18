import { request } from '../utils/request';

/**
 * 教师管理 API（P1-13 Gate F）
 *
 * 本文件服务「管理员发起微信绑定」：
 * - listTeachers      ：分页拉取教师列表（绑定管理页消费）
 * - initTeacherWechatBinding：对目标教师发起一次性绑定，返回绑定码（仅此一次）
 *
 * 后端已在 Gate D 提供 init 路由（JWT + teacher:bind-wechat + Service 层 DataScope）。
 * 本文件只做封装，不做权限判断；页面负责按 roles/permissions 门控入口与操作。
 *
 * 安全约束（前端侧）：
 * - 后端教师列表接口返回的是完整 teacher 行（含 phone/email 等字段），
 *   本文件类型只声明展示所需的少量字段，页面**不得渲染**敏感列；
 * - 绑定码只在内存中流转展示，**不写入 storage、不输出日志**。
 */

/** 教师列表行（仅声明绑定管理页需要的字段，避免误渲染敏感列） */
export interface TeacherListItem {
  id: string;
  teacherNo: string;
  name: string;
  /** ACTIVE / RESIGNED ... */
  status: string;
  /** 是否存在微信绑定（后端返回 openid 原文，页面只做"有/无"判断，禁止展示） */
  bound: boolean;
}

/** 后端原始 teacher 行（含全量列）——内部类型，页面不得直接使用其中敏感字段 */
interface RawTeacher {
  id: string;
  teacherNo: string;
  name: string;
  status: string;
  wechatOpenid: string | null;
  [key: string]: unknown;
}

/** init 返回：一次性绑定码（明文仅此一次）+ 有效期 + 目标教师 */
export interface InitWechatBindingResult {
  bindingToken: string;
  expiresIn: number;
  teacherId: string;
}

/** 分页响应形状（与后端 TeacherService.findAll 对齐） */
interface TeacherPageResponse {
  list: RawTeacher[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页拉取教师列表。
 * @param page    从 1 开始
 * @param pageSize 默认 20，后端上限 100
 */
export async function listTeachers(
  page = 1,
  pageSize = 20
): Promise<{ list: TeacherListItem[]; total: number; page: number; pageSize: number }> {
  const res = await request<TeacherPageResponse>('/teachers', {
    method: 'GET',
    data: { page, pageSize }
  });
  return {
    total: res.total,
    page: res.page,
    pageSize: res.pageSize,
    // 克制映射：只保留展示所需字段；wechatOpenid 原文一律不落到页面状态
    list: res.list.map((t) => ({
      id: t.id,
      teacherNo: t.teacherNo,
      name: t.name,
      status: t.status,
      bound: !!t.wechatOpenid
    }))
  };
}

/**
 * 对指定教师发起微信绑定（管理员/年级主任/政教）。
 * 返回的一次性绑定码仅此一次可见，10 分钟内有效。
 */
export function initTeacherWechatBinding(teacherId: string): Promise<InitWechatBindingResult> {
  return request<InitWechatBindingResult>(`/teachers/${teacherId}/bind-wechat/init`, {
    method: 'POST'
  });
}
