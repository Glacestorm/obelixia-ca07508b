/**
 * SelfHealingTrend - Tendencia #3: Self-Healing Workflows
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Wrench, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  RotateCcw,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos de ejemplo de workflows auto-reparables
const DEMO_WORKFLOWS = [
  {
    id: 'wf-001',
    name: 'Sincronización ERP',
    status: 'healthy',
    autoHealEnabled: true,
    lastIncident: '3 días',
    uptime: 99.8,
    totalHeals: 12,
    avgHealTime: '45s',
    lastHeal: {
      issue: 'Timeout en conexión DB',
      action: 'Reconexión automática',
      time: '2024-01-28 14:32',
      success: true,
    },
  },
  {
    id: 'wf-002',
    name: 'Pipeline de Datos',
    status: 'healing',
    autoHealEnabled: true,
    lastIncident: 'Ahora',
    uptime: 98.5,
    totalHeals: 28,
    avgHealTime: '1m 12s',
    lastHeal: {
      issue: 'Memory overflow en transformación',
      action: 'Cache clear + restart worker',
      time: 'En progreso...',
      success: null,
    },
  },
  {
    id: 'wf-003',
    name: 'API Gateway',
    status: 'healthy',
    autoHealEnabled: true,
    lastIncident: '1 semana',
    uptime: 99.95,
    totalHeals: 5,
    avgHealTime: '23s',
    lastHeal: {
      issue: 'Rate limit exceeded',
      action: 'Circuit breaker activado',
      time: '2024-01-21 09:15',
      success: true,
    },
  },
  {
    id: 'wf-004',
    name: 'Batch Processing',
    status: 'degraded',
    autoHealEnabled: false,
    lastIncident: '2 horas',
    uptime: 94.2,
    totalHeals: 0,
    avgHealTime: 'N/A',
    lastHeal: null,
  },
];

const RECENT_REMEDIATIONS = [
  { id: 1, workflow: 'Sincronización ERP', issue: 'Connection timeout', action: 'Auto-reconnect', result: 'success', duration: '32s', time: '10:45' },
  { id: 2, workflow: 'Pipeline de Datos', issue: 'Memory spike', action: 'Garbage collection', result: 'in_progress', duration: '...', time: '10:48' },
  { id: 3, workflow: 'API Gateway', issue: 'High latency', action: 'Load balancer reset', result: 'success', duration: '18s', time: '09:22' },
  { id: 4, workflow: 'Sincronización ERP', issue: 'Schema mismatch', action: 'Schema sync', result: 'success', duration: '1m 5s', time: '08:15' },
  { id: 5, workflow: 'Pipeline de Datos', issue: 'Disk full', action: 'Auto-cleanup old logs', result: 'success', duration: '2m 30s', time: '07:00' },
];

const PREDICTION_ALERTS = [
  { id: 1, workflow: 'Batch Processing', prediction: 'Posible fallo en 4 horas', confidence: 87, recommendation: 'Aumentar recursos temporalmente' },
  { id: 2, workflow: 'Pipeline de Datos', prediction: 'Degradación gradual detectada', confidence: 72, recommendation: 'Revisar queries de transformación' },
];

export function SelfHealingTrend() {
  const [workflows, setWorkflows] = useState(DEMO_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState(DEMO_WORKFLOWS[0]);

  const handleToggleAutoHeal = (id: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, autoHealEnabled: !w.autoHealEnabled } : w
    ));
  };

  const healthyCount = workflows.filter(w => w.status === 'healthy').length;
  const avgUptime = (workflows.reduce((acc, w) => acc + w.uptime, 0) / workflows.length).toFixed(2);
  const totalHeals = workflows.reduce((acc, w) => acc + w.totalHeals, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'healing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'healing': return <Badge className="bg-blue-500">Healing</Badge>;
      case 'degraded': return <Badge variant="secondary" className="bg-amber-500 text-white">Degraded</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{healthyCount}/{workflows.length}</p>
            <p className="text-xs text-muted-foreground">Workflows Healthy</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{avgUptime}%</p>
            <p className="text-xs text-muted-foreground">Uptime Promedio</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Wrench className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{totalHeals}</p>
            <p className="text-xs text-muted-foreground">Auto-Reparaciones</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{PREDICTION_ALERTS.length}</p>
            <p className="text-xs text-muted-foreground">Predicciones Activas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Workflows Monitoreados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div 
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedWorkflow.id === workflow.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(workflow.status)}
                      <span className="font-medium text-sm">{workflow.name}</span>
                    </div>
                    {getStatusBadge(workflow.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uptime: {workflow.uptime}%</span>
                    <div className="flex items-center gap-2">
                      <span>Auto-Heal</span>
                      <Switch 
                        checked={workflow.autoHealEnabled}
                        onCheckedChange={() => handleToggleAutoHeal(workflow.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getStatusIcon(selectedWorkflow.status)}
                {selectedWorkflow.name}
              </CardTitle>
              {getStatusBadge(selectedWorkflow.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{selectedWorkflow.uptime}%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{selectedWorkflow.totalHeals}</p>
                <p className="text-xs text-muted-foreground">Reparaciones</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{selectedWorkflow.avgHealTime}</p>
                <p className="text-xs text-muted-foreground">Tiempo Medio</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{selectedWorkflow.lastIncident}</p>
                <p className="text-xs text-muted-foreground">Último Incidente</p>
              </div>
            </div>

            {/* Last Heal */}
            {selectedWorkflow.lastHeal && (
              <Card className={cn(
                "border-l-4",
                selectedWorkflow.lastHeal.success === true && "border-l-green-500",
                selectedWorkflow.lastHeal.success === null && "border-l-blue-500",
                selectedWorkflow.lastHeal.success === false && "border-l-red-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedWorkflow.lastHeal.time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Wrench className="h-4 w-4 text-blue-500" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedWorkflow.lastHeal.success === true && "bg-green-500/10",
                      selectedWorkflow.lastHeal.success === null && "bg-blue-500/10",
                      selectedWorkflow.lastHeal.success === false && "bg-red-500/10"
                    )}>
                      {selectedWorkflow.lastHeal.success === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {selectedWorkflow.lastHeal.success === null && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                      {selectedWorkflow.lastHeal.success === false && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Issue:</p>
                      <p className="font-medium">{selectedWorkflow.lastHeal.issue}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Action:</p>
                      <p className="font-medium">{selectedWorkflow.lastHeal.action}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button className="flex-1 gap-2">
                <PlayCircle className="h-4 w-4" />
                Forzar Diagnóstico
              </Button>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Rollback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions */}
      {PREDICTION_ALERTS.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <Shield className="h-5 w-5" />
              Predicciones de Fallos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PREDICTION_ALERTS.map((alert) => (
                <div key={alert.id} className="p-4 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{alert.workflow}</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      {alert.confidence}% confianza
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.prediction}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Recomendación: {alert.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Remediations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Remediaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {RECENT_REMEDIATIONS.map((rem) => (
                <div key={rem.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      rem.result === 'success' && "bg-green-500",
                      rem.result === 'in_progress' && "bg-blue-500 animate-pulse",
                      rem.result === 'failed' && "bg-red-500"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{rem.issue}</p>
                      <p className="text-xs text-muted-foreground">{rem.workflow} → {rem.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline">{rem.duration}</Badge>
                    <span className="text-muted-foreground">{rem.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default SelfHealingTrend;
