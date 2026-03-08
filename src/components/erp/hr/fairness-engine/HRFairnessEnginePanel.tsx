/**
 * HRFairnessEnginePanel - P4 Fairness / Justice Engine
 * Pay equity, fairness metrics, justice cases, equity action plans + AI analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Scale, RefreshCw, Sparkles, Database, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, FileText, Users, DollarSign, Shield,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus, Gavel
} from 'lucide-react';
import { useHRFairnessEngine } from '@/hooks/admin/hr/useHRFairnessEngine';
import { DataSourceBadge, resolveDataSource } from '@/components/erp/hr/shared/DataSourceBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

export function HRFairnessEnginePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    analyses, metrics, cases, plans, stats, aiAnalysis,
    loading, aiLoading, fetchAll, runFairnessAnalysis, runPayEquityAI, seedDemo,
  } = useHRFairnessEngine();

  useEffect(() => { fetchAll(companyId); }, [companyId, fetchAll]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getCaseStatusColor = (s: string) => {
    switch (s) {
      case 'resolved': case 'closed': return 'default';
      case 'investigating': case 'mediation': return 'secondary';
      case 'escalated': case 'appealed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Fairness & Justice Engine</CardTitle>
                <p className="text-xs text-muted-foreground">Equidad retributiva · Métricas de justicia · Casos · Planes de acción</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => seedDemo(companyId)} disabled={loading}>
                <Database className="h-3.5 w-3.5 mr-1" /> Seed Demo
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchAll(companyId)} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* KPIs */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              <Card className={cn("border", getScoreBg(stats.avg_equity_score))}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Equity Score</p>
                  <p className={cn("text-2xl font-bold", getScoreColor(stats.avg_equity_score))}>{stats.avg_equity_score}%</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Análisis</p>
                  <p className="text-2xl font-bold">{stats.total_analyses}</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Métricas</p>
                  <p className="text-2xl font-bold">{stats.total_metrics}</p>
                </CardContent>
              </Card>
              <Card className={cn("border", stats.non_compliant_metrics > 0 ? 'bg-red-500/10 border-red-500/20' : '')}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">No Cumplen 4/5</p>
                  <p className={cn("text-2xl font-bold", stats.non_compliant_metrics > 0 ? 'text-red-500' : '')}>{stats.non_compliant_metrics}</p>
                </CardContent>
              </Card>
              <Card className={cn("border", stats.open_cases > 0 ? 'bg-amber-500/10 border-amber-500/20' : '')}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Casos Abiertos</p>
                  <p className="text-2xl font-bold">{stats.open_cases}</p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Planes Activos</p>
                  <p className="text-2xl font-bold text-violet-500">{stats.active_plans}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="equity" className="text-xs">Equidad Retributiva</TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">Métricas</TabsTrigger>
              <TabsTrigger value="cases" className="text-xs">Casos Justicia</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent analyses */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-violet-500" /> Análisis Recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {analyses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Sin análisis. Genera datos demo.</p>
                      ) : analyses.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{a.analysis_name}</p>
                            <p className="text-xs text-muted-foreground">{a.analysis_type} · Gap: {a.gap_percentage}%</p>
                          </div>
                          <Badge className={cn(getScoreBg(a.overall_equity_score), getScoreColor(a.overall_equity_score))}>
                            {a.overall_equity_score}%
                          </Badge>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Open cases */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-amber-500" /> Casos Abiertos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {cases.filter(c => !['resolved', 'closed'].includes(c.status)).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Sin casos abiertos.</p>
                      ) : cases.filter(c => !['resolved', 'closed'].includes(c.status)).slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.case_number} · {c.case_type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={getPriorityColor(c.priority) as any}>{c.priority}</Badge>
                            <Badge variant={getCaseStatusColor(c.status) as any}>{c.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Action plans progress */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Planes de Acción
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {plans.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin planes activos.</p>
                    ) : plans.slice(0, 4).map((p) => (
                      <div key={p.id} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{p.plan_name}</p>
                          <span className="text-xs text-muted-foreground">{p.progress_percentage}%</span>
                        </div>
                        <Progress value={p.progress_percentage} className="h-2" />
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{p.plan_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Baseline: {p.baseline_value} → Target: {p.target_value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* EQUITY */}
            <TabsContent value="equity" className="mt-3">
              <div className="flex items-center gap-2 mb-4">
                <Button size="sm" onClick={() => runPayEquityAI(companyId, 'gender_gap')} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Brecha Género
                </Button>
                <Button size="sm" variant="outline" onClick={() => runPayEquityAI(companyId, 'comprehensive')} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Análisis Integral
                </Button>
                <Button size="sm" variant="outline" onClick={() => runPayEquityAI(companyId, 'intersectional')} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Interseccional
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {analyses.length === 0 ? (
                  <div className="text-center py-12">
                    <Scale className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Ejecuta un análisis de equidad retributiva con IA</p>
                  </div>
                ) : analyses.map((a) => (
                  <Card key={a.id} className="mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{a.analysis_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{a.analysis_type}</Badge>
                            <Badge variant="outline">{a.status}</Badge>
                            {a.regulatory_reference && (
                              <span className="text-xs text-muted-foreground">{a.regulatory_reference}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-2xl font-bold", getScoreColor(a.overall_equity_score))}>{a.overall_equity_score}%</p>
                          <p className="text-xs text-muted-foreground">Equity Score</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Brecha</p>
                          <p className="font-bold text-red-500">{a.gap_percentage}%</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Afectados</p>
                          <p className="font-bold">{a.affected_employees}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Coste Remediación</p>
                          <p className="font-bold">{a.remediation_cost.toLocaleString('es')}€</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            </TabsContent>

            {/* METRICS */}
            <TabsContent value="metrics" className="mt-3">
              <ScrollArea className="h-[400px]">
                {metrics.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Sin métricas de equidad. Genera datos demo.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metrics.map((m) => (
                      <Card key={m.id} className={cn("border", !m.four_fifths_compliant && "border-red-500/30 bg-red-500/5")}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{m.metric_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{m.metric_type}</Badge>
                                <Badge variant="outline" className="text-xs">{m.protected_attribute}</Badge>
                                {m.department && <span className="text-xs text-muted-foreground">{m.department}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">{m.group_a_label}</p>
                                  <p className="font-bold">{m.group_a_value}</p>
                                </div>
                                <span className="text-muted-foreground">vs</span>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">{m.group_b_label}</p>
                                  <p className="font-bold">{m.group_b_value}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1 justify-end">
                                <span className="text-xs text-muted-foreground">DI Ratio:</span>
                                <span className={cn("text-sm font-medium", m.four_fifths_compliant ? 'text-emerald-500' : 'text-red-500')}>
                                  {m.disparate_impact_ratio.toFixed(2)}
                                </span>
                                {m.four_fifths_compliant ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* CASES */}
            <TabsContent value="cases" className="mt-3">
              <ScrollArea className="h-[400px]">
                {cases.length === 0 ? (
                  <div className="text-center py-12">
                    <Gavel className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Sin casos de justicia organizacional.</p>
                  </div>
                ) : cases.map((c) => (
                  <Card key={c.id} className="mb-2">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{c.case_number}</span>
                            <Badge variant={getPriorityColor(c.priority) as any} className="text-xs">{c.priority}</Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{c.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{c.case_type.replace(/_/g, ' ')}</Badge>
                            {c.department && <span className="text-xs text-muted-foreground">{c.department}</span>}
                            {c.is_anonymous && <Badge variant="secondary" className="text-xs">Anónimo</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getCaseStatusColor(c.status) as any}>{c.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(c.created_at), { locale: es, addSuffix: true })}
                          </p>
                          {c.days_to_resolve && (
                            <p className="text-xs text-muted-foreground">{c.days_to_resolve} días resolución</p>
                          )}
                        </div>
                      </div>
                      {c.resolution && (
                        <div className="mt-2 p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground">Resolución: {c.resolution}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            </TabsContent>

            {/* AI ANALYSIS */}
            <TabsContent value="ai" className="mt-3">
              <div className="mb-3">
                <Button onClick={() => runFairnessAnalysis(companyId)} disabled={aiLoading} className="gap-2">
                  <Sparkles className={cn("h-4 w-4", aiLoading && "animate-spin")} />
                  {aiLoading ? 'Analizando equidad...' : 'Ejecutar Análisis de Equidad IA'}
                </Button>
              </div>
              {aiAnalysis ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {/* Fairness Index */}
                    <Card className={cn("border", getScoreBg(aiAnalysis.overall_fairness_index))}>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Índice Global de Equidad</p>
                        <p className={cn("text-4xl font-bold", getScoreColor(aiAnalysis.overall_fairness_index))}>
                          {aiAnalysis.overall_fairness_index}%
                        </p>
                      </CardContent>
                    </Card>

                    {/* Executive Summary */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Resumen Ejecutivo
                        </h4>
                        <p className="text-sm text-muted-foreground">{aiAnalysis.executive_summary}</p>
                      </CardContent>
                    </Card>

                    {/* Disparate Impact Alerts */}
                    {Array.isArray(aiAnalysis.disparate_impact_alerts) && aiAnalysis.disparate_impact_alerts.length > 0 && (
                      <Card className="border-amber-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas de Impacto Dispar
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {aiAnalysis.disparate_impact_alerts.map((alert: any, i: number) => (
                            <div key={i} className="py-2 border-b last:border-0">
                              <p className="text-sm">{alert.description || alert.metric || JSON.stringify(alert)}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Priorities */}
                    {Array.isArray(aiAnalysis.action_priorities) && aiAnalysis.action_priorities.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-violet-500" /> Prioridades de Acción
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {aiAnalysis.action_priorities.map((p: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                              <Badge variant={p.impact === 'critical' ? 'destructive' : 'secondary'} className="mt-0.5">P{p.priority || i + 1}</Badge>
                              <div>
                                <p className="text-sm font-medium">{p.action}</p>
                                {p.expected_outcome && <p className="text-xs text-muted-foreground">{p.expected_outcome}</p>}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-muted-foreground">Ejecuta el análisis IA para obtener un diagnóstico integral de equidad</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRFairnessEnginePanel;
