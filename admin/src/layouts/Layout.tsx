import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Dropdown, Space, Typography } from 'antd';
import { LogoutOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { useUserStore, restoreUserFromStorage } from '@/stores/user';
import { getAccessibleRoutes } from '@/router/routes';
import { ROLE, ROLE_META, ROLE_PERMISSIONS, ROLE_DATA_SCOPE } from '@/auth/roles';
import type { RoleKey } from '@/auth/roles';

const { Sider, Content, Header } = AntLayout;
const { Text } = Typography;

/**
 * 开发用：模拟登录（切换角色）
 * 生产环境应替换为真实登录流程
 */
function useDevRoleSwitch() {
  const { setLogin, user } = useUserStore();

  const switchRole = (role: RoleKey) => {
    const permissions = new Set(ROLE_PERMISSIONS[role]);
    const dataScope = ROLE_DATA_SCOPE[role];
    setLogin(
      {
        id: 1,
        name: `${ROLE_META[role].label}测试账号`,
        teacher_no: 'T001',
        roles: [role],
        permissions,
        dataScope: { type: dataScope.type },
      },
      'mock-jwt-token-dev',
    );
  };

  return { switchRole, user };
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchRole, user } = useDevRoleSwitch();

  // 恢复登录状态（如果 localStorage 中有保存的用户信息）
  useEffect(() => {
    const stored = restoreUserFromStorage();
    if (stored) {
      const token = localStorage.getItem('token');
      if (token && !user) {
        useUserStore.getState().setLogin(stored, token);
      }
    }
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 根据权限过滤菜单（直接使用 routeConfig 中的 icon 和 label）
  const menuItems = useMemo(() => {
    if (!user?.permissions) return [];
    return getAccessibleRoutes(user.permissions).map((route) => ({
      key: `/${route.path}`,
      icon: route.icon,
      label: route.label,
    }));
  }, [user?.permissions]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 角色切换下拉菜单
  const roleSwitchItems = Object.values(ROLE).map((role) => ({
    key: role,
    label: `${ROLE_META[role as RoleKey].label}（${role}）`,
  }));

  const handleLogout = () => {
    useUserStore.getState().setLogout();
    navigate('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220} collapsible>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
        }}>
          SmartGrade
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <h2 style={{ margin: 0, lineHeight: '64px' }}>管理后台</h2>
          <Space size="middle">
            {/* 开发环境：角色切换 */}
            <Dropdown
              menu={{
                items: roleSwitchItems,
                onClick: ({ key }) => switchRole(key as RoleKey),
              }}
            >
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <UserSwitchOutlined />
                  <Text>{user?.roles?.[0] ? ROLE_META[user.roles[0] as RoleKey]?.label : '未登录'}</Text>
                </Space>
              </a>
            </Dropdown>
            <a onClick={handleLogout}>
              <Space>
                <LogoutOutlined />
                <Text>退出</Text>
              </Space>
            </a>
          </Space>
        </Header>
        <Content style={{
          margin: 24,
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
