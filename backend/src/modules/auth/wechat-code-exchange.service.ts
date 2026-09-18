import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 微信 code → openid / unionid 换码结果
 *
 * unionid 在微信未开放 UnionID 机制（或未绑定开放平台）时不会返回，
 * 此时为 undefined —— 严禁伪造。
 */
export interface WechatCodeExchangeResult {
  openid: string;
  unionid?: string;
}

/**
 * WechatCodeExchangeService — 微信 jscode2session 换码唯一入口（P1-13 Gate C）
 *
 * 背景：原先该逻辑是 AuthService 的私有方法 exchangeWechatOpenid，
 * 只返回 openid（丢弃 unionid）。P1-13 教师微信绑定同样需要 code → openid，
 * 为避免复制出第二份微信换码代码，将其抽取为本服务，由登录与绑定共用。
 *
 * 约束：
 * - 环境变量沿用既有 WECHAT_APPID / WECHAT_SECRET，不新增第二套微信配置
 * - 错误语义与原 AuthService.exchangeWechatOpenid 完全一致（同一异常类型与文案），
 *   不修改 /auth/login 的任何对外契约
 */
@Injectable()
export class WechatCodeExchangeService {
  private readonly logger = new Logger('WechatCodeExchangeService');

  constructor(private configService: ConfigService) {}

  /**
   * 用 wx.login() 的临时 code 换取 openid / unionid
   *
   * 错误语义（与迁移前逐条对齐）：
   * - 缺少 code                    → 401 缺少微信登录 code
   * - 未配置 AppID/Secret          → 401 微信登录未配置
   * - 请求微信接口失败（网络等）   → 401 微信登录服务暂不可用
   * - 微信返回 errcode             → 401 微信登录校验失败
   * - 微信未返回 openid            → 401 微信登录未返回 openid
   */
  async exchange(code: string): Promise<WechatCodeExchangeResult> {
    if (!code) {
      throw new UnauthorizedException('缺少微信登录 code');
    }

    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');

    if (!appid || !secret) {
      this.logger.error('微信登录未配置 WECHAT_APPID / WECHAT_SECRET');
      throw new UnauthorizedException('微信登录未配置');
    }

    const url =
      `https://api.weixin.qq.com/sns/jscode2session` +
      `?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    let data: { openid?: string; unionid?: string; errcode?: number; errmsg?: string };
    try {
      const resp = await fetch(url);
      data = (await resp.json()) as typeof data;
    } catch (err) {
      this.logger.error(`微信 jscode2session 请求失败: ${String(err)}`);
      throw new UnauthorizedException('微信登录服务暂不可用');
    }

    if (data.errcode) {
      this.logger.error(`微信 jscode2session 失败: ${data.errcode} ${data.errmsg}`);
      throw new UnauthorizedException('微信登录校验失败');
    }
    if (!data.openid) {
      throw new UnauthorizedException('微信登录未返回 openid');
    }

    // unionid 缺失时不写入该字段（保持 undefined），不伪造
    return data.unionid
      ? { openid: data.openid, unionid: data.unionid }
      : { openid: data.openid };
  }
}
