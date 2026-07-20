/**
 * PhoneIdentityProvider — 手机号 + 验证码身份操作
 *
 * 上游规则：Sprint 2.1 Day 4 拍板 1 + 刘老师 2026-07-20 最终定稿
 */

import type { IdentityProvider } from '@prisma/client';
import {
  IIdentityProvider,
  IdentityContext,
  IdentityError,
  IdentityInput,
  IdentityResult,
} from './identity-provider';
import { IdentityRepository } from '../repositories/identity.repository';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

const MOCK_VERIFICATION_CODE = '123456';

export class PhoneIdentityProvider implements IIdentityProvider {
  readonly provider: IdentityProvider = 'PHONE';

  constructor(private identityRepository: IdentityRepository) {}

  async login(input: IdentityInput, _context: IdentityContext): Promise<IdentityResult> {
    if (input.provider !== 'PHONE') {
      throw new IdentityError('INVALID_PHONE', 'PhoneIdentityProvider 收到非 PHONE 入参');
    }

    const { phone, code } = input;

    if (!PHONE_REGEX.test(phone)) {
      throw new IdentityError('INVALID_PHONE', `手机号格式错误：${phone}`);
    }

    if (code !== MOCK_VERIFICATION_CODE) {
      throw new IdentityError('INVALID_CODE', '验证码错误');
    }

    const identity = await this.identityRepository.findByProvider('PHONE', phone);

    if (identity) {
      if (identity.status !== 'ACTIVE') {
        throw new IdentityError('USER_DISABLED', '该手机号身份已禁用');
      }
      if (!identity.verified) {
        await this.identityRepository.verify(identity.id);
      }
      return {
        userId: identity.userId,
        provider: 'PHONE',
        externalId: phone,
        isNewIdentity: false,
        nextStep: 'NONE',
      };
    }

    throw new IdentityError(
      'USER_NOT_FOUND',
      `手机号 ${phone} 未注册。请联系学校开通账号。`
    );
  }
}
