/**
 * Módulo Consultoría Eléctrica ERP - Phase 3
 * Gestión integral + capa operativa de consultoría eléctrica profesional
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, FolderOpen, FileText, BarChart3, Gauge, TrendingUp,
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { supabase } from '@/integrations/supabase/client';
import { ElectricalNavigationMenu } from './ElectricalNavigationMenu';
import { ElectricalDashboard } from './ElectricalDashboard';
import { ElectricalOperationalDashboard } from './ElectricalOperationalDashboard';
import { ElectricalExpedientesPanel } from './ElectricalExpedientesPanel';
import { ElectricalNewCaseForm } from './ElectricalNewCaseForm';
import { ElectricalCaseDetail } from './ElectricalCaseDetail';
import { ElectricalClientesPanel } from './ElectricalClientesPanel';
import { ElectricalSuministrosPanel } from './ElectricalSuministrosPanel';
import { ElectricalFacturasPanel } from './ElectricalFacturasPanel';
import { ElectricalContratosPanel } from './ElectricalContratosPanel';
import { ElectricalConsumoPanel } from './ElectricalConsumoPanel';
import { ElectricalComparadorPanel } from './ElectricalComparadorPanel';
import { ElectricalTariffCatalogPanel } from './ElectricalTariffCatalogPanel';
import { ElectricalIndexedPricesPanel } from './ElectricalIndexedPricesPanel';
import { ElectricalPotenciaPanel } from './ElectricalPotenciaPanel';
import { ElectricalRecomendacionesPanel } from './ElectricalRecomendacionesPanel';
import { ElectricalInformesPanel } from './ElectricalInformesPanel';
import { ElectricalSeguimientoPanel } from './ElectricalSeguimientoPanel';
import { ElectricalAjustesPanel } from './ElectricalAjustesPanel';
import { ElectricalExecutiveDashboard } from './ElectricalExecutiveDashboard';
import { ExternalIntegrationsPanel } from './ExternalIntegrationsPanel';
import { NotificationsPanel } from './NotificationsPanel';

type SubView = 
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'detail'; caseId: string }
  | { type: 'simulate'; caseId: string };

export function ElectricalConsultingModule() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [subView, setSubView] = useState<SubView>({ type: 'list' });
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id;

  const [stats, setStats] = useState({
    expedientesActivos: 0,
    suministrosGestionados: 0,
    facturasAnalizadas: 0,
    ahorroEstimado: 0,
    informesPendientes: 0,
    seguimientosActivos: 0
  });

  // Reset subView when switching modules
  useEffect(() => { setSubView({ type: 'list' }); }, [activeModule]);

  // Fetch real stats from Supabase
  const fetchStats = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, status, estimated_annual_savings')
        .eq('company_id', companyId);

      if (!cases) { return; }

      const activeCases = cases.filter(c => !['completed', 'cancelled'].includes(c.status));
      const totalSavings = cases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0);
      const caseIds = cases.map(c => c.id);

      const [suppliesRes, invoicesRes, trackingRes, reportsRes] = await Promise.all([
        caseIds.length > 0
          ? supabase.from('energy_supplies').select('id', { count: 'exact', head: true }).in('case_id', caseIds)
          : Promise.resolve({ count: 0 }),
        caseIds.length > 0
          ? supabase.from('energy_invoices').select('id', { count: 'exact', head: true }).in('case_id', caseIds)
          : Promise.resolve({ count: 0 }),
        caseIds.length > 0
          ? supabase.from('energy_tracking').select('id', { count: 'exact', head: true }).in('case_id', caseIds)
          : Promise.resolve({ count: 0 }),
        caseIds.length > 0
          ? supabase.from('energy_reports').select('id', { count: 'exact', head: true }).in('case_id', caseIds)
          : Promise.resolve({ count: 0 }),
      ]);

      setStats({
        expedientesActivos: activeCases.length,
        suministrosGestionados: (suppliesRes as any).count || 0,
        facturasAnalizadas: (invoicesRes as any).count || 0,
        ahorroEstimado: totalSavings,
        informesPendientes: (reportsRes as any).count || 0,
        seguimientosActivos: (trackingRes as any).count || 0,
      });
    } catch (err) {
      console.error('[ElectricalConsultingModule] stats error:', err);
    }
  }, [companyId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Selecciona una empresa</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Para acceder al módulo de Consultoría Eléctrica, selecciona una empresa desde el selector superior.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenSimulator = (caseId: string) => {
    setActiveModule('comparador');
    setSubView({ type: 'simulate', caseId });
  };

  const handleNavigateToCase = (caseId: string) => {
    setActiveModule('expedientes');
    setSubView({ type: 'detail', caseId });
  };

  const renderExpedientes = () => {
    if (subView.type === 'new') {
      return (
        <ElectricalNewCaseForm
          companyId={companyId}
          onCreated={(caseId) => setSubView({ type: 'detail', caseId })}
          onCancel={() => setSubView({ type: 'list' })}
        />
      );
    }
    if (subView.type === 'detail') {
      return (
        <ElectricalCaseDetail
          caseId={subView.caseId}
          companyId={companyId}
          onBack={() => setSubView({ type: 'list' })}
          onOpenSimulator={handleOpenSimulator}
        />
      );
    }
    return (
      <ElectricalExpedientesPanel
        companyId={companyId}
        onNewCase={() => setSubView({ type: 'new' })}
        onViewCase={(caseId) => setSubView({ type: 'detail', caseId })}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas reales + notifications */}
      <div className="flex items-center justify-end mb-1">
        <NotificationsPanel companyId={companyId} onNavigateToCase={handleNavigateToCase} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Expedientes</p>
                <p className="text-lg font-bold">{stats.expedientesActivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Suministros</p>
                <p className="text-lg font-bold">{stats.suministrosGestionados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Facturas</p>
                <p className="text-lg font-bold">{stats.facturasAnalizadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Ahorro €</p>
                <p className="text-lg font-bold">{stats.ahorroEstimado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Informes</p>
                <p className="text-lg font-bold">{stats.informesPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Seguimiento</p>
                <p className="text-lg font-bold">{stats.seguimientosActivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ElectricalNavigationMenu
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        stats={{ informesPendientes: stats.informesPendientes, expedientesActivos: stats.expedientesActivos }}
      />

      <div className="mt-4">
        {activeModule === 'dashboard' && <ElectricalDashboard companyId={companyId} />}
        {activeModule === 'operacional' && (
          <ElectricalOperationalDashboard companyId={companyId} onNavigateToCase={handleNavigateToCase} />
        )}
        {activeModule === 'expedientes' && renderExpedientes()}
        {activeModule === 'clientes' && <ElectricalClientesPanel companyId={companyId} />}
        {activeModule === 'suministros' && <ElectricalSuministrosPanel companyId={companyId} />}
        {activeModule === 'facturas' && <ElectricalFacturasPanel companyId={companyId} />}
        {activeModule === 'contratos' && <ElectricalContratosPanel companyId={companyId} />}
        {activeModule === 'consumo' && <ElectricalConsumoPanel companyId={companyId} />}
        {activeModule === 'catalogo' && <ElectricalTariffCatalogPanel companyId={companyId} />}
        {activeModule === 'comparador' && (
          <ElectricalComparadorPanel 
            companyId={companyId} 
            caseId={subView.type === 'simulate' ? subView.caseId : undefined}
          />
        )}
        {activeModule === 'precios-indexados' && <ElectricalIndexedPricesPanel />}
        {activeModule === 'potencia' && <ElectricalPotenciaPanel companyId={companyId} />}
        {activeModule === 'recomendaciones' && <ElectricalRecomendacionesPanel companyId={companyId} />}
        {activeModule === 'informes' && <ElectricalInformesPanel companyId={companyId} />}
        {activeModule === 'seguimiento' && <ElectricalSeguimientoPanel companyId={companyId} />}
        {activeModule === 'ajustes' && <ElectricalAjustesPanel companyId={companyId} />}
      </div>
    </div>
  );
}

export default ElectricalConsultingModule;
