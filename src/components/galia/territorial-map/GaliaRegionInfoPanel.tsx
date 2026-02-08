/**
 * GaliaRegionInfoPanel - Panel lateral con información detallada de la CCAA seleccionada
 * Muestra KPIs, top sectores, contadores de estado y alertas
 */

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Euro,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase,
  Users,
  Leaf,
  Hotel,
  Factory,
  Landmark
} from 'lucide-react';
import { CCAAMapData, ProvinceMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { CCAAData, formatCompactCurrency } from './spain-paths';
import { cn } from '@/lib/utils';

interface GaliaRegionInfoPanelProps {
  ccaaInfo: CCAAData;
  ccaaData: CCAAMapData | null;
  provinceData: ProvinceMapData[];
  isLoading?: boolean;
  className?: string;
}

// Mock sector data - will be replaced with real API data
const generateMockSectors = (ccaaId: string) => [
  { id: 'agricultura', name: 'Agricultura', icon: Leaf, budget: Math.random() * 5000000 + 1000000, percentage: 35 },
  { id: 'turismo', name: 'Turismo Rural', icon: Hotel, budget: Math.random() * 3000000 + 500000, percentage: 25 },
  { id: 'industria', name: 'Industria', icon: Factory, budget: Math.random() * 2000000 + 300000, percentage: 20 },
  { id: 'servicios', name: 'Servicios', icon: Briefcase, budget: Math.random() * 1500000 + 200000, percentage: 12 },
  { id: 'patrimonio', name: 'Patrimonio', icon: Landmark, budget: Math.random() * 1000000 + 100000, percentage: 8 },
];

// Mock alerts - will be replaced with real API data
const generateMockAlerts = (ccaaId: string) => {
  const alerts = [
    { id: '1', type: 'warning', message: 'Plazo de justificación próximo (5 expedientes)', priority: 'high' },
    { id: '2', type: 'info', message: 'Nueva convocatoria disponible: LEADER 2026', priority: 'medium' },
    { id: '3', type: 'error', message: 'Documentación pendiente en 2 expedientes', priority: 'high' },
  ];
  return alerts.slice(0, Math.floor(Math.random() * 3) + 1);
};

export const GaliaRegionInfoPanel = memo(function GaliaRegionInfoPanel({
  ccaaInfo,
  ccaaData,
  provinceData,
  isLoading = false,
  className
}: GaliaRegionInfoPanelProps) {
  // Calculate aggregated stats
  const stats = useMemo(() => {
    if (!ccaaData) return null;

    const totalGALs = provinceData.reduce((sum, p) => sum + p.gals, 0);
    const totalGrants = ccaaData.totalGrants;
    const totalBudget = ccaaData.totalBudget;
    const executionRate = ccaaData.executionRate;

    // Status counters (mock - will be from API)
    const statusCounts = {
      ok: Math.floor(totalGrants * 0.6),
      warning: Math.floor(totalGrants * 0.25),
      critical: Math.floor(totalGrants * 0.15)
    };

    return {
      totalGALs,
      totalGrants,
      totalBudget,
      executionRate,
      statusCounts
    };
  }, [ccaaData, provinceData]);

  const sectors = useMemo(() => generateMockSectors(ccaaInfo.id), [ccaaInfo.id]);
  const alerts = useMemo(() => generateMockAlerts(ccaaInfo.id), [ccaaInfo.id]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn("space-y-4", className)}
    >
      {/* Main KPIs Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Resumen Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* GALs and Provinces */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/80 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{ccaaInfo.provinces.length}</div>
              <div className="text-[10px] text-muted-foreground">Provincias</div>
            </div>
            <div className="bg-background/80 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-accent">{stats.totalGALs}</div>
              <div className="text-[10px] text-muted-foreground">GALs activos</div>
            </div>
          </div>

          <Separator />

          {/* Main stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Total ayudas
              </span>
              <span className="font-semibold">{stats.totalGrants.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" />
                Presupuesto
              </span>
              <span className="font-semibold">{formatCompactCurrency(stats.totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Tasa ejecución
              </span>
              <span className={cn(
                "font-semibold",
                stats.executionRate >= 75 ? "text-green-600" :
                stats.executionRate >= 50 ? "text-yellow-600" : "text-red-600"
              )}>
                {stats.executionRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Execution progress bar */}
          <div className="pt-1">
            <Progress 
              value={stats.executionRate} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Counters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            Estado de expedientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
              <span className="text-lg font-bold text-green-600">{stats.statusCounts.ok}</span>
              <span className="text-[9px] text-muted-foreground">OK</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600 mb-1" />
              <span className="text-lg font-bold text-yellow-600">{stats.statusCounts.warning}</span>
              <span className="text-[9px] text-muted-foreground">Pendiente</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-red-500/10 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600 mb-1" />
              <span className="text-lg font-bold text-red-600">{stats.statusCounts.critical}</span>
              <span className="text-[9px] text-muted-foreground">Crítico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Sectors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Top 5 sectores por inversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[160px]">
            <div className="space-y-2">
              {sectors.map((sector, idx) => {
                const IconComponent = sector.icon;
                return (
                  <div 
                    key={sector.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-medium shrink-0">
                      {idx + 1}
                    </span>
                    <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">{sector.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{sector.percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 h-1 bg-muted rounded-full mr-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${sector.percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium">{formatCompactCurrency(sector.budget)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Alertas prioritarias
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {alerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "text-xs p-2 rounded-lg flex items-start gap-2",
                    alert.type === 'error' && "bg-red-500/10 text-red-700",
                    alert.type === 'warning' && "bg-yellow-500/10 text-yellow-700",
                    alert.type === 'info' && "bg-blue-500/10 text-blue-700"
                  )}
                >
                  {alert.type === 'error' && <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                  {alert.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                  {alert.type === 'info' && <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
});

export default GaliaRegionInfoPanel;
