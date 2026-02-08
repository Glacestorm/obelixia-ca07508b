/**
 * GaliaRegionInfoPanel - KPIs and Alerts for Regional View
 * Shows complete information with sectors and alerts
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Euro, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Building2,
  Factory,
  Leaf,
  ShoppingBag,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { ProvinceMapData, CCAAMapData } from '@/hooks/galia/useGaliaTerritorialMap';
import { CCAAData, formatCompactCurrency } from './spain-paths';
import { cn } from '@/lib/utils';

interface GaliaRegionInfoPanelProps {
  ccaaInfo: CCAAData;
  ccaaData: CCAAMapData | null;
  provinceData: ProvinceMapData[];
  className?: string;
}

// Mock sector data (would come from real API)
const getSectorData = (ccaaId: string) => [
  { name: 'Agroalimentario', icon: Leaf, percentage: 35, grants: 42, color: 'text-green-600' },
  { name: 'Turismo Rural', icon: Building2, percentage: 25, grants: 30, color: 'text-blue-600' },
  { name: 'Comercio Local', icon: ShoppingBag, percentage: 20, grants: 24, color: 'text-purple-600' },
  { name: 'Industria', icon: Factory, percentage: 12, grants: 14, color: 'text-orange-600' },
  { name: 'Servicios', icon: Briefcase, percentage: 8, grants: 10, color: 'text-cyan-600' },
];

// Mock alert data
const getAlertData = (ccaaId: string, provinceData: ProvinceMapData[]) => {
  const alerts: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    province?: string;
  }> = [];

  // Check for low execution provinces
  provinceData.forEach(p => {
    if (p.executionRate < 40) {
      alerts.push({
        type: 'error',
        title: 'Ejecución crítica',
        description: `${p.name} con solo ${p.executionRate.toFixed(0)}% de ejecución`,
        province: p.name
      });
    } else if (p.executionRate < 60) {
      alerts.push({
        type: 'warning',
        title: 'Ejecución baja',
        description: `${p.name} requiere atención (${p.executionRate.toFixed(0)}%)`,
        province: p.name
      });
    }
  });

  // Add some general alerts
  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      title: 'Sin alertas críticas',
      description: 'Todos los expedientes están en orden'
    });
  }

  return alerts.slice(0, 5);
};

export const GaliaRegionInfoPanel = memo(function GaliaRegionInfoPanel({
  ccaaInfo,
  ccaaData,
  provinceData,
  className
}: GaliaRegionInfoPanelProps) {
  // Calculate aggregated data
  const aggregated = useMemo(() => {
    const totalGrants = provinceData.reduce((s, p) => s + p.totalGrants, 0);
    const totalBudget = provinceData.reduce((s, p) => s + p.totalBudget, 0);
    const avgExecution = provinceData.length > 0
      ? provinceData.reduce((s, p) => s + p.executionRate, 0) / provinceData.length
      : 0;
    const totalGals = provinceData.reduce((s, p) => s + p.gals, 0);
    
    return { totalGrants, totalBudget, avgExecution, totalGals };
  }, [provinceData]);

  // Get mock sector and alert data
  const sectors = useMemo(() => getSectorData(ccaaInfo.id), [ccaaInfo.id]);
  const alerts = useMemo(() => getAlertData(ccaaInfo.id, provinceData), [ccaaInfo.id, provinceData]);

  // Status counts
  const statusCounts = useMemo(() => {
    const approved = provinceData.filter(p => p.executionRate >= 75).length;
    const pending = provinceData.filter(p => p.executionRate >= 50 && p.executionRate < 75).length;
    const critical = provinceData.filter(p => p.executionRate < 50).length;
    return { approved, pending, critical };
  }, [provinceData]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main KPIs */}
      <Card className="bg-gradient-to-br from-muted/50 to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Resumen {ccaaInfo.shortName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/60 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Ayudas
              </div>
              <div className="text-lg font-bold">{aggregated.totalGrants.toLocaleString()}</div>
            </div>
            <div className="bg-background/60 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Euro className="h-3 w-3" />
                Presupuesto
              </div>
              <div className="text-lg font-bold">{formatCompactCurrency(aggregated.totalBudget)}</div>
            </div>
          </div>

          <div className="bg-background/60 rounded-lg p-3">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Ejecución media</span>
              <span className={cn(
                "font-semibold",
                aggregated.avgExecution >= 75 ? "text-green-600" :
                aggregated.avgExecution >= 50 ? "text-yellow-600" : "text-red-600"
              )}>
                {aggregated.avgExecution.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={aggregated.avgExecution} 
              className="h-2"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              GALs activos
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {aggregated.totalGals}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Province status summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estado Provincias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{statusCounts.approved}</span>
              <span className="text-muted-foreground">OK</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{statusCounts.pending}</span>
              <span className="text-muted-foreground">Atencion</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{statusCounts.critical}</span>
              <span className="text-muted-foreground">Crítico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top sectors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Factory className="h-4 w-4 text-accent" />
            Top 5 Sectores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[140px]">
            <div className="space-y-2">
              {sectors.map((sector, idx) => {
                const IconComponent = sector.icon;
                return (
                  <div 
                    key={sector.name}
                    className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-1.5 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded flex items-center justify-center bg-muted",
                        sector.color
                      )}>
                        <IconComponent className="h-3 w-3" />
                      </span>
                      <span className="truncate max-w-[100px]">{sector.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{sector.grants}</span>
                      <Badge variant="outline" className="text-[9px] px-1">
                        {sector.percentage}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Alertas
            {alerts.filter(a => a.type === 'error').length > 0 && (
              <Badge variant="destructive" className="text-[9px] ml-auto">
                {alerts.filter(a => a.type === 'error').length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[120px]">
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-2 rounded-lg border text-xs",
                    alert.type === 'error' && "bg-destructive/10 border-destructive/30",
                    alert.type === 'warning' && "bg-yellow-500/10 border-yellow-500/30",
                    alert.type === 'info' && "bg-blue-500/10 border-blue-500/30"
                  )}
                >
                  <div className="font-medium">{alert.title}</div>
                  <div className="text-muted-foreground mt-0.5">{alert.description}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});

export default GaliaRegionInfoPanel;
