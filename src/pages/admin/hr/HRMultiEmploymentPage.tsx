/**
 * HRMultiEmploymentPage — Ruta: /obelixia-admin/hr/multi-employment
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRMultiEmploymentPanel, SolidaritySimulator, BaseDistributionPanel } from '@/components/hr/multi-employment';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

export function HRMultiEmploymentPage() {
  return (
    <DashboardLayout title="Pluriempleo / Pluriactividad">
      <HRErrorBoundary section="Pluriempleo">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pluriempleo y Pluriactividad</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Distribución de bases entre empleadores · Cotización de solidaridad 2026 · Orden PJC/297/2026 art. 10
          </p>
        </div>

        <HRMultiEmploymentPanel />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BaseDistributionPanel />
          <SolidaritySimulator />
        </div>
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRMultiEmploymentPage;
