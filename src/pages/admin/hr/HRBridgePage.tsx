/**
 * HRBridgePage — Ruta: /obelixia-admin/hr/bridge
 * Bridge contabilidad / tesorería / legal
 */
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRBridgeDashboard } from '@/components/hr/bridge';

export function HRBridgePage() {
  const companyId = 'demo-company';

  return (
    <DashboardLayout title="Bridge Contabilidad & Tesorería">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bridge Contabilidad / Tesorería / Legal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sincronización cross-module · Asientos PGC 2007 · Órdenes de pago · Compliance
          </p>
        </div>

        <HRBridgeDashboard companyId={companyId} />
      </div>
    </DashboardLayout>
  );
}

export default HRBridgePage;
