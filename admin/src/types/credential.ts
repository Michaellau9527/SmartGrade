// 学生身份二维码凭证（F1 后端已上线：POST/DELETE/GET /student-credentials）

/** 有效凭证元数据（绝不包含令牌哈希） */
export interface CredentialActiveMeta {
  id: string;
  version: number;
  issuedBy: string;
  issuedAt: string;
  lastVerifiedAt: string | null;
  lastVerifiedBy: string | null;
}

/** 凭证状态查询返回 */
export interface CredentialStatus {
  studentId: string;
  /** 当前是否存在有效凭证 */
  hasActive: boolean;
  /** 有效凭证元数据，无有效凭证时为 null */
  active: CredentialActiveMeta | null;
  /** 历史签发总数（含已撤销） */
  totalIssued: number;
}

/** 签发/补发返回：token 明文仅此一次返回，用于生成二维码 */
export interface IssueCredentialResult {
  credentialId: string;
  version: number;
  token: string;
}

/** 撤销返回 */
export interface RevokeCredentialResult {
  studentId: string;
  /** 实际撤销数量（0 表示本就无有效凭证，幂等） */
  revokedCount: number;
}
