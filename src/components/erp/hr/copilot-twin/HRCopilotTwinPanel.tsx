/**
 * HRCopilotTwinPanel - Fase 8: Copilot IA + Digital Twin
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Bot, Activity, RefreshCw, Send, Sparkles,
  AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Layers, Play, BarChart3, Lightbulb, Shield, Zap,
  Clock, Target, Users, DollarSign
} from 'lucide-react';
import { useHRCopilotTwin } from '@/hooks/admin/hr/useHRCopilotTwin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRCopilotTwinPanelProps {
  companyId: string;
}

export function HRCopilotTwinPanel({ companyId }: HRCopilotTwinPanelProps) {
  const [activeTab, setActiveTab] = useState('copilot');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [simulationType, setSimulationType] = useState('workforce_change');
  const [simulationDesc, setSimulationDesc] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const {
    sessions, actions, snapshots, simulations, kpis,
    isLoading, chatResponse, twinAnalysis, proactiveInsights,
    fetchCopilotData, fetchTwinData, sendChat, analyzeTwin,
    simulateScenario, getProactiveInsights,
  } = useHRCopilotTwin(companyId);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    const response = await sendChat(userMsg);
    if (response) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    }
  }, [chatInput, sendChat]);

  const handleSimulate = useCallback(async () => {
    if (!simulationDesc.trim()) return;
    const result = await simulateScenario({
      simulation_type: simulationType,
      description: simulationDesc,
      snapshot: snapshots[0] || {},
    });
    if (result) setSimulationResult(result);
  }, [simulationType, simulationDesc, snapshots, simulateScenario]);

  const kpisByCategory = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.kpi_category]) acc[kpi.kpi_category] = [];
    acc[kpi.kpi_category].push(kpi);
    return acc;
  }, {} as Record<string, typeof kpis>);

  const categoryLabels: Record<string, string> = {
    efficiency: 'Eficiencia', accuracy: 'Precisión', adoption: 'Adopción',
    satisfaction: 'Satisfacción', autonomy: 'Autonomía'
  };

  const categoryIcons: Record<string, React.ElementType> = {
    efficiency: Zap, accuracy: Target, adoption: Users,
    satisfaction: CheckCircle, autonomy: Bot
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Copilot IA + Digital Twin</h2>
            <p className="text-sm text-muted-foreground">Asistente autónomo y gemelo digital de RRHH</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchCopilotData(); fetchTwinData(); }} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.slice(0, 4).map((kpi) => (
          <Card key={kpi.id} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground truncate">{kpi.kpi_name}</p>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-lg font-bold">{kpi.current_value}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</p>
              {kpi.target_value && (
                <Progress value={(kpi.current_value / kpi.target_value) * 100} className="h-1 mt-1" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="copilot" className="text-xs gap-1"><Bot className="h-3.5 w-3.5" /> Copilot</TabsTrigger>
          <TabsTrigger value="twin" className="text-xs gap-1"><Layers className="h-3.5 w-3.5" /> Digital Twin</TabsTrigger>
          <TabsTrigger value="simulation" className="text-xs gap-1"><Play className="h-3.5 w-3.5" /> Simulación</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs gap-1"><Lightbulb className="h-3.5 w-3.5" /> Insights</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> KPIs</TabsTrigger>
        </TabsList>

        {/* TAB: Copilot Chat */}
        <TabsContent value="copilot" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Copilot IA de RRHH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] mb-3 border rounded-lg p-3">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Bot className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">Hola, soy tu Copilot de RRHH. Pregúntame sobre empleados, nóminas, cumplimiento legal, o cualquier tema de gestión de personas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm animate-pulse">
                          Pensando...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendChat} disabled={isLoading || !chatInput.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Acciones Recientes del Copilot</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin acciones registradas</p>
                ) : (
                  <div className="space-y-2">
                    {actions.slice(0, 10).map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                          <Badge variant={action.status === 'executed' ? 'default' : action.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                            {action.action_type}
                          </Badge>
                          <span className="text-sm truncate max-w-[300px]">{action.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.confidence_score && (
                            <span className="text-xs text-muted-foreground">{action.confidence_score}%</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(action.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Digital Twin */}
        <TabsContent value="twin" className="space-y-4">
          {snapshots.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">No hay snapshots del Digital Twin</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {snapshots.map((snapshot) => (
                <Card key={snapshot.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-500" />
                        {snapshot.snapshot_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={snapshot.divergence_score < 5 ? 'default' : snapshot.divergence_score < 20 ? 'secondary' : 'destructive'}>
                          Divergencia: {snapshot.divergence_score}%
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => analyzeTwin(snapshot)} disabled={isLoading}>
                          <Brain className="h-3.5 w-3.5 mr-1" /> Analizar IA
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Workforce */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs font-medium">Workforce</span>
                        </div>
                        <p className="text-lg font-bold">{(snapshot.workforce_metrics as any)?.headcount || 0}</p>
                        <p className="text-xs text-muted-foreground">Rotación: {(snapshot.workforce_metrics as any)?.turnover_rate || 0}%</p>
                      </div>
                      {/* Payroll */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs font-medium">Coste Mensual</span>
                        </div>
                        <p className="text-lg font-bold">€{((snapshot.payroll_snapshot as any)?.total_monthly_cost / 1000)?.toFixed(0) || 0}k</p>
                        <p className="text-xs text-muted-foreground">Sal. medio: €{(snapshot.payroll_snapshot as any)?.avg_salary?.toLocaleString() || 0}</p>
                      </div>
                      {/* Compliance */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Shield className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium">Compliance</span>
                        </div>
                        <p className="text-lg font-bold">{(snapshot.compliance_status as any)?.gdpr_score || 0}%</p>
                        <p className="text-xs text-muted-foreground">PRL: {(snapshot.compliance_status as any)?.prl_score || 0}%</p>
                      </div>
                      {/* Wellness */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Activity className="h-3.5 w-3.5 text-rose-500" />
                          <span className="text-xs font-medium">Bienestar</span>
                        </div>
                        <p className="text-lg font-bold">eNPS {(snapshot.wellness_metrics as any)?.enps_score || 0}</p>
                        <p className="text-xs text-muted-foreground">Adopt.: {(snapshot.wellness_metrics as any)?.wellness_adoption || 0}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Última sincronización: {formatDistanceToNow(new Date(snapshot.last_sync_at), { locale: es, addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Twin Analysis Results */}
              {twinAnalysis && (
                <Card className="border-cyan-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-cyan-500" />
                      Análisis IA del Digital Twin
                      <Badge>{twinAnalysis.health_score || 0}/100</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {twinAnalysis.summary && (
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{twinAnalysis.summary}</p>
                    )}
                    {twinAnalysis.key_insights?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Insights Clave</h4>
                        <div className="space-y-1.5">
                          {twinAnalysis.key_insights.map((ins: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border">
                              <Badge variant={ins.impact === 'high' ? 'destructive' : ins.impact === 'medium' ? 'secondary' : 'outline'} className="text-xs">{ins.area}</Badge>
                              <span className="flex-1">{ins.insight}</span>
                              <Badge variant="outline" className="text-xs">{ins.trend}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {twinAnalysis.risk_areas?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Áreas de Riesgo</h4>
                        <div className="space-y-1.5">
                          {twinAnalysis.risk_areas.map((risk: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded border">
                              <AlertTriangle className={cn("h-4 w-4 mt-0.5", risk.risk_level === 'critical' ? 'text-red-500' : risk.risk_level === 'high' ? 'text-orange-500' : 'text-amber-500')} />
                              <div>
                                <p className="font-medium">{risk.area}</p>
                                <p className="text-muted-foreground text-xs">{risk.description}</p>
                                <p className="text-xs text-emerald-600 mt-0.5">↳ {risk.mitigation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB: Simulation */}
        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-indigo-500" />
                Simulador de Escenarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={simulationType} onValueChange={setSimulationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workforce_change">Cambio de Plantilla</SelectItem>
                  <SelectItem value="salary_adjustment">Ajuste Salarial</SelectItem>
                  <SelectItem value="policy_change">Cambio de Política</SelectItem>
                  <SelectItem value="restructuring">Reestructuración</SelectItem>
                  <SelectItem value="hiring_plan">Plan de Contratación</SelectItem>
                  <SelectItem value="attrition_scenario">Escenario de Rotación</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={simulationDesc}
                onChange={(e) => setSimulationDesc(e.target.value)}
                placeholder="Describe el escenario a simular... Ej: 'Incremento salarial del 5% para el departamento de IT con 3 nuevas contrataciones senior'"
                rows={3}
              />
              <Button onClick={handleSimulate} disabled={isLoading || !simulationDesc.trim()} className="w-full">
                <Play className="h-4 w-4 mr-1" /> Ejecutar Simulación
              </Button>
            </CardContent>
          </Card>

          {simulationResult && (
            <Card className="border-indigo-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Resultado de Simulación</CardTitle>
                  <Badge variant={simulationResult.recommendation === 'proceed' ? 'default' : simulationResult.recommendation === 'proceed_with_caution' ? 'secondary' : 'destructive'}>
                    {simulationResult.recommendation === 'proceed' ? '✅ Proceder' : simulationResult.recommendation === 'proceed_with_caution' ? '⚠️ Precaución' : '🛑 No recomendado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Resultado</p>
                    <Badge variant={simulationResult.simulation_result === 'favorable' ? 'default' : 'secondary'}>{simulationResult.simulation_result}</Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Riesgo</p>
                    <p className="text-lg font-bold">{simulationResult.risk_score || 0}%</p>
                  </div>
                </div>
                {simulationResult.summary && (
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{simulationResult.summary}</p>
                )}
                {simulationResult.financial_impact && (
                  <div className="p-3 rounded-lg border">
                    <h4 className="text-sm font-medium mb-1">Impacto Financiero</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Δ Mensual:</span> <span className="font-medium">{simulationResult.financial_impact.monthly_cost_delta}</span></div>
                      <div><span className="text-muted-foreground">Anual:</span> <span className="font-medium">{simulationResult.financial_impact.annual_projection}</span></div>
                      <div><span className="text-muted-foreground">ROI:</span> <span className="font-medium">{simulationResult.financial_impact.roi_timeline}</span></div>
                    </div>
                  </div>
                )}
                {simulationResult.implementation_plan?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Plan de Implementación</h4>
                    <div className="space-y-1">
                      {simulationResult.implementation_plan.map((step: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded border">
                          <Badge variant="outline" className="text-xs">{step.step}</Badge>
                          <span className="flex-1">{step.action}</span>
                          <span className="text-muted-foreground">{step.timeline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Proactive Insights */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={getProactiveInsights} disabled={isLoading} variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-1" /> Generar Insights Proactivos
            </Button>
          </div>

          {proactiveInsights ? (
            <div className="space-y-4">
              {proactiveInsights.summary && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">{proactiveInsights.summary}</p>
                  </CardContent>
                </Card>
              )}
              {proactiveInsights.critical_alerts?.length > 0 && (
                <Card className="border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Alertas Críticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {proactiveInsights.critical_alerts.map((alert: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{alert.title}</span>
                            <Badge variant="destructive" className="text-xs">{alert.urgency}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                          <p className="text-xs text-emerald-600 mt-1">→ {alert.suggested_action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {proactiveInsights.recommendations?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Lightbulb className="h-4 w-4 text-amber-500" /> Recomendaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {proactiveInsights.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{rec.category}</Badge>
                            <span className="text-sm font-medium flex-1">{rec.title}</span>
                            <Badge variant={rec.impact === 'high' ? 'default' : 'outline'} className="text-xs">{rec.impact}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                          {rec.auto_executable && <Badge variant="outline" className="text-xs mt-1">⚡ Auto-ejecutable</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {proactiveInsights.automation_suggestions?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Zap className="h-4 w-4 text-violet-500" /> Automatizaciones Sugeridas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {proactiveInsights.automation_suggestions.map((sug: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                          <span>{sug.task}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {sug.time_saved}
                            <Badge variant="outline" className="text-xs">{sug.confidence}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Genera insights proactivos basados en los datos actuales del Digital Twin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: KPIs */}
        <TabsContent value="kpis" className="space-y-4">
          {Object.entries(kpisByCategory).map(([category, categoryKpis]) => {
            const Icon = categoryIcons[category] || BarChart3;
            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {categoryLabels[category] || category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryKpis.map((kpi) => {
                      const progress = kpi.target_value ? (kpi.current_value / kpi.target_value) * 100 : 0;
                      const delta = kpi.previous_value ? kpi.current_value - kpi.previous_value : 0;
                      return (
                        <div key={kpi.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{kpi.kpi_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{kpi.current_value} {kpi.unit}</span>
                              {delta !== 0 && (
                                <span className={cn("text-xs", delta > 0 ? 'text-emerald-500' : 'text-red-500')}>
                                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          {kpi.target_value && (
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(progress, 100)} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRCopilotTwinPanel;
