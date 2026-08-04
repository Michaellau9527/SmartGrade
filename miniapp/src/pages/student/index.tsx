import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';
import {
  getStudents,
  QueryStudentParams,
  StudentListItem,
  StudentStatus
} from '../../api/student';
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

export default function Student() {
  const [list, setList] = useState<StudentListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const token = useUserStore((s) => s.token);

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
      setList(res || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchStudents(keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 搜索防抖
  useEffect(() => {
    if (!token) {
      return;
    }
    const timer = setTimeout(() => {
      fetchStudents(keyword);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, token]);

  Taro.usePullDownRefresh(() => {
    (async () => {
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

  // 未登录
  if (!token) {
    return (
      <View className='student'>
        <View className='state-tip'>未登录</View>
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
