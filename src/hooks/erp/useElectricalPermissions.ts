import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type ElectricalAction =
  | 'view_cases'
  | 'edit_cases'
  | 'approve_recommendation'
  | 'generate_report'
  | 'close_case'
  | 'edit_tariff_catalog'
  | 'manage_tasks'
  | 'view_dashboard'
  | 'ai_analysis';

type ElectricalRole = 'superadmin' | 'consultor_energetico' | 'analista' | 'comercial' | 'cliente_lectura';

const ROLE_MAPPING: Record<string, ElectricalRole> = {
  superadmin: 'superadmin',
  admin: 'consultor_energetico',
  responsable_comercial: 'consultor_energetico',
  director_comercial: 'consultor_energetico',
  director_oficina: 'analista',
  gestor: 'analista',
  auditor: 'analista',
  user: 'cliente_lectura',
};

const PERMISSION_MATRIX: Record<ElectricalRole, ElectricalAction[]> = {
  superadmin: [
    'view_cases', 'edit_cases', 'approve_recommendation', 'generate_report',
    'close_case', 'edit_tariff_catalog', 'manage_tasks', 'view_dashboard', 'ai_analysis',
  ],
  consultor_energetico: [
    'view_cases', 'edit_cases', 'approve_recommendation', 'generate_report',
    'close_case', 'edit_tariff_catalog', 'manage_tasks', 'view_dashboard', 'ai_analysis',
  ],
  analista: [
    'view_cases', 'edit_cases', 'generate_report', 'manage_tasks', 'view_dashboard', 'ai_analysis',
  ],
  comercial: [
    'view_cases', 'view_dashboard',
  ],
  cliente_lectura: [
    'view_cases',
  ],
};

export function useElectricalPermissions() {
  const { userRole } = useAuth();

  const electricalRole = useMemo((): ElectricalRole => {
    if (!userRole) return 'cliente_lectura';
    return ROLE_MAPPING[userRole] || 'cliente_lectura';
  }, [userRole]);

  const can = useMemo(() => {
    const permissions = PERMISSION_MATRIX[electricalRole] || [];
    return (action: ElectricalAction): boolean => permissions.includes(action);
  }, [electricalRole]);

  const allowedActions = useMemo(() => PERMISSION_MATRIX[electricalRole] || [], [electricalRole]);

  return { electricalRole, can, allowedActions };
}
