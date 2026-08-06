import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState, useMemo } from 'react';
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

const GENDER_LABEL: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他'
};

/** Tab 定义 */
type TabKey = 'ALL' | 'DAY_STUDENT' | 'BOARDING';

interface TabItem {
  key: TabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'ALL', label: '全部' },
  { key: 'DAY_STUDENT', label: '走读' },
  { key: 'BOARDING', label: '住宿' }
  // TODO: 请假 Tab — 需后端加 /students?onLeave=true 端点后开启
];

export default function Student() {
  const [list, setList] = useState<StudentListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [showMenu, setShowMenu] = useState(false);

  const teacherName = useUserStore((s) => s.teacherName);

  const fetchStudents = useCallback(async (kw?: string, tab?: TabKey) => {
    setLoading(true);
    setError('');
    try {
      const params: QueryStudentParams = {};
      const trimmed = (kw ?? '').trim();
      if (trimmed) params.keyword = trimmed;
      const currentTab = tab ?? activeTab;
      if (currentTab === 'DAY_STUDENT') params.boardingType = 'DAY_STUDENT' as any;
      if (currentTab === 'BOARDING') params.boardingType = 'BOARDING' as any;
      const res = await getStudents(params);
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
  }, [activeTab]);

  useEffect(() => {
    fetchStudents(keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Tab 切换 */
  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
    setKeyword('');
    fetchStudents('', key);
  }, [fetchStudents]);

  /** 搜索防抖 */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(keyword, activeTab);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  Taro.usePullDownRefresh(() => {
    fetchStudents(keyword, activeTab).finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleItemClick = useCallback((item: StudentListItem) => {
    Taro.navigateTo({
      url: `/pages/student-detail/index?id=${item.id}`
    });
  }, []);

  /** 跳转新增学生 */
  const handleCreate = useCallback(() => {
    setShowMenu(false);
    Taro.navigateTo({ url: '/pages/student-create/index' });
  }, []);

  /** 跳转 Excel 导入 */
  const handleImport = useCallback(() => {
    setShowMenu(false);
    Taro.navigateTo({ url: '/pages/student-import/index' });
  }, []);

  /** 统计摘要 */
  const stats = useMemo(() => {
    const total = list.length;
    const boarding = list.filter((s) => s.boardingType === 'BOARDING').length;
    const day = list.filter((s) => s.boardingType === 'DAY_STUDENT').length;
    return { total, boarding, day };
  }, [list]);

  // 加载中
  if (loading && list.length === 0) {
    return (
      <View className='student'>
        <View className='state-tip'>加载中…</View>
      </View>
    );
  }

  // 加载失败
  if (error && list.length === 0) {
    return (
      <View className='student'>
        <View className='state-tip'>加载失败：{error}</View>
      </View>
    );
  }

  return (
    <View className='student'>
      {/* 顶部统计卡 */}
      {stats.total > 0 && (
        <View className='stat-card'>
          <View className='stat-item'>
            <Text className='stat-num'>{stats.total}</Text>
            <Text className='stat-label'>全部</Text>
          </View>
          <View className='stat-divider' />
          <View className='stat-item'>
            <Text className='stat-num'>{stats.boarding}</Text>
            <Text className='stat-label'>住宿</Text>
          </View>
          <View className='stat-divider' />
          <View className='stat-item'>
            <Text className='stat-num'>{stats.day}</Text>
            <Text className='stat-label'>走读</Text>
          </View>
        </View>
      )}

      {/* 分类 Tab */}
      <ScrollView className='tab-scroll' scrollX>
        <View className='tab-row'>
          {TABS.map((tab) => (
            <View
              key={tab.key}
              className={`tab-chip ${tab.key === activeTab ? 'tab-active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 搜索 + 操作 */}
      <View className='action-row'>
        <View className='search-box'>
          <Input
            className='search-input'
            type='text'
            placeholder='搜索姓名 / 学号'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <View className='add-menu-wrapper'>
          <View className='add-btn' onClick={() => setShowMenu(!showMenu)}>+</View>
          {showMenu && (
            <View className='dropdown-menu'>
              <View className='dropdown-item' onClick={handleCreate}>新增学生</View>
              <View className='dropdown-item' onClick={handleImport}>Excel导入</View>
            </View>
          )}
        </View>
      </View>

      {/* 列表 */}
      {list.length === 0 ? (
        <View className='state-tip'>暂无学生数据</View>
      ) : (
        <View className='student-list'>
          {list.map((item) => {
            const status = STATUS_MAP[item.currentStatus];
            const isBoarding = item.boardingType === 'BOARDING';
            return (
              <View
                key={item.id}
                className='student-card'
                onClick={() => handleItemClick(item)}
              >
                <View className='card-left'>
                  <View className='card-name'>{item.name}</View>
                  <View className='card-meta'>
                    <Text className='card-gender'>{GENDER_LABEL[item.gender] || item.gender}</Text>
                    <Text className='card-sep'>·</Text>
                    <Text className='card-no'>{item.studentNo}</Text>
                  </View>
                </View>
                <View className='card-right'>
                  <View className='card-tags'>
                    <Text className={`mini-tag ${isBoarding ? 'mini-tag--boarding' : 'mini-tag--day'}`}>
                      {isBoarding ? '住宿' : '走读'}
                    </Text>
                    <Text className={`mini-tag ${status.className.replace('tag-', 'mini-tag--')}`}>
                      {status.label}
                    </Text>
                  </View>
                  <Text className='card-arrow'>查看 &gt;</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
