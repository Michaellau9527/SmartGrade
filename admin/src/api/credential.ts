import { request } from '@/utils/request';
import type {
  CredentialStatus,
  IssueCredentialResult,
  RevokeCredentialResult,
} from '@/types/credential';

/**
 * 签发 / 补发学生身份二维码凭证
 * 路径：POST /api/v1/student-credentials（@RequirePermissions('student:qrcode:issue')）
 * 入参：{ studentId }
 * 返回：{ credentialId, version, token }，token 明文仅此一次，生成二维码后前端不再缓存
 */
export function issueCredential(studentId: string): Promise<IssueCredentialResult> {
  return request.post('/student-credentials', { studentId });
}

/**
 * 撤销该学生当前全部有效凭证（幂等）
 * 路径：DELETE /api/v1/student-credentials/students/:studentId
 */
export function revokeCredential(studentId: string): Promise<RevokeCredentialResult> {
  return request.delete(`/student-credentials/students/${studentId}`);
}

/**
 * 查询学生凭证状态（不含任何令牌信息）
 * 路径：GET /api/v1/student-credentials/students/:studentId
 */
export function getCredentialStatus(studentId: string): Promise<CredentialStatus> {
  return request.get(`/student-credentials/students/${studentId}`);
}
