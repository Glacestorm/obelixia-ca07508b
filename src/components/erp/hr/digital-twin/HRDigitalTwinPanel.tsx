/**
 * HRDigitalTwinPanel - P5: Organizational Digital Twin Completo
 * 5 tabs: Resumen, Instancias Twin, Módulos, Experimentos, IA Analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw, Sparkles, Activity, AlertTriangle, CheckCircle, 
  Layers, Cpu, Beaker, Bell, Zap, ArrowUpDown, Shield,
  Clock, TrendingUp, TrendingDown, Circle
} from 'lucide-react';
import { useHRDigitalTwin } from '@/hooks/admin/hr/useHRDigitalTwin';
import type { TwinInstance, TwinExperiment, TwinAlert } from '@/hooks/admin/hr/useHRDigitalTwin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    active: { variant: 'default', label: 'Activo' },
    syncing: { variant: 'secondary', label: 'Sincronizando' },
    paused: { variant: 'outline', label: 'Pausado' },
    archived: { variant: 'secondary', label: 'Archivado' },
    error: { variant: 'destructive', label: 'Error' },
    synced: { variant: 'default', label: 'Sincronizado' },
    diverged: { variant: 'destructive', label: 'Divergente' },
    pending: { variant: 'outline', label: 'Pendiente' },
    draft: { variant: 'outline', label: 'Borrador' },
    running: { variant: 'secondary', label: 'Ejecutando' },
    completed: { variant: 'default', label: 'Completado' },
    failed: { variant: 'destructive', label: 'Fallido' },
    cancelled: { variant: 'outline', label: 'Cancelado' },
  };
  const s = map[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>;
}

function HealthGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? 'text-green-500' : score >= 70 ? 'text-yellow-500' : 'text-red-500';
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold", color)}>{score}%</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function HRDigitalTwinPanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTwin, setSelectedTwin] = useState<string | null>(null);

  const {
    twins, modules, experiments, alerts, loading, stats,
    analysisResult, analyzing, fetchTwins, syncTwin, runExperiment,
    resolveAlert, runAIAnalysis
  } = useHRDigitalTwin();

  useEffect(() => { fetchTwins(companyId); }, [companyId, fetchTwins]);

  useEffect(() => {
    if (twins.length > 0 && !selectedTwin) setSelectedTwin(twins[0].id);
  }, [twins, selectedTwin]);

  const selectedTwinData = twins.find(t => t.id === selectedTwin);
  const twinModules = modules.filter(m => m.twin_id === selectedTwin);
  const twinExperiments = experiments.filter(e => e.twin_id === selectedTwin);
  const twinAlerts = alerts.filter(a => a.twin_id === selectedTwin);
  const unresolvedAlerts = twinAlerts.filter(a => !a.is_resolved);

  const handleSync = useCallback(async () => {
    if (selectedTwin) {
      await syncTwin(selectedTwin);
      fetchTwins(companyId);
    }
  }, [selectedTwin, syncTwin, fetchTwins, companyId]);

  const handleRunExperiment = useCallback(async () => {
    if (!selectedTwin) return;
    await runExperiment(selectedTwin, {
      experiment_name: 'Quick What-If Analysis',
      description: 'Análisis rápido de impacto organizacional',
      experiment_type: 'what_if',
      parameters: { scope: 'full_organization', analysis_depth: 'standard' },
    });
    fetchTwins(companyId);
  }, [selectedTwin, runExperiment, fetchTwins, companyId]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Digital Twin Organizacional</CardTitle>
              <p className="text-xs text-muted-foreground">Réplica virtual completa · Simulación y diagnóstico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchTwins(companyId)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Refresh
            </Button>
            {selectedTwin && (
              <Button size="sm" onClick={handleSync} disabled={loading} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                <ArrowUpDown className="h-4 w-4 mr-1" /> Sync Twin
              </Button>
            )}
          </div>
        </div>

        {/* Twin selector */}
        {twins.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {twins.map(t => (
              <Button
                key={t.id}
                variant={selectedTwin === t.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTwin(t.id)}
                className="text-xs"
              >
                <Circle className={cn("h-2 w-2 mr-1.5 fill-current", t.status === 'active' ? 'text-green-500' : t.status === 'paused' ? 'text-yellow-500' : 'text-muted-foreground')} />
                {t.twin_name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="modules" className="text-xs">Módulos</TabsTrigger>
            <TabsTrigger value="experiments" className="text-xs flex items-center gap-1">
              Experimentos
              {twinExperiments.filter(e => e.status === 'running').length > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 text-[10px] p-0 justify-center">{twinExperiments.filter(e => e.status === 'running').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs flex items-center gap-1">
              Alertas
              {unresolvedAlerts.length > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 justify-center">{unresolvedAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="text-xs">IA Analysis</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardContent className="p-3 text-center">
                  <Layers className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
                  <div className="text-2xl font-bold">{stats.activeTwins}/{stats.totalTwins}</div>
                  <p className="text-xs text-muted-foreground">Twins Activos</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-3 text-center">
                  <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <div className="text-2xl font-bold">{stats.avgHealth}%</div>
                  <p className="text-xs text-muted-foreground">Salud Media</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="p-3 text-center">
                  <Beaker className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <div className="text-2xl font-bold">{stats.totalExperiments}</div>
                  <p className="text-xs text-muted-foreground">Experimentos</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="p-3 text-center">
                  <Bell className="h-5 w-5 mx-auto mb-1 text-red-500" />
                  <div className="text-2xl font-bold">{stats.activeAlerts}</div>
                  <p className="text-xs text-muted-foreground">Alertas Activas</p>
                </CardContent>
              </Card>
            </div>

            {/* Selected twin details */}
            {selectedTwinData && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedTwinData.twin_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTwinData.description}</p>
                    </div>
                    <StatusBadge status={selectedTwinData.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <HealthGauge score={Number(selectedTwinData.health_score)} label="Salud" />
                    <div className="text-center">
                      <div className={cn("text-2xl font-bold", Number(selectedTwinData.divergence_score) <= 5 ? 'text-green-500' : Number(selectedTwinData.divergence_score) <= 15 ? 'text-yellow-500' : 'text-red-500')}>
                        {Number(selectedTwinData.divergence_score)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Divergencia</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{twinModules.length}</div>
                      <p className="text-xs text-muted-foreground">Módulos</p>
                    </div>
                  </div>

                  {selectedTwinData.last_sync_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Última sincronización: {formatDistanceToNow(new Date(selectedTwinData.last_sync_at), { locale: es, addSuffix: true })}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tipo:</span>
                    <Badge variant="outline" className="text-xs">{selectedTwinData.source_type}</Badge>
                    <span className="text-xs text-muted-foreground ml-2">Sync cada</span>
                    <Badge variant="outline" className="text-xs">{selectedTwinData.sync_frequency_minutes} min</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MODULES */}
          <TabsContent value="modules" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {twinModules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Selecciona un twin para ver sus módulos</p>
                ) : twinModules.map(mod => (
                  <Card key={mod.id} className={cn("transition-colors", mod.status === 'diverged' && "border-amber-500/40 bg-amber-500/5")}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{mod.module_name}</span>
                          <Badge variant="outline" className="text-[10px]">{mod.module_key}</Badge>
                        </div>
                        <StatusBadge status={mod.status} />
                      </div>
                      {mod.metrics && Object.keys(mod.metrics).length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {Object.entries(mod.metrics).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="text-center bg-muted/50 rounded p-1.5">
                              <div className="text-sm font-semibold">{typeof v === 'number' ? v.toLocaleString() : String(v)}</div>
                              <p className="text-[10px] text-muted-foreground truncate">{k.replace(/_/g, ' ')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {mod.status === 'diverged' && mod.divergence_details && (mod.divergence_details as any[]).length > 0 && (
                        <div className="mt-2 p-2 bg-amber-500/10 rounded text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {(mod.divergence_details as any[]).length} divergencias detectadas
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* EXPERIMENTS */}
          <TabsContent value="experiments" className="space-y-3 mt-0">
            <Button size="sm" onClick={handleRunExperiment} disabled={!selectedTwin || loading}>
              <Beaker className="h-4 w-4 mr-1" /> Nuevo Experimento What-If
            </Button>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {twinExperiments.map(exp => (
                  <Card key={exp.id} className={cn(exp.status === 'running' && "border-blue-500/40 animate-pulse")}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{exp.experiment_name}</h4>
                          {exp.description && <p className="text-xs text-muted-foreground">{exp.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{exp.experiment_type}</Badge>
                          <StatusBadge status={exp.status} />
                        </div>
                      </div>

                      {exp.risk_score != null && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Riesgo</span>
                              <span className={cn(exp.risk_score <= 30 ? 'text-green-500' : exp.risk_score <= 60 ? 'text-yellow-500' : 'text-red-500')}>
                                {exp.risk_score}%
                              </span>
                            </div>
                            <Progress value={exp.risk_score} className="h-1.5" />
                          </div>
                          {exp.recommendation && (
                            <Badge variant={exp.recommendation === 'proceed' ? 'default' : exp.recommendation === 'caution' ? 'secondary' : 'destructive'} className="text-xs">
                              {exp.recommendation === 'proceed' ? '✅ Proceder' : exp.recommendation === 'caution' ? '⚠️ Precaución' : '🛑 Abortar'}
                            </Badge>
                          )}
                        </div>
                      )}

                      {exp.impact_analysis && Object.keys(exp.impact_analysis).length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {Object.entries(exp.impact_analysis).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="bg-muted/50 rounded p-1.5 text-center">
                              <div className="text-xs font-semibold">
                                {typeof v === 'number' ? (v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString()) : String(v)}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{k.replace(/_/g, ' ')}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {exp.completed_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Completado {formatDistanceToNow(new Date(exp.completed_at), { locale: es, addSuffix: true })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {twinExperiments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin experimentos aún</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ALERTS */}
          <TabsContent value="alerts" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {twinAlerts.map(alert => (
                  <Card key={alert.id} className={cn(
                    !alert.is_resolved && alert.severity === 'critical' && "border-red-500/40 bg-red-500/5",
                    !alert.is_resolved && alert.severity === 'warning' && "border-amber-500/40 bg-amber-500/5",
                    alert.is_resolved && "opacity-60"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {alert.severity === 'critical' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : alert.severity === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Activity className="h-4 w-4 text-blue-500" />
                          )}
                          <div>
                            <h4 className="text-sm font-medium">{alert.title}</h4>
                            {alert.description && <p className="text-xs text-muted-foreground">{alert.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{alert.alert_type}</Badge>
                          {!alert.is_resolved && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resolveAlert(alert.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                            </Button>
                          )}
                          {alert.is_resolved && <Badge variant="secondary" className="text-[10px]">Resuelto</Badge>}
                        </div>
                      </div>
                      {alert.threshold_value != null && alert.actual_value != null && (
                        <div className="flex gap-4 mt-2 text-xs">
                          <span>Umbral: <strong>{alert.threshold_value}</strong></span>
                          <span>Actual: <strong className={Number(alert.actual_value) > Number(alert.threshold_value) ? 'text-red-500' : 'text-green-500'}>{alert.actual_value}</strong></span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {twinAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin alertas</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI ANALYSIS */}
          <TabsContent value="ai-analysis" className="space-y-3 mt-0">
            <Button
              onClick={() => selectedTwin && runAIAnalysis(selectedTwin)}
              disabled={analyzing || !selectedTwin}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
            >
              <Sparkles className={cn("h-4 w-4 mr-1", analyzing && "animate-spin")} />
              {analyzing ? 'Analizando Twin...' : 'Análisis IA del Twin'}
            </Button>

            {analysisResult && (
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {analysisResult.overall_assessment && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-1 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Evaluación General</h4>
                        <p className="text-sm">{analysisResult.overall_assessment}</p>
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.health_insights && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-2">🏥 Health Insights</h4>
                        {Array.isArray(analysisResult.health_insights) ? (
                          <div className="space-y-1">
                            {analysisResult.health_insights.map((i: any, idx: number) => (
                              <div key={idx} className="text-sm flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{typeof i === 'string' ? i : i.detail || JSON.stringify(i)}</span>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm">{JSON.stringify(analysisResult.health_insights)}</p>}
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.divergence_analysis && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-2">📊 Análisis de Divergencia</h4>
                        <p className="text-sm">{typeof analysisResult.divergence_analysis === 'string' ? analysisResult.divergence_analysis : JSON.stringify(analysisResult.divergence_analysis)}</p>
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.recommendations && Array.isArray(analysisResult.recommendations) && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-2">💡 Recomendaciones</h4>
                        <div className="space-y-1">
                          {analysisResult.recommendations.map((r: any, idx: number) => (
                            <div key={idx} className="text-sm flex items-start gap-2">
                              <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{idx + 1}</Badge>
                              <span>{typeof r === 'string' ? r : r.title || r.recommendation || JSON.stringify(r)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.experiment_suggestions && Array.isArray(analysisResult.experiment_suggestions) && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-2">🧪 Experimentos Sugeridos</h4>
                        <div className="space-y-1">
                          {analysisResult.experiment_suggestions.map((s: any, idx: number) => (
                            <div key={idx} className="text-sm bg-muted/50 rounded p-2">
                              {typeof s === 'string' ? s : s.name || s.title || JSON.stringify(s)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}

            {!analysisResult && !analyzing && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Ejecuta un análisis IA para obtener insights sobre tu Digital Twin</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRDigitalTwinPanel;
