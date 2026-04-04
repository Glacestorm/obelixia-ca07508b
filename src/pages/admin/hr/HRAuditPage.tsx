/**
 * HRAuditPage — Página de Auditoría y Compliance RRHH
 * Ruta: /obelixia-admin/hr/audit
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRAuditDashboard } from '@/components/hr/audit';
import { HRComplianceKPIsDashboard } from '@/components/hr/compliance/HRComplianceKPIsDashboard';
import { ExternalAuditorExportDialog } from '@/components/hr/audit/ExternalAuditorExportDialog';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

export function HRAuditPage() {
  return (
    <DashboardLayout title="Auditoría & Compliance RRHH">
      <HRErrorBoundary section="Auditoría & Compliance">
      <div className="p-6 space-y-6">
        <HRComplianceKPIsDashboard />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Auditoría Documental</h2>
          <ExternalAuditorExportDialog />
        </div>
        <HRAuditDashboard />
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRAuditPage;
