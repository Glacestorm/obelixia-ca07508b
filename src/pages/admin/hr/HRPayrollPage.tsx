/**
 * HRPayrollPage — Ruta: /obelixia-admin/hr/payroll
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { PayrollSimulatorPanel, HRCustomConceptsPanel } from '@/components/hr/payroll';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

export function HRPayrollPage() {
  return (
    <DashboardLayout title="Motor de Nómina">
      <HRErrorBoundary section="Motor de Nómina">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motor de Nómina</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cálculo completo de devengos, deducciones, bases SS, IRPF y neto · RDL 3/2026
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PayrollSimulatorPanel />
          <HRCustomConceptsPanel />
        </div>
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRPayrollPage;
