/**
 * HRPremiumExecutiveDashboard — P9.7
 * Unified executive view of all 8 Premium HR phases.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw, Shield, Brain, Users, Scale, Layers,
  FileText, BarChart3, UserCog, Activity, TrendingUp,
  TrendingDown, Minus, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useHRPremiumDashboard, type PremiumModuleStatus, type PremiumKPI } from '@/hooks/admin/hr/useHRPremiumDashboard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  p1: <Shield className="h-4 w-4" />,
  p2: <Brain className="h-4 w-4" />,
  p3: <Users className="h-4 w-4" />,
  p4: <Scale className="h-4 w-4" />,
  p5: <Layers className="h-4 w-4" />,
  p6: <FileText className="h-4 w-4" />,
  p7: <BarChart3 className="h-4 w-4" />,
  p8: <UserCog className="h-4 w-4" />,
};

const HEALTH_STYLES: Record<PremiumModuleStatus['health'], { bg: string; text: string; label: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Activo' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Parcial' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Crítico' },
  inactive: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Sin datos' },
};

function TrendIcon({ trend }: { trend?: PremiumKPI['trend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function HRPremiumExecutiveDashboard({ companyId, className }: Props) {
  const {
    modules, totalRecords, activeModules, healthScore, kpis,
    isLoading, error, lastRefresh, refresh,
  } = useHRPremiumDashboard(companyId);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para ver el dashboard Premium</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Premium HR — Executive Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastRefresh
              ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
              : 'Cargando...'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Health Score + Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-primary">{healthScore}%</div>
            <p className="text-sm text-muted-foreground mt-1">Health Score</p>
            <Progress value={healthScore} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{activeModules}<span className="text-lg text-muted-foreground">/8</span></div>
            <p className="text-sm text-muted-foreground mt-1">Módulos Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{totalRecords.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Registros Premium</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold flex items-center justify-center gap-1">
              {modules.filter(m => m.health === 'healthy').length}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Módulos Saludables</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold">{kpi.value}</span>
                <TrendIcon trend={kpi.trend} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modules Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estado de Módulos Premium</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.map((mod) => {
                const style = HEALTH_STYLES[mod.health];
                return (
                  <div
                    key={mod.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      style.bg
                    )}
                  >
                    <div className={cn("p-2 rounded-md bg-background border", style.text)}>
                      {MODULE_ICONS[mod.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{mod.label}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{mod.phase}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{mod.count} registros</span>
                        {mod.lastActivity && (
                          <span>· {formatDistanceToNow(new Date(mod.lastActivity), { locale: es, addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={cn("text-[10px]", style.bg, style.text)} variant="outline">
                      {style.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRPremiumExecutiveDashboard;
