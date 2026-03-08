import { useElectricalPermissions, ElectricalAction } from '@/hooks/erp/useElectricalPermissions';
import { ReactNode } from 'react';

interface Props {
  action: ElectricalAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ action, children, fallback = null }: Props) {
  const { can } = useElectricalPermissions();
  return can(action) ? <>{children}</> : <>{fallback}</>;
}

export default PermissionGate;
