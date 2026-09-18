/**
 * 测试 10: P1-13 Gate C — WechatCodeExchangeService 抽取与登录链路零变更
 *
 * 验收要求：
 * 1. ✅ exchange() 正常返回 { openid, unionid }
 * 2. ✅ 微信未返回 unionid 时为 undefined（不伪造）
 * 3. ✅ 缺少 code / 未配置 / 请求失败 / errcode / 无 openid，五类错误语义与迁移前逐条一致
 * 4. ✅ 环境变量仍为 WECHAT_APPID / WECHAT_SECRET，不存在第二套微信配置
 * 5. ✅ AuthService.loginByWechat 改为调用 WechatCodeExchangeService（不再自带换码实现）
 * 6. ✅ 登录对外行为不变：未绑定文案、inactive 拒绝、ACTIVE 签发 JWT
 */

import { UnauthorizedException } from '@nestjs/common';
import { setupPrismaMock } from './helpers/mock-prisma';

setupPrismaMock();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WechatCodeExchangeService } = require('../modules/auth/wechat-code-exchange.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthService } = require('../modules/auth/auth.service');

describe('P1-13 Gate C: WechatCodeExchangeService', () => {
  let configGet: jest.Mock;
  let service: any;

  beforeEach(() => {
    configGet = jest.fn((key: string, defaultValue?: any) => {
      if (key === 'WECHAT_APPID') return 'wxa5cadd32eecb6de1';
      if (key === 'WECHAT_SECRET') return 'test_secret';
      return defaultValue;
    });
    service = new WechatCodeExchangeService({ get: configGet } as any);
    (global as any).fetch = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  const mockWechat = (payload: any) => {
    (global as any).fetch = jest.fn().mockResolvedValue({ json: async () => payload });
  };

  it('1. 正常换码返回 openid + unionid', async () => {
    mockWechat({ openid: 'OPENID_001', unionid: 'UNIONID_001' });
    const r = await service.exchange('CODE_001');
    expect(r).toEqual({ openid: 'OPENID_001', unionid: 'UNIONID_001' });
  });

  it('2. 微信未返回 unionid 时为 undefined，不伪造', async () => {
    mockWechat({ openid: 'OPENID_002' });
    const r = await service.exchange('CODE_002');
    expect(r.openid).toBe('OPENID_002');
    expect(r.unionid).toBeUndefined();
    // 关键：微信没给 unionid 时，结果对象里不应出现该字段（不允许塞 null/空串伪造）
    expect('unionid' in r).toBe(false);
  });

  it('3. 请求 URL 使用 WECHAT_APPID / WECHAT_SECRET（无第二套配置）', async () => {
    mockWechat({ openid: 'OPENID_003' });
    await service.exchange('CODE_003');
    const url = (global as any).fetch.mock.calls[0][0] as string;
    expect(url).toContain('appid=wxa5cadd32eecb6de1');
    expect(url).toContain('secret=test_secret');
    expect(url).toContain('js_code=CODE_003');
    expect(url).toContain('sns/jscode2session');
  });

  it('4. 缺少 code → 401 缺少微信登录 code', async () => {
    await expect(service.exchange('')).rejects.toThrow('缺少微信登录 code');
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('5. 未配置 AppID/Secret → 401 微信登录未配置', async () => {
    service = new WechatCodeExchangeService({ get: jest.fn(() => undefined) } as any);
    await expect(service.exchange('CODE')).rejects.toThrow('微信登录未配置');
  });

  it('6. 请求微信接口抛错 → 401 微信登录服务暂不可用', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    await expect(service.exchange('CODE')).rejects.toThrow('微信登录服务暂不可用');
  });

  it('7. 微信返回 errcode → 401 微信登录校验失败', async () => {
    mockWechat({ errcode: 40029, errmsg: 'invalid code' });
    await expect(service.exchange('BAD_CODE')).rejects.toThrow('微信登录校验失败');
  });

  it('8. 微信未返回 openid → 401 微信登录未返回 openid', async () => {
    mockWechat({ errmsg: 'ok' });
    await expect(service.exchange('CODE')).rejects.toThrow('微信登录未返回 openid');
  });

  it('9. 所有失败均为 UnauthorizedException（401 语义不变）', async () => {
    mockWechat({ errcode: 40029 });
    await expect(service.exchange('BAD')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('P1-13 Gate C: AuthService 已改用 WechatCodeExchangeService', () => {
  let wechatExchange: jest.Mock;
  let teacherFindUnique: jest.Mock;
  let jwtSign: jest.Mock;
  let service: any;

  const buildService = () => {
    wechatExchange = jest.fn();
    teacherFindUnique = jest.fn();
    jwtSign = jest.fn().mockReturnValue('signed.jwt.token');
    const configGet = jest.fn((key: string, defaultValue?: any) => defaultValue);
    const prisma: any = {
      teacher: { findUnique: teacherFindUnique },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new AuthService(
      { sign: jwtSign, verify: jest.fn() } as any,
      { get: configGet } as any,
      prisma,
      { exchange: wechatExchange } as any,
    );
  };

  beforeEach(buildService);

  it('10. AuthService 不再自带 exchangeWechatOpenid 实现', () => {
    expect(typeof (service as any).exchangeWechatOpenid).toBe('undefined');
  });

  it('11. loginByWechat 调用注入的换码服务，并用返回的 openid 查教师', async () => {
    wechatExchange.mockResolvedValue({ openid: 'OPENID_X', unionid: 'UNION_X' });
    teacherFindUnique.mockResolvedValue(null);

    await expect(service.loginByWechat('CODE_X')).rejects.toThrow(
      '该微信账号未绑定教师账号，请联系学校管理员完成绑定',
    );

    expect(wechatExchange).toHaveBeenCalledTimes(1);
    expect(wechatExchange).toHaveBeenCalledWith('CODE_X');
    expect(teacherFindUnique).toHaveBeenCalledWith({
      where: { wechatOpenid: 'OPENID_X' },
    });
  });

  it('12. 缺少 code 时不触发换码，直接 401（行为不变）', async () => {
    await expect(service.loginByWechat('')).rejects.toThrow('缺少微信登录 code');
    expect(wechatExchange).not.toHaveBeenCalled();
  });

  it('13. 非 ACTIVE 教师 → 401 账号已被禁用（行为不变）', async () => {
    wechatExchange.mockResolvedValue({ openid: 'OPENID_Y' });
    teacherFindUnique.mockResolvedValue({
      id: 't1',
      teacherNo: 'T001',
      name: '张老师',
      status: 'RESIGNED',
    });
    await expect(service.loginByWechat('CODE_Y')).rejects.toThrow('账号已被禁用');
  });

  it('14. ACTIVE 教师 → 正常签发 JWT（行为不变）', async () => {
    wechatExchange.mockResolvedValue({ openid: 'OPENID_Z' });
    teacherFindUnique.mockResolvedValue({
      id: 't1',
      teacherNo: 'T001',
      name: '张老师',
      gender: 'MALE',
      avatar: null,
      position: '班主任',
      status: 'ACTIVE',
    });

    const result = await service.loginByWechat('CODE_Z');
    expect(result.teacher.teacherNo).toBe('T001');
    expect(result.token).toBe('signed.jwt.token');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(jwtSign).toHaveBeenCalled();
  });
});
