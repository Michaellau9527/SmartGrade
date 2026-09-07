import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  initTeacherWechatBinding,
  listTeachers,
  TeacherListItem
} from '../../api/teacher';
import { useUserStore } from '../../store/user';
import { ensureLoggedIn, useSessionRestore } from '../../utils/session';
import { resetBackendStatus } from '../../utils/request';
import './index.scss';

/**
 * 教师微信绑定管理页（P1-13 Gate F）—— 管理员发起视角
 *
 * 冻结书 §7 时序的前半段：管理员选教师 → 发起绑定 → 拿到一次性绑定码 → 交给教师
 * 去公开绑定页（/pages/wechat-bind）确认。本页不负责教师侧的 preview/confirm。
 *
 * 权限：
 * - 入口门控在「我的」页（ROLE_ADMIN 或持 teacher:bind-wechat 者可见）；
 * - 本页兜底再查一次同一语义，未命中则渲染无权限提示（防直达路由）；
 * - 后端 init 路由仍有 PermissionsGuard + DataScope 硬校验，前端门控只优化体验。
 *
 * 安全约束：
 * - 教师列表由后端返回完整 teacher 行，本页只消费 id/teacherNo/name/status/bound，
 *   绝不渲染 phone/email/openid 等敏感列；
 * - 一次性绑定码只存在内存 state，**不写入任何 storage、不输出日志**；
 * - 已生成绑定码的教师用本地 issuedMap 标记「待教师确认」，避免重复发起混淆。
 */

/** 可发起绑定的角色/权限语义（与后端 PermissionsGuard 对齐） */
const BIND_PERMISSION = 'teacher:bind-wechat';

const PAGE_SIZE = 20;

interface IssuedBinding {
  token: string;
  expiresIn: number;
  teacherName: string;
  teacherNo: string;
  issuedAt: number;
}

