/**
 * HRGarnishmentsPage — Ruta: /obelixia-admin/hr/garnishments
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRGarnishmentPanel } from '@/components/hr/garnishments';

export function HRGarnishmentsPage() {
  return (
    <DashboardLayout title="Embargos Judiciales">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Embargos Judiciales</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Art. 607-608 LEC · Motor de tramos y simulador de impacto
          </p>
        </div>
        <HRGarnishmentPanel />
      </div>
    </DashboardLayout>
  );
}

export default HRGarnishmentsPage;
