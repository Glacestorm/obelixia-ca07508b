/**
 * HRWorkforcePlanningPanel - Workforce Planning & Scenario Studio
 * Phase P3: Strategic planning, headcount modeling, what-if scenarios, AI analysis
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, Users, Target, Sparkles, RefreshCw, Play, BarChart3,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Brain, Layers,
  Maximize2, Minimize2, ChevronRight
} from 'lucide-react';
import { useHRWorkforcePlanning } from '@/hooks/admin/hr/useHRWorkforcePlanning';
import type { Scenario, HeadcountModel, SkillGapForecast } from '@/hooks/admin/hr/useHRWorkforcePlanning';
import { DataSourceBadge, resolveDataSource } from '@/components/erp/hr/shared/DataSourceBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

export function HRWorkforcePlanningPanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    plans, scenarios, selectedPlan, stats,
    loading, aiLoading, aiResult,
    fetchPlanDetail, fetchStats,
    simulateScenario, runWorkforceAnalysis, runSkillGapStrategy,
    setSelectedPlan, setAiResult,
  } = useHRWorkforcePlanning(companyId);

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const priorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      critical: 'destructive', high: 'default', medium: 'secondary', low: 'outline'
    };
    return <Badge variant={variants[priority] || 'outline'} className="text-xs">{priority}</Badge>;
  };

  const scenarioIcon = (type: string) => {
    switch (type) {
      case 'growth': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'contraction': return <ArrowDownRight className="h-4 w-4 text-destructive" />;
      case 'restructuring': return <Layers className="h-4 w-4 text-blue-500" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className={cn("transition-all duration-300 overflow-hidden", isExpanded && "fixed inset-4 z-50 shadow-2xl")}>
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Workforce Planning & Scenario Studio</CardTitle>
              <p className="text-xs text-muted-foreground">
                Planificación estratégica de plantilla con simulación IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => fetchStats()} disabled={loading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded && "h-[calc(100%-80px)]")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs">Planes</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Escenarios</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs">Skills Gap</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
          </TabsList>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              {stats ? (
                <div className="space-y-4">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Planes Activos</p>
                      <p className="text-2xl font-bold">{stats.active_plans}</p>
                      <p className="text-xs text-muted-foreground">de {stats.total_plans} totales</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Headcount Gap</p>
                      <p className={cn("text-2xl font-bold", stats.headcount_gap > 0 ? "text-orange-500" : "text-green-500")}>
                        {stats.headcount_gap > 0 ? '+' : ''}{stats.headcount_gap}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats.current_headcount} → {stats.projected_headcount}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Contrataciones Críticas</p>
                      <p className="text-2xl font-bold text-destructive">{stats.critical_hires}</p>
                      <p className="text-xs text-muted-foreground">posiciones urgentes</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Skills Críticos</p>
                      <p className="text-2xl font-bold text-orange-500">{stats.critical_skill_gaps}</p>
                      <p className="text-xs text-muted-foreground">brechas identificadas</p>
                    </Card>
                  </div>

                  {/* Scenarios Summary */}
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Escenarios ({stats.total_scenarios})
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Alto riesgo: <span className="font-bold text-destructive">{stats.high_risk_scenarios}</span></span>
                      <span>Presupuesto total: <span className="font-bold">€{(stats.total_budget / 1000000).toFixed(1)}M</span></span>
                    </div>
                  </Card>

                  {/* Quick Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setActiveTab('scenarios'); }}>
                      <Play className="h-3 w-3 mr-1" /> Simular Escenario
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setActiveTab('ai');
                      runWorkforceAnalysis({ stats, plans_count: stats.total_plans, headcount_gap: stats.headcount_gap });
                    }}>
                      <Brain className="h-3 w-3 mr-1" /> Análisis IA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* === PLANS TAB === */}
          <TabsContent value="plans" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fetchPlanDetail(plan.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{plan.plan_name}</h4>
                          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {plan.status}
                          </Badge>
                        </div>
                        {plan.description && <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Horizonte: {plan.time_horizon.replace('_', ' ')}</span>
                          <span>Presupuesto: €{Number(plan.budget_total).toLocaleString()}</span>
                        </div>
                        {Number(plan.budget_total) > 0 && (
                          <div className="mt-2">
                            <Progress value={(Number(plan.budget_used) / Number(plan.budget_total)) * 100} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {((Number(plan.budget_used) / Number(plan.budget_total)) * 100).toFixed(0)}% utilizado
                            </p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

                {/* Plan Detail */}
                {selectedPlan && (
                  <Card className="p-4 border-primary/30 bg-primary/5">
                    <h4 className="font-semibold text-sm mb-3">{selectedPlan.plan.plan_name} — Detalle</h4>

                    {/* Headcount Table */}
                    {selectedPlan.headcount.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Modelo de Headcount
                        </h5>
                        <div className="space-y-1">
                          {selectedPlan.headcount.map((hc: HeadcountModel) => (
                            <div key={hc.id} className="flex items-center justify-between text-xs p-2 rounded bg-background">
                              <div>
                                <span className="font-medium">{hc.role_title}</span>
                                <span className="text-muted-foreground ml-2">({hc.department})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span>{hc.current_headcount} → {hc.projected_headcount}</span>
                                <span className={cn("font-bold", hc.gap > 0 ? "text-orange-500" : "text-green-500")}>
                                  {hc.gap > 0 ? '+' : ''}{hc.gap}
                                </span>
                                {priorityBadge(hc.hiring_priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skill Gaps */}
                    {selectedPlan.skill_gaps.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Brechas de Skills
                        </h5>
                        <div className="space-y-1">
                          {selectedPlan.skill_gaps.map((sg: SkillGapForecast) => (
                            <div key={sg.id} className="flex items-center justify-between text-xs p-2 rounded bg-background">
                              <div>
                                <span className="font-medium">{sg.skill_name}</span>
                                <Badge variant="outline" className="text-xs ml-2">{sg.skill_category}</Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span>Oferta: {sg.current_supply} | Demanda: {sg.projected_demand}</span>
                                <span className={cn("font-bold", riskColor(sg.criticality))}>Gap: {sg.gap}</span>
                                <Badge variant="outline" className="text-xs">{sg.mitigation_strategy}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSelectedPlan(null)}>
                      Cerrar detalle
                    </Button>
                  </Card>
                )}

                {plans.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay planes de workforce creados
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === SCENARIOS TAB === */}
          <TabsContent value="scenarios" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {scenarioIcon(scenario.scenario_type)}
                        <h4 className="font-semibold text-sm">{scenario.scenario_name}</h4>
                        <Badge variant={scenario.status === 'simulated' ? 'default' : 'secondary'} className="text-xs">
                          {scenario.status}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", riskColor(scenario.risk_level))}>
                        {scenario.risk_level}
                      </Badge>
                    </div>
                    {scenario.description && <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>Probabilidad: {scenario.probability}%</span>
                      <span>Tipo: {scenario.scenario_type}</span>
                      {scenario.simulated_at && (
                        <span>Simulado {formatDistanceToNow(new Date(scenario.simulated_at), { locale: es, addSuffix: true })}</span>
                      )}
                    </div>

                    {/* Variables */}
                    {Object.keys(scenario.variables).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.entries(scenario.variables).map(([key, val]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {String(val)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Results summary */}
                    {scenario.status === 'simulated' && scenario.impact_summary && (
                      <div className="p-2 rounded bg-muted/50 text-xs mb-2">
                        <p className="font-medium mb-1">Resultado:</p>
                        <p>{scenario.impact_summary}</p>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => simulateScenario(scenario.id, scenario)}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      {scenario.status === 'simulated' ? 'Re-simular' : 'Simular'}
                    </Button>
                  </Card>
                ))}
                {scenarios.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No hay escenarios</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === SKILLS GAP TAB === */}
          <TabsContent value="skills" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {selectedPlan?.skill_gaps?.length ? (
                  <>
                    {selectedPlan.skill_gaps.map((sg: SkillGapForecast) => (
                      <Card key={sg.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{sg.skill_name}</h4>
                            <Badge variant="outline" className="text-xs">{sg.skill_category}</Badge>
                          </div>
                          <Badge variant={sg.criticality === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                            {sg.criticality}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center mb-3">
                          <div>
                            <p className="text-lg font-bold">{sg.current_supply}</p>
                            <p className="text-xs text-muted-foreground">Oferta actual</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{sg.projected_demand}</p>
                            <p className="text-xs text-muted-foreground">Demanda proyectada</p>
                          </div>
                          <div>
                            <p className={cn("text-lg font-bold", sg.gap > 0 ? "text-destructive" : "text-green-500")}>{sg.gap}</p>
                            <p className="text-xs text-muted-foreground">Brecha</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Estrategia: <Badge variant="outline" className="text-xs">{sg.mitigation_strategy}</Badge></span>
                          <span>Mercado: {sg.market_availability}</span>
                          <span>~{sg.estimated_resolution_months} meses</span>
                        </div>
                      </Card>
                    ))}
                    <Button
                      size="sm"
                      onClick={() => runSkillGapStrategy({ skill_gaps: selectedPlan.skill_gaps })}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
                      Generar Estrategia IA
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>Selecciona un plan en la pestaña Planes para ver las brechas de skills</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === AI ANALYSIS TAB === */}
          <TabsContent value="ai" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" disabled={aiLoading}
                    onClick={() => runWorkforceAnalysis({ stats, plans: plans.length, scenarios: scenarios.length })}>
                    <Sparkles className="h-3 w-3 mr-1" /> Análisis Workforce
                  </Button>
                  {selectedPlan?.skill_gaps?.length && (
                    <Button size="sm" variant="outline" disabled={aiLoading}
                      onClick={() => runSkillGapStrategy({ skill_gaps: selectedPlan.skill_gaps })}>
                      <Brain className="h-3 w-3 mr-1" /> Estrategia Skills
                    </Button>
                  )}
                </div>

                {aiLoading && (
                  <Card className="p-6 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Analizando con IA...</p>
                  </Card>
                )}

                {aiResult && !aiLoading && (
                  <Card className="p-4 border-primary/30">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Resultado del Análisis
                    </h4>

                    {aiResult.executive_summary && (
                      <div className="p-3 rounded bg-muted/50 text-sm mb-3">{String(aiResult.executive_summary)}</div>
                    )}

                    {aiResult.overall_readiness !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Preparación General</span>
                          <span className="font-bold">{String(aiResult.overall_readiness)}%</span>
                        </div>
                        <Progress value={Number(aiResult.overall_readiness)} className="h-2" />
                      </div>
                    )}

                    {aiResult.key_insights && Array.isArray(aiResult.key_insights) && (
                      <div className="space-y-2 mb-3">
                        <h5 className="text-xs font-medium">Insights Clave</h5>
                        {(aiResult.key_insights as Array<Record<string, string>>).map((insight, i) => (
                          <div key={i} className="p-2 rounded bg-background text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{insight.area}</span>
                              <Badge variant={insight.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                {insight.priority}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{insight.insight}</p>
                            {insight.action && <p className="mt-1 text-primary">→ {insight.action}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {aiResult.scenario_recommendation && (
                      <div className="p-2 rounded bg-primary/10 text-xs">
                        <span className="font-medium">Recomendación: </span>
                        {String(aiResult.scenario_recommendation)}
                      </div>
                    )}

                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAiResult(null)}>
                      Limpiar resultado
                    </Button>
                  </Card>
                )}

                {!aiResult && !aiLoading && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Ejecuta un análisis IA para obtener insights estratégicos</p>
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

export default HRWorkforcePlanningPanel;
