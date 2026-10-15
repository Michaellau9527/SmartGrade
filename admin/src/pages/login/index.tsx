import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginWithPassword } from '@/api/auth';
import { mapLoginResponse, useUserStore } from '@/stores/user';

const { Title } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

/**
 * 后台登录页（真实登录链路，阶段 B3）。
 *
 * 注意：request.ts 的全局错误拦截器对 401 / 网络错误会弹出全局 toast
 * 并执行 window.location.href='/login' 整页刷新。为避免登录页出现“重复全局提示”，
 * 本页对登录错误统一使用表单内联 Alert 提示（不调用 message.*），
 * 且不在页面内二次弹 toast。全局提示措辞与登录失败场景不符、以及 401 整页刷新会
 * 冲掉内联提示的问题，属 request.ts 既有行为，超出本阶段授权范围，已记入报告“遗留问题”。
 */
export default function Login() {
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setLogin = useUserStore((s) => s.setLogin);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setFormError(null);
    try {
      const data = await loginWithPassword(values.username.trim(), values.password);
      // 后端 login-with-password 返回经 request 拆包后的 data（LoginResponseData）
      const user = mapLoginResponse(data);
      // Token 不混入 UserInfo，单独经 setLogin 存入 localStorage 与 store
      setLogin(user, data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const e = err as {
        response?: { status: number; data?: { message?: string } };
        message?: string;
      };
      if (e?.response?.status === 401) {
        // 后端对错误凭证返回 401，语义即“用户名或密码错误”
        setFormError('用户名或密码错误，请检查后重试');
      } else if (!e?.response) {
        setFormError('网络异常，请检查网络连接或稍后重试');
      } else {
        setFormError(e.response.data?.message || e.message || '登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 360 }} bordered>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          SmartGrade 管理后台
        </Title>
        {formError && (
          <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              autoComplete="username"
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
