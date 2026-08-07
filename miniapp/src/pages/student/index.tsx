import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getStudents,
  StudentListItem,
  StudentStatus
} from '../../api/student';
import { getLeaves } from '../../api/leave';
import { useUserStore } from '../../store/user';
import './index.scss';

interface StatusMeta { label: string; className: string; }
const STATUS_MAP: Record<StudentStatus, StatusMeta> = {
  ON_CAMPUS: { label: '在校', className: 'tag-on-campus' },
  OUT_OF_SCHOOL: { label: '离校', className: 'tag-out-of-school' },
  GRADUATED: { label: '已毕业', className: 'tag-graduated' },
  TRANSFERRED: { label: '已转学', className: 'tag-transferred' }
};

const GENDER_LABEL: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他' };

type TabKey = 'ALL' | 'DAY_STUDENT' | 'BOARDING' | 'ON_LEAVE';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'DAY_STUDENT', label: '走读' },
  { key: 'BOARDING', label: '住宿' },
  { key: 'ON_LEAVE', label: '请假' }
];

export default function Student() {
  const [allStudents, setAllStudents] = useState<StudentListItem[]>([]);
  const [leaveStudentIds, setLeaveStudentIds] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [showMenu, setShowMenu] = useState(false);

  /** 初次加载：学生列表 + 请假列表，均只请求一次 */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 并行拉学生 + 请假
      const [students, leaves] = await Promise.all([
        getStudents(),
        (async () => {
          try { return await getLeaves(); } catch { return []; }
        })()
      ]);
      setAllStudents(students);

      // 构建请假学生集合（PENDING / APPROVED / LEFT）
      const leaveSet = new Set<string>();
      leaves.forEach((l) => {
        if (l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'LEFT') {
          leaveSet.add(l.studentId);
        }
      });
      setLeaveStudentIds(leaveSet);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Student] 列表加载失败:', msg);
      setError(msg);
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  Taro.usePullDownRefresh(() => {
    fetchAll().finally(() => Taro.stopPullDownRefresh());
  });

  /** 根据 Tab + 搜索词过滤 */
  const filteredList = useMemo(() => {
    let result = allStudents;
    if (activeTab === 'DAY_STUDENT') result = result.filter((s) => s.boardingType === 'DAY_STUDENT');
    if (activeTab === 'BOARDING') result = result.filter((s) => s.boardingType === 'BOARDING');
    if (activeTab === 'ON_LEAVE') result = result.filter((s) => leaveStudentIds.has(s.id));
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(kw) || s.studentNo.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [allStudents, activeTab, keyword, leaveStudentIds]);

  /** 统计摘要（基于全量学生） */
  const stats = useMemo(() => {
    const total = allStudents.length;
    const boarding = allStudents.filter((s) => s.boardingType === 'BOARDING').length;
    const day = allStudents.filter((s) => s.boardingType === 'DAY_STUDENT').length;
    const onLeave = leaveStudentIds.size;
    return { total, boarding, day, onLeave };
  }, [allStudents, leaveStudentIds]);

  const handleItemClick = useCallback((item: StudentListItem) => {
    Taro.navigateTo({ url: `/pages/student-detail/index?id=${item.id}` });
  }, []);

  const handleCreate = useCallback(() => {
    setShowMenu(false);
    Taro.navigateTo({ url: '/pages/student-create/index' });
  }, []);

  const handleImport = useCallback(() => {
    setShowMenu(false);
    Taro.navigateTo({ url: '/pages/student-import/index' });
  }, []);

  if (loading && allStudents.length === 0) {
    return <View className='student'><View className='state-tip'>加载中…</View></View>;
  }
  if (error && allStudents.length === 0) {
    return <View className='student'><View className='state-tip'>加载失败：{error}</View></View>;
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
          <View className='stat-divider' />
          <View className='stat-item'>
            <Text className='stat-num'>{stats.onLeave}</Text>
            <Text className='stat-label'>请假</Text>
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
              onClick={() => setActiveTab(tab.key)}
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
      {filteredList.length === 0 ? (
        <View className='state-tip'>暂无学生数据</View>
      ) : (
        <View className='student-list'>
          {filteredList.map((item) => {
            const status = STATUS_MAP[item.currentStatus];
            const isBoarding = item.boardingType === 'BOARDING';
            const isOnLeave = leaveStudentIds.has(item.id);
            return (
              <View key={item.id} className='student-card' onClick={() => handleItemClick(item)}>
                <View className='card-left'>
                  <View className='card-name'>{item.name}</View>
                  <View className='card-meta'>
                    <Text className='card-no'>学号 {item.studentNo}</Text>
                  </View>
                  <View className='card-meta card-meta--secondary'>
                    <Text className='card-gender'>{GENDER_LABEL[item.gender] || item.gender}</Text>
                    <Text className='card-sep'>·</Text>
                    <Text className='card-boarding'>{isBoarding ? '住宿' : '走读'}</Text>
                    {item.dormName && (
                      <>
                        <Text className='card-sep'>·</Text>
                        <Text className='card-dorm'>{item.dormName}{item.bedNo ? ` ${item.bedNo}床` : ''}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View className='card-right'>
                  <View className='card-tags'>
                    {isOnLeave && <Text className='mini-tag mini-tag--leave'>请假中</Text>}
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
