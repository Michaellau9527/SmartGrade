import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components';
import { AuthGuard } from '@/auth';
import { routeConfig } from '@/router/routes';
import Layout from '@/layouts/Layout';
import Login from '@/pages/login';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {routeConfig.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <AuthGuard permissions={route.permissions}>
                  <route.component />
                </AuthGuard>
              }
            />
          ))}
        </Route>
        {/* 404 回退 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
