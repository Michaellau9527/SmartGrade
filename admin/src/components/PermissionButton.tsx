import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import type { ReactNode } from 'react';
import { useUserStore } from '@/stores/user';

interface PermissionButtonProps extends Omit<ButtonProps, 'onClick'> {
  permission: string;
  children: ReactNode;
  onClick?: () => void;
}

export default function PermissionButton({ permission, children, onClick, ...rest }: PermissionButtonProps) {
  const hasPermission = useUserStore((state) => state.hasPermission(permission));

  if (!hasPermission) return null;

  return (
    <Button onClick={onClick} {...rest}>
      {children}
    </Button>
  );
}