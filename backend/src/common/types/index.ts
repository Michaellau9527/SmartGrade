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
  gradeId?: number;
  classId?: number;
  /** 预留：授课班级 ID 列表，未来扩展任课教师数据范围 */
  classIds?: number[];
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
