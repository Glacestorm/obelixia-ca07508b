import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw, Activity, AlertTriangle, CheckCircle, XCircle,
  Webhook, FileText, Shield, Gauge, Server, Clock
} from 'lucide-react';
import { useHROperationalHealth } from '@/hooks/admin/hr/useHROperationalHealth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

export function HROperationalHealthPanel({ companyId, className }: Props) {
  const { health, isLoading, runFullHealthCheck, startAutoRefresh, stopAutoRefresh } = useHROperationalHealth(companyId);

  useEffect(() => {
    startAutoRefresh(120000);
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'degraded': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'critical': case 'error': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalFailed = health.reportingStatus.failedReports +
    health.reportingStatus.failedBoardPacks +
    health.reportingStatus.failedRegulatory;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Operaciones RRHH</CardTitle>
              <p className="text-xs text-muted-foreground">
                {health.lastChecked
                  ? `Actualizado ${formatDistanceToNow(health.lastChecked, { locale: es, addSuffix: true })}`
                  : 'Cargando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor(health.overallHealth)}>
              {health.overallHealth === 'healthy' ? 'Saludable' :
               health.overallHealth === 'degraded' ? 'Degradado' : 'Crítico'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={runFullHealthCheck} disabled={isLoading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-3">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="ratelimits" className="text-xs">
              Rate Limits
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs">
              Webhooks {health.webhookFailures.length > 0 && `(${health.webhookFailures.length})`}
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">
              Reportes {totalFailed > 0 && `(${totalFailed})`}
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">
              Errores {health.recentErrors.length > 0 && `(${health.recentErrors.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Funciones</span>
                </div>
                <p className="text-2xl font-bold">{health.edgeFunctions.length}</p>
                <p className="text-xs text-muted-foreground">activas</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Webhooks</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{health.webhookFailures.length}</p>
                <p className="text-xs text-muted-foreground">fallidos (24h)</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Reportes</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{totalFailed}</p>
                <p className="text-xs text-muted-foreground">fallidos</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Integraciones</span>
                </div>
                <p className="text-2xl font-bold">
                  {health.integrationStatus.filter(i => i.status === 'active').length}
                </p>
                <p className="text-xs text-muted-foreground">
                  de {health.integrationStatus.length} activas
                </p>
              </Card>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" /> Edge Functions
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {health.edgeFunctions.map(fn => (
                  <div key={fn.name} className="flex items-center gap-2 p-2 rounded-md border bg-card text-xs">
                    <StatusIcon status={fn.status} />
                    <span className="truncate font-mono">{fn.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Rate Limits */}
          <TabsContent value="ratelimits">
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {health.rateLimitStatus.map(rl => (
                  <div key={rl.functionName} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono">{rl.functionName}</span>
                      <Badge variant={rl.percentUsed > 80 ? 'destructive' : rl.percentUsed > 50 ? 'secondary' : 'outline'}>
                        {rl.percentUsed}%
                      </Badge>
                    </div>
                    <Progress value={rl.percentUsed} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{rl.dailyUsed} usados</span>
                      <span>{rl.dailyLimit} límite diario</span>
                    </div>
                  </div>
                ))}
                {health.rateLimitStatus.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin datos de rate limiting</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks">
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {health.webhookFailures.map(wh => (
                  <div key={wh.id} className="p-3 border rounded-lg space-y-1 border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{wh.eventType}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {wh.failedAt ? formatDistanceToNow(new Date(wh.failedAt), { locale: es, addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-xs font-mono truncate">{wh.webhookUrl}</p>
                    <p className="text-xs text-red-600">{wh.errorMessage}</p>
                    <p className="text-xs text-muted-foreground">Reintentos: {wh.retryCount}</p>
                  </div>
                ))}
                {health.webhookFailures.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin webhooks fallidos en 24h</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <Gauge className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium mb-1">Reportes Ejecutivos</p>
                  <p className="text-sm">
                    <span className="text-yellow-600">{health.reportingStatus.pendingReports} pendientes</span>
                    {' · '}
                    <span className="text-red-600">{health.reportingStatus.failedReports} fallidos</span>
                  </p>
                </Card>
                <Card className="p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium mb-1">Board Packs</p>
                  <p className="text-sm">
                    <span className="text-yellow-600">{health.reportingStatus.pendingBoardPacks} pendientes</span>
                    {' · '}
                    <span className="text-red-600">{health.reportingStatus.failedBoardPacks} fallidos</span>
                  </p>
                </Card>
                <Card className="p-3 text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium mb-1">Regulatorio</p>
                  <p className="text-sm">
                    <span className="text-yellow-600">{health.reportingStatus.pendingRegulatory} pendientes</span>
                    {' · '}
                    <span className="text-red-600">{health.reportingStatus.failedRegulatory} fallidos</span>
                  </p>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Errors */}
          <TabsContent value="errors">
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {health.recentErrors.map(err => (
                  <div key={err.id} className="p-3 border rounded-lg border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="destructive" className="text-xs">{err.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {err.timestamp ? formatDistanceToNow(new Date(err.timestamp), { locale: es, addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-xs">{err.message}</p>
                  </div>
                ))}
                {health.recentErrors.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin errores en las últimas 24h</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HROperationalHealthPanel;
