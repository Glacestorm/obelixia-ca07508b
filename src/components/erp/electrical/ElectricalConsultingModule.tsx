/**
 * Módulo Consultoría Eléctrica ERP
 * Gestión integral de expedientes de optimización de factura eléctrica
 * 12 secciones: Resumen, Expedientes, Clientes, Suministros, Facturas,
 * Contratos, Consumo, Comparador, Recomendaciones, Informes, Seguimiento, Ajustes
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
import { ElectricalClientesPanel } from './ElectricalClientesPanel';
import { ElectricalSuministrosPanel } from './ElectricalSuministrosPanel';
import { ElectricalFacturasPanel } from './ElectricalFacturasPanel';
import { ElectricalContratosPanel } from './ElectricalContratosPanel';
import { ElectricalConsumoPanel } from './ElectricalConsumoPanel';
import { ElectricalComparadorPanel } from './ElectricalComparadorPanel';
import { ElectricalPotenciaPanel } from './ElectricalPotenciaPanel';
import { ElectricalRecomendacionesPanel } from './ElectricalRecomendacionesPanel';
import { ElectricalInformesPanel } from './ElectricalInformesPanel';
import { ElectricalSeguimientoPanel } from './ElectricalSeguimientoPanel';
import { ElectricalAjustesPanel } from './ElectricalAjustesPanel';

export function ElectricalConsultingModule() {
  const [activeModule, setActiveModule] = useState('dashboard');
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

      {/* Navegación con 12 secciones */}
      <ElectricalNavigationMenu
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        stats={{
          informesPendientes: stats.informesPendientes,
          expedientesActivos: stats.expedientesActivos
        }}
      />

      {/* Contenido de los módulos */}
      <div className="mt-4">
        {activeModule === 'dashboard' && <ElectricalDashboard companyId={companyId} />}
        {activeModule === 'expedientes' && <ElectricalExpedientesPanel companyId={companyId} />}
        {activeModule === 'clientes' && <ElectricalClientesPanel companyId={companyId} />}
        {activeModule === 'suministros' && <ElectricalSuministrosPanel companyId={companyId} />}
        {activeModule === 'facturas' && <ElectricalFacturasPanel companyId={companyId} />}
        {activeModule === 'contratos' && <ElectricalContratosPanel companyId={companyId} />}
        {activeModule === 'consumo' && <ElectricalConsumoPanel companyId={companyId} />}
        {activeModule === 'comparador' && <ElectricalComparadorPanel companyId={companyId} />}
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
