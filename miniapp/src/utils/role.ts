/**
 * 角色辅助模块
 * 集中维护"角色 code <-> 中文标签 / 主页布局类型"的映射
 */

/** 后端返回的角色 code */
export type RoleCode =
  | 'ROLE_ADMIN'
  | 'ROLE_HEADMASTER'
  | 'ROLE_SUBJECT_TEACHER'
  | 'ROLE_GRADE_DIRECTOR'
  | 'ROLE_POLITICAL'
  | string;

/** 首页布局 key（决定渲染哪种工作台） */
export type WorkbenchLayout =
  | 'headmaster'      // 班主任
  | 'subjectTeacher'  // 课任教师
  | 'gradeDirector'   // 年级主任
  | 'political'       // 政教老师
  | 'default';        // 未识别角色 -> 通用兜底

/** 中文标签映射 */
export const ROLE_LABEL: Record<string, string> = {
  ROLE_ADMIN: '系统管理员',
  ROLE_HEADMASTER: '班主任',
  ROLE_SUBJECT_TEACHER: '课任教师',
  ROLE_GRADE_DIRECTOR: '年级主任',
  ROLE_POLITICAL: '政教老师'
};

/** 角色 -> 布局 */
const ROLE_TO_LAYOUT: Record<string, WorkbenchLayout> = {
  ROLE_HEADMASTER: 'headmaster',
  ROLE_SUBJECT_TEACHER: 'subjectTeacher',
  ROLE_GRADE_DIRECTOR: 'gradeDirector',
  ROLE_POLITICAL: 'political'
};

/**
 * 从 roles 数组中解析出首页布局类型
 * 规则：按优先级（高 -> 低）匹配第一个已知角色
 *   ROLE_HEADMASTER > ROLE_GRADE_DIRECTOR > ROLE_POLITICAL > ROLE_SUBJECT_TEACHER
 * 未命中返回 'default'
 */
export function resolveLayout(roles: string[] | undefined | null): WorkbenchLayout {
  if (!roles || roles.length === 0) return 'default';
  const priority: RoleCode[] = [
    'ROLE_HEADMASTER',
    'ROLE_GRADE_DIRECTOR',
    'ROLE_POLITICAL',
    'ROLE_SUBJECT_TEACHER'
  ];
  for (const r of priority) {
    if (roles.includes(r)) return ROLE_TO_LAYOUT[r] || 'default';
  }
  // 任何 ROLE_ 开头的就当 default，避免完全空白
  const hasAny = roles.some((r) => typeof r === 'string' && r.startsWith('ROLE_'));
  return hasAny ? 'default' : 'default';
}

/** 角色数组 -> 中文标签数组（去重 + 按 ROLE_LABEL 顺序） */
export function resolveRoleLabels(roles: string[] | undefined | null): string[] {
  if (!roles || roles.length === 0) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of roles) {
    if (!seen.has(r)) {
      seen.add(r);
      ordered.push(r);
    }
  }
  return ordered.map((r) => ROLE_LABEL[r] || r.replace(/^ROLE_/, ''));
}

/** 角色数组 -> 所属班级/部门/年级（mock，等真实数据接入后再替换） */
export function resolveAffiliation(
  roles: string[] | undefined | null,
  teacherNo: string
): string {
  if (!roles || roles.length === 0) return teacherNo || '';
  if (roles.includes('ROLE_HEADMASTER')) return '高一年级 · 三年二班';
  if (roles.includes('ROLE_GRADE_DIRECTOR')) return '高一年级 · 主任办公室';
  if (roles.includes('ROLE_POLITICAL')) return '政教处';
  if (roles.includes('ROLE_SUBJECT_TEACHER')) return '数学组 · 三年二班 / 三年三班';
  return '智慧校园';
}
