/**
 * HRAuditPage — Página de Auditoría y Compliance RRHH
 * Ruta: /obelixia-admin/hr/audit
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRAuditDashboard } from '@/components/hr/audit';

export function HRAuditPage() {
  return (
    <DashboardLayout title="Auditoría & Compliance RRHH">
      <div className="p-6">
        <HRAuditDashboard />
      </div>
    </DashboardLayout>
  );
}

export default HRAuditPage;
