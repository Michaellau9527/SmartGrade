import { useEffect, useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Divider,
  Spin,
  Empty,
  Space,
  Select,
  Button,
  message,
  Alert,
  Modal,
  Typography,
} from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTeacherDetail,
  getTeacherRoles,
  getRoleList,
  assignTeacherRoles,
  initTeacherWechatBind,
} from '@/api/teacher';
import { PERM } from '@/auth/permission';
import { PermissionButton } from '@/components';
import type { TeacherItem, TeacherRolesResponse, RoleItem, BindWechatInitResponse } from '@/types/teacher';

interface TeacherDetailProps {
  teacherId: string | null;
  open: boolean;
  onClose: () => void;
}

const genderMap: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
};

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '在职', color: 'green' },
  RESIGNED: { label: '已离职', color: 'default' },
};

// 角色码 -> 中文标签；与后端 @smartgrade/shared RoleCode 同口径
const roleLabelMap: Record<string, string> = {
  ROLE_ADMIN: '管理员',
  ROLE_SUPER_ADMIN: '超级管理员',
  ROLE_HEADMASTER: '班主任',
  ROLE_GRADE_DIRECTOR: '年级主任',
  ROLE_POLITICAL: '政教处',
  ROLE_DORM_MANAGER: '宿管员',
  ROLE_SUBJECT_TEACHER: '任课教师',
  ROLE_PARENT: '家长',
  ROLE_STUDENT: '学生',
};

/**
 * 可分配角色白名单（与后端 teacher.service.ts ASSIGNABLE_ROLE_CODES 严格一致）。
 * ROLE_ADMIN / ROLE_PARENT / ROLE_STUDENT 不在列：管理员角色不可经此接口授予，
 * 家长/学生非教师角色，避免越权或误分配。
 */
const ASSIGNABLE_ROLE_CODES = [
  'ROLE_GRADE_DIRECTOR',
  'ROLE_POLITICAL',
  'ROLE_HEADMASTER',
  'ROLE_SUBJECT_TEACHER',
  'ROLE_DORM_MANAGER',
];

