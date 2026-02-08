/**
 * GALIA Dashboard - Resumen Tab
 * Muestra KPIs, presupuesto y métricas de IA
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Euro, FolderOpen, Bot } from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import type { GaliaKPIs, GaliaAnalyticsData } from '@/hooks/galia/useGaliaAnalytics';

interface PresupuestoStats {
  total: number;
  comprometido: number;
  ejecutado: number;
  disponible: number;
}

interface GaliaResumenTabProps {
  presupuestoStats: PresupuestoStats;
  analyticsData: GaliaAnalyticsData | null;
  kpis: GaliaKPIs | null;
  formatCurrency: (value: number) => string;
}

export function GaliaResumenTab({ 
  presupuestoStats, 
  analyticsData, 
  kpis,
  formatCurrency 
}: GaliaResumenTabProps) {
  return (
    <div className="space-y-4">
      {/* Presupuesto Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            Estado del Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{formatCurrency(presupuestoStats.total)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <p className="text-xs text-muted-foreground">Comprometido</p>
              <p className="text-lg font-bold text-amber-600">
                {formatCurrency(presupuestoStats.comprometido)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Disponible</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(presupuestoStats.disponible)}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-green-500"
              style={{ 
                width: `${presupuestoStats.total ? (presupuestoStats.comprometido / presupuestoStats.total) * 100 : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expedientes por estado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Expedientes por Estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(analyticsData?.expedientesPorEstado || {}).map(([estado, count]) => (
              <div key={estado} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <GaliaStatusBadge estado={estado as any} size="sm" />
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de IA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Rendimiento IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Interacciones (30d)</p>
              <p className="text-2xl font-bold">{kpis?.interaccionesIA || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Tasa Automatización</p>
              <p className="text-2xl font-bold text-green-600">
                {analyticsData?.tasaAutomatizacion || 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GaliaResumenTab;
