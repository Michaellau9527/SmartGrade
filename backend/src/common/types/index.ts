/**
 * 数据范围类型
 *
 * ALL: 全校（管理员、政教）
 * GRADE: 本年级（年级主任）
 * CLASS: 本班（班主任）
 * DORM: 住宿生（宿管）
 * SELF: 仅个人（任课教师）- 预留授课班级扩展
 */
export type DataScopeType = 'ALL' | 'GRADE' | 'CLASS' | 'DORM' | 'SELF';

/**
 * 数据范围对象
 *
 * Guard 根据角色自动计算并附加到 request.user
 */
export interface DataScope {
  type: DataScopeType;
  /** 年级 ID（cuid 字符串，与数据库一致） */
  gradeId?: string;
  /** 班级 ID（cuid 字符串，与数据库一致） */
  classId?: string;
  /** 可管理的班级 ID 列表（cuid 字符串），用于多班级/年级场景 */
  classIds?: string[];
}

/**
 * 当前用户信息 Payload
 *
 * JwtStrategy validate 返回，附加到 request.user
 */
export interface CurrentUserPayload {
  /** 教师ID */
  id: number;
  /** 教师工号 */
  teacherNo: string;
  /** 姓名 */
  name: string;
  /** 角色编码列表 */
  roles: string[];
  /** 权限编码列表 */
  permissions: string[];
  /** 数据范围 */
  dataScope: DataScope;
}