function formatDate(val: string | null | undefined): string {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeacherDetail({ teacherId, open, onClose }: TeacherDetailProps) {
  const queryClient = useQueryClient();

  const { data: teacher, isLoading: teacherLoading } = useQuery<TeacherItem>({
    queryKey: ['teacherDetail', teacherId],
    queryFn: () => getTeacherDetail(teacherId!),
    enabled: !!teacherId,
  });

  // 该教师当前角色（只读，roleCode 列表）
  const { data: rolesData, isLoading: rolesLoading } = useQuery<TeacherRolesResponse>({
    queryKey: ['teacherRoles', teacherId],
    queryFn: () => getTeacherRoles(teacherId!),
    enabled: !!teacherId,
  });

  // 全量角色（真实后端数据，禁止硬编码）
  const { data: allRoles } = useQuery<{ list: RoleItem[] }>({
    queryKey: ['roleList'],
    queryFn: () => getRoleList(),
    enabled: open,
  });

  // 可分配角色选项（按白名单过滤）
  const assignableRoles = (allRoles?.list ?? []).filter((r) => ASSIGNABLE_ROLE_CODES.includes(r.roleCode));

  // 当前选中的角色 id（多选）
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [roleDirty, setRoleDirty] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  // 微信绑定
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindResult, setBindResult] = useState<BindWechatInitResponse | null>(null);
  const [binding, setBinding] = useState(false);

  // 当教师当前角色与角色列表都就绪后，初始化选中项
  useEffect(() => {
    if (!rolesData || !allRoles) return;
    const idByCode = new Map(allRoles.list.map((r) => [r.roleCode, r.id]));
    const initial = (rolesData.roles ?? [])
      .map((code) => idByCode.get(code))
      .filter((id): id is number => typeof id === 'number');
    setSelectedRoleIds(initial);
    setRoleDirty(false);
  }, [rolesData, allRoles]);

  const handleSaveRoles = async () => {
    if (!teacherId) return;
    setSavingRoles(true);
    try {
      await assignTeacherRoles(teacherId, { roleIds: selectedRoleIds });
      message.success('角色已保存');
      queryClient.invalidateQueries({ queryKey: ['teacherRoles', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacherDetail', teacherId] });
      setRoleDirty(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(e?.response?.data?.message || e?.message || '角色保存失败');
    } finally {
      setSavingRoles(false);
    }
  };

  const handleInitBind = async () => {
    if (!teacherId) return;
    setBinding(true);
    try {
      const res = await initTeacherWechatBind(teacherId);
      setBindResult(res);
      setBindModalOpen(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(e?.response?.data?.message || e?.message || '发起绑定失败');
    } finally {
      setBinding(false);
    }
  };

  const roleTags = (rolesData?.roles ?? []).map((code) => ({
    code,
    label: roleLabelMap[code] ?? code,
  }));

  return (
    <Drawer title="教师详情" open={open} onClose={onClose} width={640}>
      {teacherLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      )}
      {!teacherLoading && !teacher && <Empty description="未找到该教师" />}
      {teacher && (
        <>
          <Descriptions column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="工号">{teacher.teacherNo}</Descriptions.Item>
            <Descriptions.Item label="姓名">{teacher.name}</Descriptions.Item>
            <Descriptions.Item label="性别">
              {genderMap[teacher.gender] || teacher.gender}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[teacher.status]?.color || 'default'}>
                {statusMap[teacher.status]?.label || teacher.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="职务">{teacher.position || '-'}</Descriptions.Item>
            <Descriptions.Item label="教研组">{teacher.teachingGroup || '-'}</Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions title="联系方式" column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="电话">{teacher.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{teacher.email || '-'}</Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions
            title="角色（当前）"
            column={1}
            size="small"
            labelStyle={{ width: 100, fontWeight: 500 }}
          >
            <Descriptions.Item label="角色列表">
              {rolesLoading ? (
                <Spin size="small" />
              ) : roleTags.length === 0 ? (
                <span style={{ color: 'var(--color-text-secondary)' }}>暂无角色</span>
              ) : (
                <Space size={[4, 8]} wrap>
                  {roleTags.map((r) => (
                    <Tag key={r.code} color="blue">
                      {r.label}
                    </Tag>
                  ))}
                </Space>
              )}
            </Descriptions.Item>
          </Descriptions>

          {/* 角色分配（受 teacher:assign-role 权限保护） */}
          <div style={{ marginTop: 12 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">调整角色（全量替换，保存后即时生效）</Typography.Text>
              <PermissionButton permission={PERM.TEACHER_ASSIGN_ROLE} type="primary" loading={savingRoles} onClick={handleSaveRoles} disabled={!roleDirty}>
                保存角色
              </PermissionButton>
            </Space>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%', marginTop: 8 }}
              placeholder="选择可分配角色"
              value={selectedRoleIds}
              onChange={(ids) => {
                setSelectedRoleIds(ids as number[]);
                setRoleDirty(true);
              }}
              options={assignableRoles.map((r) => ({
                label: roleLabelMap[r.roleCode] ?? r.roleName,
                value: r.id,
              }))}
            />
            <Typography.Paragraph type="warning" style={{ margin: '8px 0 0', fontSize: 12 }}>
              管理员(ROLE_ADMIN)为受限角色，不可经此分配；如需任命管理员请走 DBA 授权流程。
            </Typography.Paragraph>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* 微信绑定：让新教师可通过微信登录小程序（现有认证机制） */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">微信登录绑定</Typography.Text>
            <PermissionButton permission={PERM.TEACHER_BIND_WECHAT} onClick={handleInitBind} loading={binding}>
              发起微信绑定
            </PermissionButton>
          </Space>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
            生成一次性绑定码（10 分钟有效），交给教师在小程序内完成绑定后即可用微信登录。
          </Typography.Paragraph>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions column={1} size="small" labelStyle={{ width: 100, fontWeight: 500 }}>
            <Descriptions.Item label="创建时间">{formatDate(teacher.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDate(teacher.updatedAt)}</Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Modal
        open={bindModalOpen}
        title="微信绑定码"
        onCancel={() => setBindModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setBindModalOpen(false)}>
            知道了
          </Button>,
        ]}
      >
        {bindResult && (
          <Alert
            type="success"
            showIcon
            message="请让该教师在小程序内使用此绑定码完成绑定"
            description={
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, margin: '8px 0' }}>
                  {bindResult.bindingToken}
                </div>
                <div style={{ color: 'var(--color-text-secondary)' }}>
                  有效期 {Math.floor(bindResult.expiresIn / 60)} 分钟，过期需重新发起。
                </div>
              </div>
            }
          />
        )}
      </Modal>
    </Drawer>
  );
}
