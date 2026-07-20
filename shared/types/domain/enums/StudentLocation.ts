/**
 * StudentLocation — 学生当前位置枚举
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §2.5.1.2
 *
 * 回答的问题：「学生物理上在哪里？」
 *
 * ⚠️ v1.2 新增字段，v1.1 无此字段。
 *
 * 永久冻结：6 位置
 */
export type StudentLocation =
  | 'CLASSROOM'        // 教室
  | 'DORM'             // 宿舍
  | 'PLAYGROUND'       // 操场
  | 'GATE'             // 校门
  | 'OFF_CAMPUS'       // 校外
  | 'UNKNOWN';         // 未知

/** 位置显示文本 */
export const StudentLocationText: Record<StudentLocation, string> = {
  CLASSROOM: '教室',
  DORM: '宿舍',
  PLAYGROUND: '操场',
  GATE: '校门',
  OFF_CAMPUS: '校外',
  UNKNOWN: '未知',
};

/** 位置颜色（前端 Tag 用） */
export const StudentLocationColor: Record<StudentLocation, string> = {
  CLASSROOM: 'blue',
  DORM: 'purple',
  PLAYGROUND: 'cyan',
  GATE: 'gold',
  OFF_CAMPUS: 'orange',
  UNKNOWN: 'default',
};

/** 是否在校园内的位置（用于 isActuallyInSchool 判断） */
export const IN_CAMPUS_LOCATIONS: StudentLocation[] = [
  'CLASSROOM',
  'DORM',
  'PLAYGROUND',
  'GATE',
];
