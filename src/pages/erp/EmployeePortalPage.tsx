/**
 * EmployeePortalPage — Página de entrada al portal del empleado
 * V2-ES.9: Shell base con guard de acceso
 */
import { EmployeePortalGuard } from '@/components/erp/hr/employee-portal/EmployeePortalGuard';
import { EmployeePortalShell } from '@/components/erp/hr/employee-portal/EmployeePortalShell';

export default function EmployeePortalPage() {
  return (
    <EmployeePortalGuard>
      <EmployeePortalShell />
    </EmployeePortalGuard>
  );
}
