/**
 * HRPremiumAlertsPanel — P9.8
 * Real-time alerts panel for all 8 Premium HR modules.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw, Bell, BellOff, Shield, Brain, Users, Scale,
  Layers, FileText, BarChart3, UserCog, AlertTriangle,
  AlertCircle, Info, Check, X, Activity
} from 'lucide-react';
import { useHRPremiumAlerts, type PremiumAlert, type AlertSeverity, type AlertSource } from '@/hooks/admin/hr/useHRPremiumAlerts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

const SOURCE_ICONS: Record<AlertSource, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  ai_governance: <Brain className="h-4 w-4" />,
  workforce: <Users className="h-4 w-4" />,
  fairness: <Scale className="h-4 w-4" />,
  twin: <Layers className="h-4 w-4" />,
  legal: <FileText className="h-4 w-4" />,
  cnae: <BarChart3 className="h-4 w-4" />,
  role_experience: <UserCog className="h-4 w-4" />,
};

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ReactNode; bg: string; border: string; badge: string }> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bg: 'bg-destructive/5',
    border: 'border-destructive/30',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    badge: 'bg-primary/10 text-primary',
  },
};

export function HRPremiumAlertsPanel({ companyId, className }: Props) {
  const {
    alerts, stats, isLoading, lastScan,
    scanAlerts, acknowledgeAlert, dismissAlert, sourceLabels,
  } = useHRPremiumAlerts(companyId);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <BellOff className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para monitorear alertas</p>
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
            <Bell className="h-5 w-5 text-primary" />
            Alertas Premium HR
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastScan
              ? `Último escaneo ${formatDistanceToNow(lastScan, { locale: es, addSuffix: true })}`
              : 'Escaneando...'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={scanAlerts} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Escanear
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Alertas</p>
          </CardContent>
        </Card>
        <Card className={stats.critical > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className={cn("text-2xl font-bold", stats.critical > 0 && "text-destructive")}>{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Críticas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.warning}</div>
            <p className="text-xs text-muted-foreground">Advertencias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.info}</div>
            <p className="text-xs text-muted-foreground">Informativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Alertas Detectadas
            {stats.newCount > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">{stats.newCount} nuevas</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {alerts.length === 0 ? (
              <div className="py-12 text-center">
                <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500/50" />
                <p className="text-sm text-muted-foreground">Sin alertas activas. Todos los módulos operan con normalidad.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const sev = SEVERITY_CONFIG[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        sev.bg, sev.border,
                        alert.status === 'acknowledged' && 'opacity-60'
                      )}
                    >
                      <div className="shrink-0 mt-0.5">{SOURCE_ICONS[alert.source]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{alert.title}</span>
                          <Badge className={cn("text-[10px]", sev.badge)}>
                            {alert.severity === 'critical' ? 'Crítica' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {sourceLabels[alert.source]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          Detectado {formatDistanceToNow(new Date(alert.detectedAt), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {alert.status === 'new' && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => acknowledgeAlert(alert.id)}
                            title="Reconocer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => dismissAlert(alert.id)}
                          title="Descartar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRPremiumAlertsPanel;
