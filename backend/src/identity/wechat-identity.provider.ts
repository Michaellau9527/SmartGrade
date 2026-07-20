/**
 * WechatIdentityProvider — 微信小程序 OAuth 身份操作
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

export class WechatIdentityProvider implements IIdentityProvider {
  readonly provider: IdentityProvider = 'WECHAT';

  constructor(private identityRepository: IdentityRepository) {}

  async login(input: IdentityInput, _context: IdentityContext): Promise<IdentityResult> {
    if (input.provider !== 'WECHAT') {
      throw new IdentityError('WECHAT_NOT_BOUND', 'WechatIdentityProvider 收到非 WECHAT 入参');
    }

    const { code } = input;

    if (!code || code.length < 5) {
      throw new IdentityError('WECHAT_NOT_BOUND', '微信 code 无效');
    }

    const openid = `mock_openid_${code}`;

    const identity = await this.identityRepository.findByProvider('WECHAT', openid);

    if (identity) {
      if (identity.status !== 'ACTIVE') {
        throw new IdentityError('USER_DISABLED', '该微信身份已禁用');
      }
      return {
        userId: identity.userId,
        provider: 'WECHAT',
        externalId: openid,
        isNewIdentity: false,
        nextStep: 'NONE',
      };
    }

    throw new IdentityError(
      'WECHAT_NOT_BOUND',
      '该微信未绑定任何账号。请先在后台绑定微信。'
    );
  }
}
