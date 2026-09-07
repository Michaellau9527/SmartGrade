import { View, Text, Input, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmWechatBinding,
  previewWechatBinding,
  WechatBindingPreview
} from '../../api/wechat-binding';
import { ensureLoggedIn, resetSession } from '../../utils/session';
import { BindPreviewInfo, runBindFlow } from './flow';
import './index.scss';

/**
 * 教师微信绑定页（P1-13 Gate E1）—— 公开确认视角
 *
 * 流程（严格顺序）：
 *   进入页面（路由 ?token=xxx 或手动填写）
 *     → preview（只读，展示「即将绑定教师 XXX」）
 *     → 用户主动确认（弹窗二次确认，取消则什么都不做）
 *     → Taro.login() 取 code
 *     → confirm 完成绑定
 *     → 重建 session → 回工作台
 *
 * 约束：
 * - 本页**不调用 useSessionRestore**：使用者此刻尚未绑定微信，登录必然失败，
 *   强行恢复只会刷无意义的登录错误。
 * - 绑定码只存在于内存与路由参数，**不写入任何本地存储**；成功后立即清空。
 * - 不在日志里输出 token / openid / unionid。
 */

export default function WechatBindPage() {
  const router = useRouter();
  const initialToken = (router?.params?.token || '').trim();

  const [token, setToken] = useState<string>(initialToken);
  const [info, setInfo] = useState<BindPreviewInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [binding, setBinding] = useState<boolean>(false);

  // 缓存最近一次 preview 结果：token 未变时 confirm 阶段不再重复请求
  const previewCache = useRef<{ token: string; info: BindPreviewInfo } | null>(null);

  const applyPreview = useCallback((raw: string, res: WechatBindingPreview): BindPreviewInfo => {
    const next: BindPreviewInfo = { teacherId: res.teacherId, teacherName: res.teacherName };
    previewCache.current = { token: raw, info: next };
    setInfo(next);
    return next;
  }, []);

  /** 只读预览：不消费绑定码 */
  const doPreview = useCallback(
    async (raw: string) => {
      const t = (raw || '').trim();
      setError('');
      setInfo(null);
      if (!t) {
        setError('请先填写绑定码');
        return;
      }
      setPreviewing(true);
      try {
        applyPreview(t, await previewWechatBinding(t));
      } catch (err) {
        setError(err instanceof Error ? err.message : '绑定码无效或已失效');
      } finally {
        setPreviewing(false);
      }
    },
    [applyPreview]
  );

  // 路由带绑定码时（扫码 / 小程序码进入）自动预览一次
  useEffect(() => {
    if (initialToken) {
      void doPreview(initialToken);
    }
  }, [initialToken, doPreview]);

  /** 确认绑定：走 flow.ts 的严格顺序 */
  const handleBind = async () => {
    setError('');
    setBinding(true);
    try {
      const result = await runBindFlow(token, {
        preview: async (t) => {
          const cached = previewCache.current;
          if (cached && cached.token === t) return cached.info;
          return applyPreview(t, await previewWechatBinding(t));
        },
        requestUserConfirmation: (teacherName) =>
          new Promise<boolean>((resolve) => {
            Taro.showModal({
              title: '确认绑定',
              content: `即将绑定教师：${teacherName}\n绑定后即可使用本微信登录 SmartGrade。`,
              confirmText: '确认绑定',
              cancelText: '取消',
              success: (r) => resolve(!!r.confirm),
              fail: () => resolve(false)
            });
          }),
        // 复用现有登录能力，不实现第二套微信登录
        login: () => Taro.login() as unknown as Promise<{ code: string }>,
        confirm: (t, code) => confirmWechatBinding(t, code),
        restoreSession: async () => {
          // 清掉旧 session 单例 → 重新 wx.login，绑定完成后应当能拿到 JWT
          resetSession();
          await ensureLoggedIn();
        }
      });

      if (result.status === 'cancelled') {
        return; // 用户取消：未调用 login / confirm
      }

      // 成功后立即丢弃绑定码，绝不落本地存储
      setToken('');
      previewCache.current = null;
      Taro.showToast({ title: '绑定成功', icon: 'success' });
      Taro.reLaunch({ url: '/pages/workbench/index' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败，请稍后重试');
    } finally {
      setBinding(false);
    }
  };

  return (
    <View className='bind'>
      <View className='bind__card'>
        <View className='bind__title'>绑定微信</View>
        <View className='bind__desc'>
          请输入管理员提供的一次性绑定码，确认无误后完成绑定。绑定码 10 分钟内有效，且只能使用一次。
        </View>

        {!initialToken && (
          <Input
            className='bind__input'
            placeholder='请输入绑定码'
            value={token}
            onInput={(e) => setToken(e.detail.value || '')}
          />
        )}

        {!initialToken && (
          <Button
            className='bind__btn bind__btn--ghost'
            loading={previewing}
            disabled={previewing || !token.trim()}
            onClick={() => void doPreview(token)}
          >
            查询绑定信息
          </Button>
        )}

        {previewing && <View className='bind__tip'>正在查询…</View>}

        {info && !previewing && (
          <View className='bind__target'>
            <Text className='bind__target-label'>即将绑定教师</Text>
            <Text className='bind__target-name'>{info.teacherName}</Text>
          </View>
        )}

        {!!error && <View className='bind__error'>{error}</View>}

        <Button
          className='bind__btn bind__btn--primary'
          loading={binding}
          disabled={binding || !info}
          onClick={() => void handleBind()}
        >
          确认绑定
        </Button>
      </View>
    </View>
  );
}
