import { useState, useEffect } from 'react';
import {
  Table,
  Modal,
  Checkbox,
  Space,
  Tag,
  Popconfirm,
  message,
  Form,
  Input,
  Typography,
  Spin,
} from 'antd';
import { PlusOutlined, SafetyCertificateOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, PermissionButton } from '@/components';
import { PERM } from '@/auth/permission';
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  assignRolePermissions,
  createRole,
  deleteRole,
} from '@/api/rbac';
import type { RoleItem, PermissionItem } from '@/types/rbac';

const { Text } = Typography;

export default function RolePermissionPage() {
  const queryClient = useQueryClient();
  const [permModalRole, setPermModalRole] = useState<RoleItem | null>(null);
  const [checkedPerms, setCheckedPerms] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  });
  const { data: permsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => getPermissions(),
  });

  // 打开赋权弹窗时预加载该角色已授予权限
  const { data: rolePerms, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['rolePermissions', permModalRole?.id],
    queryFn: () => getRolePermissions(permModalRole!.id),
    enabled: !!permModalRole,
  });

  const assignMutation = useMutation({
    mutationFn: (permissionIds: number[]) =>
      assignRolePermissions(permModalRole!.id, permissionIds),
    onSuccess: () => {
      void message.success('权限已更新');
      setPermModalRole(null);
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => void message.error('权限更新失败'),
  });

  const createMutation = useMutation({
    mutationFn: () => createRole(form.getFieldsValue()),
    onSuccess: () => {
      void message.success('角色已创建');
      setCreateOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => void message.error('创建失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      void message.success('角色已删除');
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => void message.error('删除失败'),
  });

  const openPermModal = (role: RoleItem) => {
    setPermModalRole(role);
    setCheckedPerms([]); // 待 rolePerms 加载后由 effect 填充
  };

  // 角色权限加载完成后填充勾选项
  useEffect(() => {
    if (permModalRole && rolePerms) {
      setCheckedPerms(rolePerms.map((p) => p.id));
    }
  }, [permModalRole, rolePerms]);

  const columns = [
    { title: '角色编码', dataIndex: 'roleCode', key: 'roleCode', width: 200 },
    { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 160 },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (val: string | null) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: RoleItem) => (
        <Space size="middle">
          <PermissionButton
            permission={PERM.ROLE_ASSIGN_PERMISSION}
            type="link"
            onClick={() => openPermModal(record)}
          >
            <SafetyCertificateOutlined /> 管理权限
          </PermissionButton>
          <PermissionButton
            permission={PERM.ROLE_DELETE}
            type="link"
            danger
            onClick={() => {}}
          >
            <Popconfirm
              title="确认删除该角色？"
              description="将同时解除该角色下所有教师的关联"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <span><DeleteOutlined /> 删除</span>
            </Popconfirm>
          </PermissionButton>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="角色与权限管理"
        extra={
          <PermissionButton
            permission={PERM.ROLE_CREATE}
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新增角色
          </PermissionButton>
        }
      />

      <Table<RoleItem>
        rowKey="id"
        loading={rolesLoading}
        dataSource={rolesData?.list ?? []}
        columns={columns}
        pagination={false}
      />

      {/* 权限分配弹窗 */}
      <Modal
        title={`管理权限 · ${permModalRole?.roleName ?? ''}`}
        open={!!permModalRole}
        onCancel={() => setPermModalRole(null)}
        onOk={() => assignMutation.mutate(checkedPerms)}
        confirmLoading={assignMutation.isPending}
        width={640}
      >
        {rolePermsLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : (
          <Checkbox.Group
            value={checkedPerms}
            onChange={(vals) => setCheckedPerms(vals as number[])}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {(permsData?.list ?? []).map((p: PermissionItem) => (
              <Checkbox key={p.id} value={p.id}>
                {p.permissionName}
                <Text type="secondary" style={{ marginLeft: 6 }}>
                  <Tag>{p.permissionCode}</Tag>
                  {p.resource ? `· ${p.resource}` : ''}
                </Text>
              </Checkbox>
            ))}
          </Checkbox.Group>
        )}
      </Modal>

      {/* 新增角色弹窗 */}
      <Modal
        title="新增角色"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createMutation.mutate()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input placeholder="如 ROLE_GRADE_DIRECTOR" />
          </Form.Item>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如 年级主任" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
