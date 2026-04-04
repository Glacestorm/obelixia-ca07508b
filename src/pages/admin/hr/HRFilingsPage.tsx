/**
 * HRFilingsPage — Ruta: /obelixia-admin/hr/files
 * Generación y tramitación de ficheros TGSS/AEAT
 */
import { useState, useCallback } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { HRFilingsPanel, HRFileGeneratorPanel } from '@/components/hr/filings';

export function HRFilingsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  // TODO: replace with real company context
  const companyId = 'demo-company';

  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DashboardLayout title="Ficheros TGSS/AEAT">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ficheros TGSS / AEAT</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generación y tramitación de FAN, FDI, AFI, modelos fiscales · SILTRA · RED
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <HRFileGeneratorPanel
            companyId={companyId}
            onGenerated={handleGenerated}
            className="xl:col-span-1"
          />
          <HRFilingsPanel
            key={refreshKey}
            companyId={companyId}
            className="xl:col-span-2"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HRFilingsPage;
