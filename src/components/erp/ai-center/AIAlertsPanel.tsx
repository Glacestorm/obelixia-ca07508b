import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellRing,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Shield,
  Gauge,
  DollarSign,
  Activity,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAIAlerts, type AIAlert, type AlertSeverity, type AlertCategory } from '@/hooks/erp/ai-center/useAIAlerts';

const severityConfig: Record<AlertSeverity, { icon: typeof AlertOctagon; color: string; bg: string; label: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/30', label: 'Crítico' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Aviso' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Info' },
};

const categoryConfig: Record<AlertCategory, { icon: typeof Gauge; label: string }> = {
  performance: { icon: Gauge, label: 'Rendimiento' },
  compliance: { icon: Shield, label: 'Cumplimiento' },
  cost: { icon: DollarSign, label: 'Costes' },
  security: { icon: Shield, label: 'Seguridad' },
  availability: { icon: Activity, label: 'Disponibilidad' },
};

function AlertCard({ alert, onAcknowledge }: { alert: AIAlert; onAcknowledge: (id: string) => void }) {
  const sev = severityConfig[alert.severity];
  const cat = categoryConfig[alert.category];
  const SevIcon = sev.icon;
  const CatIcon = cat.icon;

  return (
    <div className={cn('p-3 rounded-lg border transition-all', sev.bg, alert.isAcknowledged && 'opacity-50')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <SevIcon className={cn('h-4 w-4 mt-0.5 shrink-0', sev.color)} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{alert.message}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                <CatIcon className="h-2.5 w-2.5" />
                {cat.label}
              </Badge>
              {alert.metricValue != null && alert.thresholdValue != null && (
                <span className="text-[10px] text-muted-foreground">
                  {alert.metricValue.toFixed(1)} / {alert.thresholdValue}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(alert.createdAt), { locale: es, addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        {!alert.isAcknowledged && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onAcknowledge(alert.id)}>
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AIAlertsPanel() {
  const {
    alerts,
    activeAlerts,
    rules,
    loading,
    lastCheck,
    criticalCount,
    warningCount,
    byCategory,
    runAlertCheck,
    acknowledgeAlert,
    toggleRule,
  } = useAIAlerts();

  const [tab, setTab] = useState('active');

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn(criticalCount > 0 && 'border-red-500/40 bg-red-500/5')}>
          <CardContent className="p-4 text-center">
            <AlertOctagon className={cn('h-6 w-6 mx-auto mb-1', criticalCount > 0 ? 'text-red-600' : 'text-muted-foreground')} />
            <p className="text-2xl font-bold">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticas</p>
          </CardContent>
        </Card>
        <Card className={cn(warningCount > 0 && 'border-amber-500/40 bg-amber-500/5')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={cn('h-6 w-6 mx-auto mb-1', warningCount > 0 ? 'text-amber-600' : 'text-muted-foreground')} />
            <p className="text-2xl font-bold">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{activeAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Settings2 className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{rules.filter((r) => r.enabled).length}/{rules.length}</p>
            <p className="text-xs text-muted-foreground">Reglas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active" className="text-xs gap-1">
              <BellRing className="h-3.5 w-3.5" />
              Alertas
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{activeAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1">Historial</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              Reglas
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {lastCheck && (
              <span className="text-[10px] text-muted-foreground">
                Último check {formatDistanceToNow(lastCheck, { locale: es, addSuffix: true })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={runAlertCheck} disabled={loading} className="h-7 text-xs gap-1">
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              Verificar
            </Button>
          </div>
        </div>

        {/* Active Alerts */}
        <TabsContent value="active" className="mt-3">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Sin alertas activas</p>
                <p className="text-sm text-muted-foreground mt-1">Todos los sistemas operan con normalidad</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* By category */}
              {(Object.entries(byCategory) as [AlertCategory, AIAlert[]][])
                .filter(([, arr]) => arr.length > 0)
                .map(([cat, catAlerts]) => {
                  const cfg = categoryConfig[cat];
                  const CatIcon = cfg.icon;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{catAlerts.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {catAlerts.map((a) => (
                          <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historial de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin historial aún</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((a) => (
                      <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Config */}
        <TabsContent value="rules" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reglas de Alerta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.map((rule) => {
                  const sev = severityConfig[rule.severity];
                  const cat = categoryConfig[rule.category];
                  const CatIcon = cat.icon;
                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        rule.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <CatIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{rule.name}</p>
                            <Badge variant="outline" className={cn('text-[9px] h-4 px-1', sev.color)}>
                              {sev.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                        </div>
                      </div>
                      <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIAlertsPanel;
