/**
 * Módulo Consultoría Eléctrica ERP
 * Gestión integral de expedientes de optimización de factura eléctrica
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, FolderOpen, FileText, BarChart3, Gauge, TrendingUp,
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { ElectricalNavigationMenu } from './ElectricalNavigationMenu';
import { ElectricalDashboard } from './ElectricalDashboard';
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

type SubView = 
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'detail'; caseId: string };

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

  useEffect(() => {
    if (!companyId) return;
    setStats({
      expedientesActivos: 12,
      suministrosGestionados: 34,
      facturasAnalizadas: 89,
      ahorroEstimado: 15420,
      informesPendientes: 3,
      seguimientosActivos: 8
    });
  }, [companyId]);

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
      {/* Header con estadísticas rápidas */}
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
        {activeModule === 'expedientes' && renderExpedientes()}
        {activeModule === 'clientes' && <ElectricalClientesPanel companyId={companyId} />}
        {activeModule === 'suministros' && <ElectricalSuministrosPanel companyId={companyId} />}
        {activeModule === 'facturas' && <ElectricalFacturasPanel companyId={companyId} />}
        {activeModule === 'contratos' && <ElectricalContratosPanel companyId={companyId} />}
        {activeModule === 'consumo' && <ElectricalConsumoPanel companyId={companyId} />}
        {activeModule === 'catalogo' && <ElectricalTariffCatalogPanel companyId={companyId} />}
        {activeModule === 'comparador' && <ElectricalComparadorPanel companyId={companyId} />}
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
