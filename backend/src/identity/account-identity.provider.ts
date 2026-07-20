/**
 * AccountIdentityProvider — 账号 + 密码身份操作（管理后台）
 *
 * 上游规则：Sprint 2.1 Day 4 拍板 1 + 刘老师 2026-07-20 最终定稿
 */

import { compare } from 'bcryptjs';
import type { IdentityProvider } from '@prisma/client';
import {
  IIdentityProvider,
  IdentityContext,
  IdentityError,
  IdentityInput,
  IdentityResult,
} from './identity-provider';
import { IdentityRepository } from '../repositories/identity.repository';
import { UserRepository } from '../repositories/user.repository';

const ALLOWED_USER_TYPES = new Set(['SYSTEM_ADMIN', 'TEACHER']);

export class AccountIdentityProvider implements IIdentityProvider {
  readonly provider: IdentityProvider = 'ACCOUNT';

  constructor(
    private identityRepository: IdentityRepository,
    private userRepository: UserRepository
  ) {}

  async login(input: IdentityInput, _context: IdentityContext): Promise<IdentityResult> {
    if (input.provider !== 'ACCOUNT') {
      throw new IdentityError('INVALID_CREDENTIALS', 'AccountIdentityProvider 收到非 ACCOUNT 入参');
    }

    const { username, password } = input;

    if (!username || !password) {
      throw new IdentityError('INVALID_CREDENTIALS', '用户名或密码不能为空');
    }

    const identity = await this.identityRepository.findByProvider('ACCOUNT', username);

    if (!identity) {
      throw new IdentityError('USER_NOT_FOUND', '用户名或密码错误');
    }

    if (identity.status !== 'ACTIVE') {
      throw new IdentityError('USER_DISABLED', '该账号已禁用');
    }

    if (!identity.credentialHash) {
      throw new IdentityError('INVALID_CREDENTIALS', '账号凭证异常（无密码哈希）');
    }

    const passwordOk = await compare(password, identity.credentialHash);
    if (!passwordOk) {
      throw new IdentityError('INVALID_CREDENTIALS', '用户名或密码错误');
    }

    const user = await this.userRepository.findById(identity.userId);
    if (!user) {
      throw new IdentityError('USER_NOT_FOUND', '用户不存在');
    }
    if (user.status !== 'ACTIVE') {
      throw new IdentityError('USER_DISABLED', '用户已被冻结或锁定');
    }
    if (!ALLOWED_USER_TYPES.has(user.userType)) {
      throw new IdentityError(
        'INVALID_CREDENTIALS',
        `用户类型 ${user.userType} 不允许使用账号登录`
      );
    }

    return {
      userId: identity.userId,
      provider: 'ACCOUNT',
      externalId: username,
      isNewIdentity: false,
      nextStep: 'NONE',
    };
  }
}
