/**
 * usePortalRole — Determines the mobile portal role for the current user
 * RRHH-MOBILE.1 Phase 5: Role abstraction for scalable navigation
 *
 * Current implementation: always returns 'employee'.
 * Future: check erp_hr_employees.is_manager, user_roles table, or org_units hierarchy
 * to return 'manager' or 'hr_light' for elevated mobile views.
 *
 * EVOLUTION PLAN:
 * ─────────────────────────────────────────────────────────
 * Phase 2 (Manager):
 *   - Check if employee has direct reports (erp_hr_employees where reports_to = employee.id)
 *   - OR check user_roles for 'manager' role
 *   - Unlocks: "Equipo" tab with team absences, pending approvals, team incidents
 *
 * Phase 3 (HR Light):
 *   - Check user_roles for 'hr_admin' or 'hr_light' role
 *   - Unlocks: "Gestión" tab with urgent tasks, pending requests queue, expedient search
 *
 * IMPORTANT: Role checks MUST use server-side validation (RLS / security definer functions).
 * Never trust client-side role storage for access control.
 * ─────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';
import { type EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';

export type PortalRole = 'employee' | 'manager' | 'hr_light';

interface PortalRoleResult {
  role: PortalRole;
  isManager: boolean;
  isHRLight: boolean;
  /** Whether role detection is still loading */
  isLoading: boolean;
}

export function usePortalRole(_employee: EmployeeProfile | null): PortalRoleResult {
  return useMemo(() => {
    // Phase 5 MVP: always employee
    // Future: query direct reports count or user_roles table
    const role = 'employee' as PortalRole;

    return {
      role,
      isManager: role === ('manager' as PortalRole),
      isHRLight: role === ('hr_light' as PortalRole),
      isLoading: false,
    };
  }, [_employee?.id]);
}