export default function TeacherBindManage() {
  useSessionRestore();

  const roles = useUserStore((s) => s.roles);
  const permissions = useUserStore((s) => s.permissions);

  /** 是否有权发起绑定：ROLE_ADMIN（后端 guard 短路，无需落库权限）或持 bind 权限 */
  const canBind = useMemo(
    () => roles.includes('ROLE_ADMIN') || permissions.includes(BIND_PERMISSION),
    [roles, permissions]
  );

  const [list, setList] = useState<TeacherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuedMap, setIssuedMap] = useState<Record<string, IssuedBinding>>({});
  const [current, setCurrent] = useState<IssuedBinding | null>(null);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true);
      setError('');
      try {
        await ensureLoggedIn();
        const res = await listTeachers(targetPage, PAGE_SIZE);
        setTotal(res.total);
        setPage(targetPage);
        setList((prev) => (append ? [...prev, ...res.list] : res.list));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (!append) setList([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!canBind) return;
    void load(1, false);
  }, [canBind, load]);

  const handleRetry = useCallback(() => {
    resetBackendStatus();
    void load(1, false);
  }, [load]);

  const handleLoadMore = useCallback(() => {
    if (loading || list.length >= total) return;
    void load(page + 1, true);
  }, [loading, list.length, total, page, load]);

  /** 展示绑定码：自动复制到剪贴板 + 页面展示（内存态，不落盘） */
  const presentBinding = useCallback((b: IssuedBinding) => {
    setCurrent(b);
    Taro.setClipboardData({
      data: b.token,
      success: () => {
        Taro.showToast({ title: '绑定码已复制', icon: 'success' });
      },
      fail: () => {
        // 剪贴板失败不阻断：页面仍展示码，可手动复制
        Taro.showToast({ title: '绑定码已生成，请手动复制', icon: 'none' });
      }
    });
  }, []);

  /** 发起绑定：二次确认 → init → 展示码 */
  const handleIssue = useCallback(
    async (t: TeacherListItem) => {
      const existing = issuedMap[t.id];
      if (existing) {
        // 已生成未确认：直接重新展示（不重复发起）
        presentBinding(existing);
        return;
      }
      const confirmRes = await Taro.showModal({
        title: '发起微信绑定',
        content: `将为 ${t.name}（${t.teacherNo}）生成一次性绑定码。\n绑定码 10 分钟内有效，交给本人确认后即可绑定其微信。`,
        confirmText: '生成绑定码',
        cancelText: '取消'
      });
      if (!confirmRes.confirm) return;

      setLoading(true);
      setError('');
      try {
        const res = await initTeacherWechatBinding(t.id);
        const issued: IssuedBinding = {
          token: res.bindingToken,
          expiresIn: res.expiresIn,
          teacherName: t.name,
          teacherNo: t.teacherNo,
          issuedAt: Date.now()
        };
        setIssuedMap((m) => ({ ...m, [t.id]: issued }));
        presentBinding(issued);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        Taro.showToast({ title: msg, icon: 'none' });
      } finally {
        setLoading(false);
      }
    },
    [issuedMap, presentBinding]
  );

  /** 无权限：不渲染列表（防直达路由），引导返回 */
  if (!canBind) {
    return (
      <View className='tb'>
        <View className='tb__denied'>
          <Text className='tb__denied-title'>无权访问</Text>
          <Text className='tb__denied-desc'>
            微信绑定管理仅限管理员 / 年级主任 / 政教处使用。
          </Text>
          <Button
            className='tb__denied-btn'
            onClick={() => Taro.reLaunch({ url: '/pages/workbench/index' })}
          >
            返回首页
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className='tb'>
      <View className='tb__head'>
        <Text className='tb__head-title'>教师微信绑定</Text>
        <Text className='tb__head-desc'>
          选择未绑定的教师生成一次性绑定码，教师在小程序「绑定微信」页输入确认后即可用微信登录。已绑定微信的教师需先解绑才能重新绑定。
        </Text>
      </View>

      {/* 绑定码展示卡 */}
      {current && (
        <View className='tb__token'>
          <View className='tb__token-head'>
            <Text className='tb__token-label'>一次性绑定码（10 分钟内有效）</Text>
            <Text
              className='tb__token-close'
              onClick={() => setCurrent(null)}
            >
              收起
            </Text>
          </View>
          <Text className='tb__token-teacher'>
            {current.teacherName}（{current.teacherNo}）
          </Text>
          <Text className='tb__token-code' userSelect>
            {current.token}
          </Text>
          <Button
            className='tb__token-copy'
            onClick={() => presentBinding(current)}
          >
            复制绑定码
          </Button>
          <Text className='tb__token-tip'>
            请将绑定码发给该教师本人，让其打开小程序「绑定微信」页粘贴确认。绑定码只能使用一次。
          </Text>
        </View>
      )}

      {error && (
        <View className='tb__error'>
          <Text className='tb__error-text'>{error}</Text>
          <Text className='tb__error-retry' onClick={handleRetry}>
            重试
          </Text>
        </View>
      )}

      {!error && (
        <ScrollView scrollY className='tb__list'>
          {list.map((t) => {
            const disabled = loading || t.status !== 'ACTIVE' || t.bound;
            const issued = issuedMap[t.id];
            const statusLabel = t.bound
              ? '已绑定'
              : t.status !== 'ACTIVE'
                ? '非在职'
                : issued
                  ? '待教师确认'
                  : '未绑定';
            return (
              <View key={t.id} className='tb__row'>
                <View className='tb__row-info'>
                  <Text className='tb__row-name'>{t.name}</Text>
                  <Text className='tb__row-no'>{t.teacherNo}</Text>
                  <Text className={`tb__row-status tb__row-status--${t.bound ? 'bound' : t.status !== 'ACTIVE' ? 'inactive' : issued ? 'pending' : 'free'}`}>
                    {statusLabel}
                  </Text>
                </View>
                <Button
                  className='tb__row-btn'
                  disabled={disabled}
                  loading={loading}
                  onClick={() => void handleIssue(t)}
                >
                  {issued ? '查看绑定码' : t.bound ? '已绑定' : t.status !== 'ACTIVE' ? '不可发起' : '发起绑定'}
                </Button>
              </View>
            );
          })}

          {list.length === 0 && !loading && (
            <View className='tb__empty'>暂无教师数据</View>
          )}

          {list.length > 0 && list.length < total && (
            <Button
              className='tb__more'
              loading={loading}
              onClick={handleLoadMore}
            >
              加载更多（{list.length}/{total}）
            </Button>
          )}
          {list.length >= total && list.length > 0 && (
            <View className='tb__end'>已全部加载（共 {total} 人）</View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
