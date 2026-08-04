import { Component, ReactNode } from 'react';
import { mockLogin } from './api/auth';
import { useUserStore } from './store/user';
import './app.scss';

interface AppProps {
  children?: ReactNode;
}

/**
 * 小程序启动时若本地无 token，则用工号 T001 自动调用 mock 登录，
 * 让用户打开就能看到工作台数据，无需手动登录。
 * 登录失败不阻塞应用启动，仅打印错误日志。
 */
async function ensureLoggedIn(): Promise<void> {
  const store = useUserStore.getState();
  if (store.hasToken()) {
    return;
  }
  try {
    const result = await mockLogin('T001');
    store.setUserInfo({
      token: result.token,
      teacherNo: result.teacher.teacherNo,
      teacherName: result.teacher.name,
      roles: result.roles,
      permissions: result.permissions
    });
  } catch (err) {
    console.error('[SmartGrade] mock 登录失败:', err);
  }
}

class App extends Component<AppProps> {
  componentDidMount() {
    ensureLoggedIn().catch((err) => {
      console.error('[SmartGrade] 启动登录流程异常:', err);
    });
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children ?? null;
  }
}

export default App;
