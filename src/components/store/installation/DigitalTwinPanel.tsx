import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw, Sparkles, Copy, Activity, AlertTriangle, CheckCircle, Play,
  Clock, Cpu, HardDrive, Wifi, WifiOff, ArrowRightLeft, Stethoscope,
  FlaskConical, History, TrendingUp, Shield, Zap
} from 'lucide-react';
import { useDigitalTwin } from '@/hooks/admin/useDigitalTwin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DigitalTwinPanelProps {
  installationId: string;
  installationData?: Record<string, unknown>;
}

export function DigitalTwinPanel({ installationId, installationData }: DigitalTwinPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [simName, setSimName] = useState('');
  const [simType, setSimType] = useState('update_test');
  const [diagnosticResult, setDiagnosticResult] = useState<Record<string, unknown> | null>(null);
  const [compareResult, setCompareResult] = useState<Record<string, unknown> | null>(null);

  const {
    twin, snapshots, simulations,
    isLoading, isSimulating, isSyncing,
    createTwin, syncTwin, simulateUpdate, runDiagnostic, compareStates,
  } = useDigitalTwin(installationId);

  const handleCreateTwin = useCallback(() => {
    createTwin(installationData || { installation_id: installationId });
  }, [createTwin, installationData, installationId]);

  const handleSimulate = useCallback(async () => {
    if (!simName.trim()) return;
    await simulateUpdate(simName, simType, { simulation_name: simName, type: simType });
    setSimName('');
  }, [simName, simType, simulateUpdate]);

  const handleDiagnostic = useCallback(async () => {
    const result = await runDiagnostic();
    if (result) setDiagnosticResult(result);
  }, [runDiagnostic]);

  const handleCompare = useCallback(async () => {
    const result = await compareStates();
    if (result) setCompareResult(result);
  }, [compareStates]);

  const metrics = (twin?.snapshot_metrics || {}) as Record<string, number>;
  const divergence = twin?.divergence_score ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-emerald-500/20 text-emerald-400';
      case 'syncing': return 'bg-blue-500/20 text-blue-400';
      case 'simulating': return 'bg-amber-500/20 text-amber-400';
      case 'error': return 'bg-destructive/20 text-destructive';
      case 'outdated': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getResultBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-emerald-500/20 text-emerald-400 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Éxito</Badge>;
      case 'failed': return <Badge className="bg-destructive/20 text-destructive text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Falló</Badge>;
      case 'warning': return <Badge className="bg-amber-500/20 text-amber-400 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Advertencia</Badge>;
      case 'running': return <Badge className="bg-blue-500/20 text-blue-400 text-xs"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Ejecutando</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground text-xs"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  // No twin created yet
  if (!twin && !isLoading) {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900/50">
        <CardContent className="py-12 text-center">
          <Copy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin Digital Twin</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Crea una réplica virtual de esta instalación para diagnóstico remoto,
            testing de updates y soporte técnico sin acceso directo.
          </p>
          <Button onClick={handleCreateTwin} disabled={isLoading} className="gap-2">
            <Sparkles className="h-4 w-4" /> Crear Digital Twin
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !twin) {
    return (
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando Digital Twin...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-slate-700 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Copy className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">{twin?.twin_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-xs", getStatusColor(twin?.status || 'idle'))}>
                    {twin?.status === 'idle' ? 'Listo' : twin?.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {twin?.last_sync_at
                      ? `Sync ${formatDistanceToNow(new Date(twin.last_sync_at), { locale: es, addSuffix: true })}`
                      : 'Sin sincronizar'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => syncTwin()} disabled={isSyncing} className="gap-1 text-xs">
                <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                Sync
              </Button>
              <Button variant="outline" size="sm" onClick={handleCompare} disabled={isLoading} className="gap-1 text-xs">
                <ArrowRightLeft className="h-3 w-3" /> Comparar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDiagnostic} disabled={isSimulating} className="gap-1 text-xs">
                <Stethoscope className="h-3 w-3" /> Diagnosticar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {/* Quick metrics */}
          <div className="grid grid-cols-5 gap-3">
            <MetricCard icon={Cpu} label="CPU" value={metrics.cpu_usage} unit="%" color="text-blue-400" />
            <MetricCard icon={HardDrive} label="RAM" value={metrics.memory_usage} unit="%" color="text-purple-400" />
            <MetricCard icon={HardDrive} label="Disco" value={metrics.disk_usage} unit="%" color="text-cyan-400" />
            <MetricCard icon={Zap} label="Latencia" value={metrics.response_time_ms} unit="ms" color="text-amber-400" />
            <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60">
              <div className="flex items-center gap-1 mb-1">
                {divergence < 20 ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-orange-400" />}
                <span className="text-[10px] text-muted-foreground">Divergencia</span>
              </div>
              <div className={cn("text-lg font-bold", divergence < 20 ? "text-emerald-400" : divergence < 50 ? "text-amber-400" : "text-destructive")}>
                {divergence}%
              </div>
              <Progress value={100 - divergence} className="h-1 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/60">
          <TabsTrigger value="overview" className="text-xs gap-1"><Activity className="h-3 w-3" /> Estado</TabsTrigger>
          <TabsTrigger value="simulate" className="text-xs gap-1"><FlaskConical className="h-3 w-3" /> Simular</TabsTrigger>
          <TabsTrigger value="snapshots" className="text-xs gap-1"><History className="h-3 w-3" /> Snapshots</TabsTrigger>
          <TabsTrigger value="diagnostic" className="text-xs gap-1"><Stethoscope className="h-3 w-3" /> Diagnóstico</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-3">
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {compareResult && (
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-indigo-400" /> Comparación Twin ↔ Producción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-foreground">{(compareResult as any).overall_match_percentage ?? '—'}%</span>
                      <span className="text-xs text-muted-foreground">coincidencia</span>
                      <Badge className="ml-auto text-xs bg-primary/20 text-primary">
                        {(compareResult as any).sync_recommendation === 'no_action' ? 'Sin acción' :
                         (compareResult as any).sync_recommendation === 'partial_sync' ? 'Sync parcial' : 'Sync completo'}
                      </Badge>
                    </div>
                    {((compareResult as any).critical_divergences || []).map((d: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs mb-2">
                        <span className="font-medium text-destructive">{d.area}:</span>{' '}
                        <span className="text-muted-foreground">{d.description}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">{(compareResult as any).summary}</p>
                  </CardContent>
                </Card>
              )}
              {/* Recent simulations */}
              <h4 className="text-sm font-medium text-muted-foreground">Simulaciones recientes</h4>
              {simulations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin simulaciones aún</p>
              ) : simulations.slice(0, 5).map(sim => (
                <Card key={sim.id} className="border-slate-700 bg-slate-800/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{sim.simulation_name}</span>
                      {getResultBadge(sim.result_status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{sim.simulation_type}</span>
                      {sim.risk_score != null && (
                        <span className={cn(sim.risk_score > 60 ? "text-destructive" : sim.risk_score > 30 ? "text-amber-400" : "text-emerald-400")}>
                          Riesgo: {sim.risk_score}%
                        </span>
                      )}
                      {sim.duration_ms && <span>{sim.duration_ms}ms</span>}
                      <span className="ml-auto">{formatDistanceToNow(new Date(sim.created_at), { locale: es, addSuffix: true })}</span>
                    </div>
                    {sim.ai_recommendation && (
                      <div className="mt-2 p-2 rounded bg-primary/10 text-xs text-primary">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        Recomendación: {sim.ai_recommendation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Simulate */}
        <TabsContent value="simulate" className="mt-3">
          <Card className="border-slate-700 bg-slate-800/50 mb-4">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-400" /> Nueva Simulación
              </h4>
              <Input
                placeholder="Nombre de simulación (ej: Update v2.5.0)"
                value={simName}
                onChange={e => setSimName(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
              <Select value={simType} onValueChange={setSimType}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update_test">🔄 Test de Update</SelectItem>
                  <SelectItem value="stress_test">💪 Stress Test</SelectItem>
                  <SelectItem value="rollback_test">⏪ Test de Rollback</SelectItem>
                  <SelectItem value="module_install">📦 Instalación de Módulo</SelectItem>
                  <SelectItem value="config_change">⚙️ Cambio de Config</SelectItem>
                  <SelectItem value="diagnostic">🔍 Diagnóstico</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSimulate} disabled={isSimulating || !simName.trim()} className="w-full gap-2">
                {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isSimulating ? 'Simulando...' : 'Ejecutar Simulación'}
              </Button>
            </CardContent>
          </Card>
          <ScrollArea className="h-[260px]">
            <div className="space-y-2">
              {simulations.map(sim => (
                <Card key={sim.id} className="border-slate-700 bg-slate-800/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{sim.simulation_name}</span>
                      {getResultBadge(sim.result_status)}
                    </div>
                    {sim.ai_analysis && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sim.ai_analysis}</p>
                    )}
                    {(sim.risk_factors as any[])?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(sim.risk_factors as any[]).slice(0, 3).map((rf: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className={cn("text-[10px]",
                              rf.severity === 'critical' ? 'border-destructive text-destructive' :
                              rf.severity === 'high' ? 'border-orange-400 text-orange-400' :
                              'border-amber-400 text-amber-400'
                            )}>{rf.severity}</Badge>
                            <span className="text-muted-foreground">{rf.factor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Snapshots */}
        <TabsContent value="snapshots" className="mt-3">
          <ScrollArea className="h-[380px]">
            {snapshots.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin snapshots. Sincroniza el twin para crear uno.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap, idx) => (
                  <Card key={snap.id} className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{snap.snapshot_type}</Badge>
                          {idx === 0 && <Badge className="bg-primary/20 text-primary text-[10px]">Último</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(snap.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {snap.health_score != null && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Salud: </span>
                            <span className={cn("font-medium",
                              snap.health_score >= 80 ? "text-emerald-400" : snap.health_score >= 50 ? "text-amber-400" : "text-destructive"
                            )}>{snap.health_score}</span>
                          </div>
                        )}
                        <div className="text-xs">
                          <span className="text-muted-foreground">Módulos: </span>
                          <span className="text-foreground font-medium">{(snap.modules_snapshot as any[])?.length || 0}</span>
                        </div>
                      </div>
                      {snap.notes && <p className="text-xs text-muted-foreground mt-1">{snap.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Diagnostic */}
        <TabsContent value="diagnostic" className="mt-3">
          {!diagnosticResult ? (
            <Card className="border-dashed border-slate-700 bg-slate-800/30">
              <CardContent className="py-10 text-center">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ejecuta un diagnóstico remoto completo a través del Digital Twin
                </p>
                <Button onClick={handleDiagnostic} disabled={isSimulating} className="gap-2">
                  {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                  Iniciar Diagnóstico
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[380px]">
              <div className="space-y-3">
                {/* Overall health */}
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("text-3xl font-bold",
                        (diagnosticResult as any).overall_health >= 80 ? "text-emerald-400" :
                        (diagnosticResult as any).overall_health >= 50 ? "text-amber-400" : "text-destructive"
                      )}>
                        {(diagnosticResult as any).overall_health ?? '—'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">Salud General</div>
                        <div className="text-xs text-muted-foreground">{(diagnosticResult as any).summary}</div>
                      </div>
                    </div>
                    <Progress value={(diagnosticResult as any).overall_health ?? 0} className="h-2" />
                  </CardContent>
                </Card>

                {/* Diagnostics */}
                {((diagnosticResult as any).diagnostics || []).map((d: any, i: number) => (
                  <div key={i} className={cn("p-3 rounded-lg border text-xs",
                    d.status === 'critical' ? 'border-destructive/30 bg-destructive/10' :
                    d.status === 'warning' ? 'border-amber-500/30 bg-amber-500/10' :
                    'border-emerald-500/30 bg-emerald-500/10'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      {d.status === 'critical' ? <AlertTriangle className="h-3 w-3 text-destructive" /> :
                       d.status === 'warning' ? <AlertTriangle className="h-3 w-3 text-amber-400" /> :
                       <CheckCircle className="h-3 w-3 text-emerald-400" />}
                      <span className="font-medium text-foreground capitalize">{d.category}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{d.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{d.detail}</p>
                    {d.recommendation && <p className="text-primary mt-1">→ {d.recommendation}</p>}
                  </div>
                ))}

                {/* Security */}
                {(diagnosticResult as any).security_scan && (
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Seguridad</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Vulnerabilidades:</span> <span className="text-foreground font-medium">{(diagnosticResult as any).security_scan.vulnerabilities}</span></div>
                        <div><span className="text-muted-foreground">Patches:</span> <span className="text-foreground font-medium">{(diagnosticResult as any).security_scan.patches_pending}</span></div>
                        <div><span className="text-muted-foreground">Compliance:</span> <span className="text-foreground font-medium">{(diagnosticResult as any).security_scan.compliance_score}%</span></div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Optimizations */}
                {((diagnosticResult as any).optimization_opportunities || []).length > 0 && (
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-3">
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" /> Oportunidades
                      </h4>
                      {((diagnosticResult as any).optimization_opportunities || []).map((o: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-700 last:border-0 text-xs">
                          <Badge variant="outline" className={cn("text-[10px]",
                            o.impact === 'high' ? 'text-emerald-400' : o.impact === 'medium' ? 'text-amber-400' : 'text-muted-foreground'
                          )}>{o.impact}</Badge>
                          <span className="text-foreground">{o.title}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color }: { icon: any; label: string; value?: number; unit: string; color: string }) {
  return (
    <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60">
      <div className="flex items-center gap-1 mb-1">
        <Icon className={cn("h-3 w-3", color)} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground">{value ?? '—'}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span></div>
    </div>
  );
}

export default DigitalTwinPanel;
