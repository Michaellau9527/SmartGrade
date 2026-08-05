import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import {
  getStudents,
  QueryStudentParams,
  StudentListItem,
  StudentStatus
} from '../../api/student';
import { mockLogin } from '../../api/auth';
import { useUserStore } from '../../store/user';
import './index.scss';

interface StatusMeta {
  label: string;
  className: string;
}

const STATUS_MAP: Record<StudentStatus, StatusMeta> = {
  ON_CAMPUS: { label: '在校', className: 'tag-on-campus' },
  OUT_OF_SCHOOL: { label: '离校', className: 'tag-out-of-school' },
  GRADUATED: { label: '已毕业', className: 'tag-graduated' },
  TRANSFERRED: { label: '已转学', className: 'tag-transferred' }
};

/** 直接读 storage 里的 token */
function readToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch {
    return '';
  }
}

export default function Student() {
  const [list, setList] = useState<StudentListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<
    'idle' | 'logging' | 'success' | 'failed'
  >('idle');
  const setUserInfo = useUserStore((s) => s.setUserInfo);

  /** 先尝试读 storage 里已有的 token，没有就做一次 mock 登录 */
  const ensureLogin = useCallback(async () => {
    const existing = readToken();
    if (existing) {
      setLoginStatus('success');
      return true;
    }
    setLoginStatus('logging');
    try {
      const result = await mockLogin('T001');
      setUserInfo({
        token: result.token,
        teacherNo: result.teacher.teacherNo,
        teacherName: result.teacher.name,
        roles: result.roles ?? [],
        permissions: result.permissions ?? []
      });
      setLoginStatus('success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Student] 登录失败:', msg);
      setLoginStatus('failed');
      setError(`登录失败：${msg}`);
      return false;
    }
  }, [setUserInfo]);

  const fetchStudents = useCallback(async (kw?: string) => {
    setLoading(true);
    setError('');
    try {
      const params: QueryStudentParams = {};
      const trimmed = (kw ?? '').trim();
      if (trimmed) {
        params.keyword = trimmed;
      }
      const res = await getStudents(params);
      // 防御性兜底：API 层已适配为数组，但即便上游返回了分页对象也安全
      if (Array.isArray(res)) {
        setList(res);
      } else if (res && Array.isArray((res as any).list)) {
        setList((res as any).list as StudentListItem[]);
      } else {
        setList([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Student] 列表加载失败:', msg);
      setError(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 页面挂载时：先登录，登录成功就拉数据 */
  useEffect(() => {
    (async () => {
      const ok = await ensureLogin();
      if (ok) {
        await fetchStudents(keyword);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索防抖
  useEffect(() => {
    if (loginStatus !== 'success') {
      return;
    }
    const timer = setTimeout(() => {
      fetchStudents(keyword);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, loginStatus]);

  Taro.usePullDownRefresh(() => {
    (async () => {
      if (!readToken()) {
        const ok = await ensureLogin();
        if (!ok) {
          Taro.stopPullDownRefresh();
          return;
        }
      }
      await fetchStudents(keyword).finally(() => {
        Taro.stopPullDownRefresh();
      });
    })();
  });

  const handleItemClick = useCallback((item: StudentListItem) => {
    Taro.navigateTo({
      url: `/pages/student-detail/index?id=${item.id}`
    });
  }, []);

  // 登录进行中
  if (loginStatus === 'logging') {
    return (
      <View className='student'>
        <View className='state-tip'>登录中…</View>
      </View>
    );
  }

  // 登录失败
  if (loginStatus === 'failed') {
    return (
      <View className='student'>
        <View className='state-tip'>登录失败</View>
        <View className='state-tip state-error'>{error}</View>
      </View>
    );
  }

  // 首次加载中
  if (loading && list.length === 0 && !error) {
    return (
      <View className='student'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 加载失败且无缓存
  if (error && list.length === 0) {
    return (
      <View className='student'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  return (
    <View className='student'>
      {/* 顶部搜索栏 */}
      <View className='search-bar'>
        <Input
          className='search-input'
          type='text'
          placeholder='按姓名 / 学号搜索'
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
        />
      </View>

      {/* 列表区域 */}
      {list.length === 0 ? (
        <View className='state-tip'>暂无学生数据</View>
      ) : (
        <View className='student-list'>
          {list.map((item) => {
            const status = STATUS_MAP[item.currentStatus];
            return (
              <View
                key={item.id}
                className='student-card'
                onClick={() => handleItemClick(item)}
              >
                <View className='student-main'>
                  <View className='student-name'>{item.name}</View>
                  <View className='student-meta'>
                    <Text className='student-no'>学号：{item.studentNo}</Text>
                    <Text className='student-class'>
                      {item.gradeName} · {item.className}
                    </Text>
                  </View>
                </View>
                <Text className={`tag ${status.className}`}>{status.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
