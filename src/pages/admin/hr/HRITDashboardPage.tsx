/**
 * HRITDashboardPage — Página del módulo de Incapacidad Temporal
 * Ruta: /obelixia-admin/hr/it
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRITProcessPanel } from '@/components/hr/it';

export function HRITDashboardPage() {
  return (
    <DashboardLayout title="Incapacidad Temporal — RRHH">
      <div className="p-6">
        <HRITProcessPanel />
      </div>
    </DashboardLayout>
  );
}

export default HRITDashboardPage;
