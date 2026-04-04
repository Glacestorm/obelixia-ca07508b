/**
 * HRITDashboardPage — Página del módulo de Incapacidad Temporal
 * Ruta: /obelixia-admin/hr/it
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRITProcessPanel } from '@/components/hr/it';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

export function HRITDashboardPage() {
  return (
    <DashboardLayout title="Incapacidad Temporal — RRHH">
      <HRErrorBoundary section="Incapacidad Temporal">
      <div className="p-6">
        <HRITProcessPanel />
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRITDashboardPage;
