import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useUserStore } from '../../store/user';
import './index.scss';

/** 角色 code -> 中文名 */
const ROLE_NAME_MAP: Record<string, string> = {
  ADMIN: '管理员',
  GRADE_DIRECTOR: '年级主任',
  POLITICAL: '政教处',
  HEADMASTER: '班主任',
  DORM_MANAGER: '宿管',
  SUBJECT_TEACHER: '任课教师'
};

/** 当前应用版本号 */
const APP_VERSION = '1.0.0';

function formatRoleName(code: string): string {
  return ROLE_NAME_MAP[code] || code;
}

export default function Mine() {
  const teacherName = useUserStore((s) => s.teacherName);
  const teacherNo = useUserStore((s) => s.teacherNo);
  const roles = useUserStore((s) => s.roles);
  const permissions = useUserStore((s) => s.permissions);
  const logout = useUserStore((s) => s.logout);

  const [permissionsExpanded, setPermissionsExpanded] = useState<boolean>(false);

  /** 退出登录：先弹窗确认，确认后清空状态并 reLaunch 到工作台 */
  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (!res.confirm) return;
        logout();
        Taro.reLaunch({ url: '/pages/workbench/index' });
      }
    });
  };

  const togglePermissions = () => {
    setPermissionsExpanded((v) => !v);
  };

  return (
    <View className='mine'>
      {/* 顶部用户信息卡 */}
      <View className='user-card'>
        <View className='user-name'>{teacherName || '未登录'}</View>
        <View className='user-no'>工号：{teacherNo || '-'}</View>
        <View className='role-tags'>
          {roles.length === 0 ? (
            <Text className='role-tag'>暂无角色</Text>
          ) : (
            roles.map((code) => (
              <Text key={code} className='role-tag'>
                {formatRoleName(code)}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* 角色权限列表 */}
      <View className='card'>
        <View className='cell' onClick={togglePermissions}>
          <Text className='cell-label'>角色权限</Text>
          <Text className={`cell-arrow ${permissionsExpanded ? 'cell-arrow-up' : ''}`}>
            {permissionsExpanded ? '收起' : '展开'}
          </Text>
        </View>
        {permissionsExpanded && (
          <View className='permission-box'>
            {permissions.length === 0 ? (
              <View className='empty'>暂无权限</View>
            ) : (
              permissions.map((perm) => (
                <View key={perm} className='permission-item'>
                  <Text className='permission-dot'>·</Text>
                  <Text className='permission-text'>{perm}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* 关于 SmartGrade */}
      <View className='card'>
        <View className='cell cell-no-tap'>
          <Text className='cell-label'>关于 SmartGrade</Text>
          <Text className='cell-value'>v{APP_VERSION}</Text>
        </View>
      </View>

      {/* 退出登录 */}
      <View className='logout-btn' onClick={handleLogout}>
        退出登录
      </View>
    </View>
  );
}
