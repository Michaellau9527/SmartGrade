/**
 * School — 学校
 *
 * 上游规则：SPRINT2_DOMAIN_RULE_v1.2 §9.1 #6
 * Sprint 1 → Sprint 2 变更：新增字段（code / type / address / principal_name 等）
 *
 * 一个学校 = 系统最高组织单位。
 * 所有业务数据归属于某个 School（未来支持多校 SaaS）。
 */

export interface School {
  /** 主键 UUID */
  id: string;

  /** 学校代码（全局唯一，例如 21070001） */
  code: string;

  /** 学校全称（"辽东湾实验高级中学"） */
  name: string;

  /** 学校简称（"辽东湾高中"） */
  short_name?: string;

  /** 学校类型 */
  type: SchoolType;

  /** 所在省市县（区） */
  province?: string;
  city?: string;
  district?: string;

  /** 详细地址 */
  address?: string;

  /** 校长姓名 */
  principal_name?: string;

  /** 联系电话 */
  contact_phone?: string;

  /** 状态：ACTIVE 正常 / ARCHIVED 归档 */
  status: SchoolStatus;

  /** 创建时间 ISO8601 */
  created_at: string;

  /** 更新时间 ISO8601 */
  updated_at: string;

  /** 逻辑删除标记 */
  deleted_at?: string;
}

/** 学校类型 */
export enum SchoolType {
  HIGH_SCHOOL = 'HIGH_SCHOOL',         // 高中
  JUNIOR_HIGH = 'JUNIOR_HIGH',         // 初中
  NINE_YEAR = 'NINE_YEAR',             // 九年一贯制
  COMPLETE = 'COMPLETE',               // 完全中学
}

/** 学校状态 */
export enum SchoolStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/** Mock 示例 */
export const SCHOOL_MOCK: School = {
  id: 'sch_001',
  code: '21070001',
  name: '辽东湾实验高级中学',
  short_name: '辽东湾高中',
  type: SchoolType.HIGH_SCHOOL,
  province: '辽宁省',
  city: '盘锦市',
  district: '大洼区',
  address: '辽东湾新区学府路1号',
  principal_name: '王校长',
  contact_phone: '0427-12345678',
  status: SchoolStatus.ACTIVE,
  created_at: '2026-07-15T08:00:00+08:00',
  updated_at: '2026-07-15T08:00:00+08:00',
};
