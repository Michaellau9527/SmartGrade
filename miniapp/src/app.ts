import { Component, ReactNode } from 'react';
import { ensureLoggedIn } from './utils/session';
import { ensureCloudInit } from './utils/request';
import './app.scss';

// Polyfill __global for WeChat DevTools Worker compatibility.
// The DevTools Worker (WAWorker.js) references __global for error reporting;
// when it's missing, the reporter itself crashes and masks the real error.
const _root: Record<string, unknown> =
  typeof globalThis !== 'undefined' ? (globalThis as unknown as Record<string, unknown>) : {};
if (typeof _root.__global === 'undefined') {
  Object.defineProperty(_root, '__global', {
    value: _root,
    writable: false,
    enumerable: false,
    configurable: true
  });
}

interface AppProps {
  children?: ReactNode;
}

class App extends Component<AppProps> {
  componentDidMount() {
    // 必须先完成 Taro.cloud.init（云环境就绪），再发起任何 callContainer 请求（含启动登录）。
    // 以 ensureCloudInit() 的 Promise 作为硬依赖：init ready → ensureLoggedIn，
    // 杜绝首启动偶发「登录失败」——而非指望 init 与首请求恰好先后完成。
    ensureCloudInit()
      .then(() => ensureLoggedIn())
      .catch((err) => {
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
