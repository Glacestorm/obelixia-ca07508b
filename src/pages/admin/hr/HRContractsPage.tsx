/**
 * HRContractsPage — Ruta: /obelixia-admin/hr/contracts
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRContractsAdvancedPanel } from '@/components/hr/contracts';
import { HRLaborObservationsPanel } from '@/components/hr/contracts';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

export function HRContractsPage() {
  return (
    <DashboardLayout title="Contratos y Observaciones">
      <HRErrorBoundary section="Contratos">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos Avanzados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Prórrogas, bonificaciones TGSS, parcialidad, conversiones y observaciones laborales
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <HRContractsAdvancedPanel />
          <HRLaborObservationsPanel />
        </div>
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRContractsPage;
