import { Component, ReactNode } from 'react';
import { ensureLoggedIn } from './utils/session';
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
