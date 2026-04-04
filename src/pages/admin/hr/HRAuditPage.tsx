/**
 * HRAuditPage — Página de Auditoría y Compliance RRHH
 * Ruta: /obelixia-admin/hr/audit
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRAuditDashboard } from '@/components/hr/audit';
import { HRComplianceKPIsDashboard } from '@/components/hr/compliance/HRComplianceKPIsDashboard';

export function HRAuditPage() {
  return (
    <DashboardLayout title="Auditoría & Compliance RRHH">
      <div className="p-6 space-y-6">
        <HRComplianceKPIsDashboard />
        <HRAuditDashboard />
      </div>
    </DashboardLayout>
  );
}

export default HRAuditPage;
