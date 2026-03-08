import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  RefreshCw, Activity, AlertTriangle, CheckCircle2, XCircle,
  Zap, Shield, Clock, TrendingUp, TrendingDown, Minus,
  Wrench, RotateCcw, Play, Settings2, Heart
} from 'lucide-react';
import { useSelfHealing, type Incident, type RemediationDecision } from '@/hooks/admin/useSelfHealing';
import { type Installation } from '@/hooks/admin/useInstallationManager';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SelfHealingPanelProps {
  installation: Installation;
}

export function SelfHealingPanel({ installation }: SelfHealingPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [decision, setDecision] = useState<RemediationDecision | null>(null);
  const [thresholds, setThresholds] = useState({ critical: 20, warning: 50, degraded: 70 });

  const {
    isLoading, healthChecks, incidents, currentAnalysis, lastRefresh,
    analyzeHealth, detectDegradation, decideAction, executeRemediation,
    fetchHealthHistory, configureThresholds, startAutoMonitoring, stopAutoMonitoring,
  } = useSelfHealing();

  useEffect(() => {
    startAutoMonitoring(installation.id, 120000);
    return () => stopAutoMonitoring();
  }, [installation.id]);

  const healthScore = currentAnalysis?.health_score ?? (installation as any).health_score ?? 100;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 50) return 'from-amber-500 to-yellow-500';
    return 'from-red-500 to-rose-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Activity className="h-5 w-5 text-slate-400" />;
    }
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3 text-red-400" />;
      case 'falling': return <TrendingDown className="h-3 w-3 text-green-400" />;
      default: return <Minus className="h-3 w-3 text-slate-400" />;
    }
  };

  const handleDecideAction = async (incident: Incident) => {
    setSelectedIncident(incident);
    const result = await decideAction(incident.id);
    if (result) setDecision(result);
  };

  const handleExecuteRemediation = async () => {
    if (!selectedIncident || !decision) return;
    await executeRemediation(selectedIncident.id, decision.decision);
    setSelectedIncident(null);
    setDecision(null);
    fetchHealthHistory(installation.id);
  };

  const handleSaveThresholds = async () => {
    await configureThresholds(installation.id, thresholds);
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Health Score Hero */}
      <div className="flex items-center gap-6 p-4 rounded-xl border border-slate-700 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
        <div className="relative">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center border-4",
            healthScore >= 80 ? "border-green-500/50" : healthScore >= 50 ? "border-amber-500/50" : "border-red-500/50"
          )}>
            <div className="text-center">
              <span className={cn("text-3xl font-bold", getScoreColor(healthScore))}>{healthScore}</span>
              <p className="text-[10px] text-slate-400">/ 100</p>
            </div>
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center",
            healthScore >= 80 ? "bg-green-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500"
          )}>
            <Heart className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(currentAnalysis?.status || 'healthy')}
            <h3 className="font-semibold text-white capitalize">
              {currentAnalysis?.status || 'Analizando...'}
            </h3>
            <Badge className={cn(
              'text-[10px]',
              (installation as any).self_healing_enabled !== false
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-500/20 text-slate-400'
            )}>
              <Zap className="h-3 w-3 mr-1" />
              Self-Healing {(installation as any).self_healing_enabled !== false ? 'ON' : 'OFF'}
            </Badge>
          </div>
          <Progress
            value={healthScore}
            className="h-2 mb-2"
          />
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{incidents.filter(i => i.status === 'open').length} incidentes abiertos</span>
            <span>•</span>
            <span>{incidents.filter(i => i.auto_resolved).length} auto-resueltos</span>
            {lastRefresh && (
              <>
                <span>•</span>
                <span>Actualizado {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeHealth(installation.id)}
          disabled={isLoading}
          className="gap-1"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          Analizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="dashboard" className="text-xs gap-1"><Activity className="h-3 w-3" /> Dashboard</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> Incidentes
            {incidents.filter(i => i.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">
                {incidents.filter(i => i.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1"><Settings2 className="h-3 w-3" /> Umbrales</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <div className="space-y-4">
            {/* Trends */}
            {currentAnalysis?.trends && Object.keys(currentAnalysis.trends).length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(currentAnalysis.trends).map(([key, trend]) => (
                  <div key={key} className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {trendIcon(trend)}
                      <span className="text-[10px] uppercase text-slate-400">{key}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{trend}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Prediction */}
            {currentAnalysis?.prediction && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Predicción IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={cn(
                      'text-[10px]',
                      currentAnalysis.prediction.risk_level === 'low' ? 'bg-green-500/20 text-green-400' :
                      currentAnalysis.prediction.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      Riesgo: {currentAnalysis.prediction.risk_level}
                    </Badge>
                    {currentAnalysis.prediction.estimated_degradation_hours && (
                      <span className="text-xs text-slate-400">
                        Degradación estimada en {currentAnalysis.prediction.estimated_degradation_hours}h
                      </span>
                    )}
                  </div>
                  {currentAnalysis.prediction.preventive_actions?.length > 0 && (
                    <div className="space-y-1">
                      {currentAnalysis.prediction.preventive_actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          {action}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Issues */}
            {currentAnalysis?.issues && currentAnalysis.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-300">Problemas Detectados</h4>
                {currentAnalysis.issues.map((issue, i) => (
                  <div key={i} className={cn("p-3 rounded-lg border", severityColor(issue.severity))}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-medium">{issue.description}</span>
                    </div>
                    {issue.recommendation && (
                      <p className="text-[10px] opacity-80 ml-5">{issue.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recent Health Checks */}
            {healthChecks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-300">Últimas Métricas</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const latest = healthChecks[healthChecks.length - 1];
                    return [
                      { label: 'CPU', value: latest.cpu_usage, unit: '%' },
                      { label: 'Memoria', value: latest.memory_usage, unit: '%' },
                      { label: 'Disco', value: latest.disk_usage, unit: '%' },
                      { label: 'Latencia', value: latest.response_latency_ms, unit: 'ms' },
                      { label: 'Error Rate', value: latest.error_rate, unit: '%' },
                      { label: 'Conexiones', value: latest.active_connections, unit: '' },
                    ].map(m => (
                      <div key={m.label} className="p-2 rounded-lg border border-slate-700 bg-slate-800/50">
                        <span className="text-[10px] text-slate-400 uppercase">{m.label}</span>
                        <p className="text-sm font-medium text-white">{typeof m.value === 'number' ? m.value.toFixed(1) : m.value}{m.unit}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Incidents */}
        <TabsContent value="incidents">
          <ScrollArea className="h-[350px]">
            {selectedIncident && decision ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedIncident(null); setDecision(null); }}>
                  ← Volver
                </Button>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Decisión IA — {selectedIncident.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        'text-sm capitalize',
                        decision.decision === 'rollback' ? 'bg-amber-500/20 text-amber-400' :
                        decision.decision === 'restart' ? 'bg-blue-500/20 text-blue-400' :
                        decision.decision === 'hotfix' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-slate-500/20 text-slate-400'
                      )}>
                        {decision.decision === 'rollback' && <RotateCcw className="h-3 w-3 mr-1" />}
                        {decision.decision === 'restart' && <RefreshCw className="h-3 w-3 mr-1" />}
                        {decision.decision === 'hotfix' && <Wrench className="h-3 w-3 mr-1" />}
                        {decision.decision}
                      </Badge>
                      <span className="text-xs text-slate-400">Confianza: {decision.confidence}%</span>
                      <Badge variant="outline" className="text-[10px]">Riesgo: {decision.risk_level}</Badge>
                    </div>

                    <p className="text-xs text-slate-300">{decision.reasoning}</p>

                    {decision.steps?.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-[10px] uppercase text-slate-400">Pasos</h5>
                        {decision.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="text-primary font-mono">{i + 1}.</span>
                            {step}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {decision.requires_human_approval && (
                        <Badge variant="outline" className="text-[10px] text-amber-400">Requiere aprobación</Badge>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Downtime estimado: {decision.estimated_downtime_minutes} min
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={handleExecuteRemediation}
                        disabled={isLoading}
                      >
                        <Play className="h-3 w-3" /> Ejecutar {decision.decision}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedIncident(null); setDecision(null); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin incidentes registrados</p>
                  </div>
                ) : (
                  incidents.map(incident => (
                    <div key={incident.id} className={cn(
                      "p-3 rounded-lg border transition-colors",
                      incident.status === 'open' ? 'border-amber-500/30 bg-amber-500/5' :
                      incident.status === 'resolved' ? 'border-green-500/30 bg-green-500/5' :
                      'border-slate-700 bg-slate-800/30'
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-[10px]', severityColor(incident.severity))}>
                            {incident.severity}
                          </Badge>
                          <span className="text-xs font-medium text-white">{incident.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {incident.auto_resolved && (
                            <Badge className="text-[10px] bg-green-500/20 text-green-400">
                              <Zap className="h-3 w-3 mr-1" />Auto
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{incident.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(incident.detected_at), { locale: es, addSuffix: true })}
                          {incident.resolution_type && (
                            <Badge variant="outline" className="text-[10px] capitalize">{incident.resolution_type}</Badge>
                          )}
                        </div>
                        {incident.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 h-7"
                            onClick={() => handleDecideAction(incident)}
                            disabled={isLoading}
                          >
                            <Wrench className="h-3 w-3" /> Diagnosticar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Config */}
        <TabsContent value="config">
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Políticas de Auto-Reparación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-white">Self-Healing Activo</Label>
                    <p className="text-[10px] text-slate-400">Permite remediación automática sin intervención</p>
                  </div>
                  <Switch defaultChecked={(installation as any).self_healing_enabled !== false} />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-700">
                  <h4 className="text-xs font-medium text-slate-300">Umbrales de Salud (Health Score)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-red-400">Crítico (auto-rollback)</Label>
                      <Input
                        type="number"
                        value={thresholds.critical}
                        onChange={e => setThresholds(t => ({ ...t, critical: Number(e.target.value) }))}
                        className="bg-slate-900 border-slate-600 text-white h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-amber-400">Warning (alerta)</Label>
                      <Input
                        type="number"
                        value={thresholds.warning}
                        onChange={e => setThresholds(t => ({ ...t, warning: Number(e.target.value) }))}
                        className="bg-slate-900 border-slate-600 text-white h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-yellow-400">Degradado (monitoreo)</Label>
                      <Input
                        type="number"
                        value={thresholds.degraded}
                        onChange={e => setThresholds(t => ({ ...t, degraded: Number(e.target.value) }))}
                        className="bg-slate-900 border-slate-600 text-white h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSaveThresholds} disabled={isLoading} className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Guardar Umbrales
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones Manuales</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => detectDegradation(installation.id)}
                  disabled={isLoading}
                >
                  <TrendingDown className="h-3 w-3" /> Detectar Degradación
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => analyzeHealth(installation.id)}
                  disabled={isLoading}
                >
                  <Activity className="h-3 w-3" /> Forzar Análisis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SelfHealingPanel;
