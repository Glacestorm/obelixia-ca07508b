import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Heart, Brain, Sparkles, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  Users, Activity, CheckCircle, Clock, Dumbbell, Smile, Frown, Database,
  BarChart3, MessageSquare, Shield, Lightbulb, Minus
} from 'lucide-react';
import { useHRWellbeingEnterprise } from '@/hooks/admin/hr/useHRWellbeingEnterprise';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

export function HRWellbeingEnterprisePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    assessments, surveys, programs, burnoutAlerts, kpis,
    aiAnalysis, stats, loading, aiLoading,
    fetchAll, runAIAnalysis, acknowledgeAlert, resolveAlert, seedDemo,
  } = useHRWellbeingEnterprise(companyId);

  const riskColor = (level: string) => {
    const map: Record<string, string> = { critical: 'text-red-600', high: 'text-orange-500', medium: 'text-yellow-500', low: 'text-green-500', none: 'text-muted-foreground' };
    return map[level] || 'text-muted-foreground';
  };

  const riskBadge = (level: string) => {
    const map: Record<string, 'destructive' | 'secondary' | 'default'> = { critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'default' };
    return map[level] || 'default';
  };

  const trendIcon = (val: number, threshold = 5) => {
    if (val > threshold) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (val < -threshold) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const latestKPI = kpis[0];
  const prevKPI = kpis[1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Wellbeing Enterprise</h2>
            <p className="text-sm text-muted-foreground">Bienestar organizacional, burnout y programas wellness</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={seedDemo} disabled={loading}>
            <Database className="h-4 w-4 mr-1" /> Seed Demo
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
          <Button size="sm" onClick={runAIAnalysis} disabled={aiLoading} className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
            <Sparkles className={cn("h-4 w-4 mr-1", aiLoading && "animate-spin")} /> Análisis IA
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'eNPS', value: stats.enpsScore, icon: TrendingUp, color: stats.enpsScore > 0 ? 'text-green-500' : 'text-red-500' },
          { label: 'Engagement', value: `${stats.avgEngagement.toFixed(1)}`, icon: Activity, color: 'text-blue-500' },
          { label: 'Satisfacción', value: `${stats.avgSatisfaction.toFixed(1)}`, icon: Smile, color: 'text-emerald-500' },
          { label: 'Burnout %', value: `${stats.burnoutRate.toFixed(1)}%`, icon: Frown, color: stats.burnoutRate > 10 ? 'text-red-500' : 'text-green-500' },
          { label: 'Alertas', value: stats.criticalAlerts, icon: AlertTriangle, color: stats.criticalAlerts > 0 ? 'text-red-500' : 'text-green-500' },
          { label: 'Programas', value: stats.activePrograms, icon: Dumbbell, color: 'text-purple-500' },
          { label: 'Encuestas', value: stats.activeSurveys, icon: MessageSquare, color: 'text-indigo-500' },
          { label: 'Evaluaciones', value: stats.totalAssessments, icon: BarChart3, color: 'text-cyan-500' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border">
            <CardContent className="p-3 text-center">
              <kpi.icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="burnout" className="text-xs">
            Burnout {stats.criticalAlerts > 0 && <Badge variant="destructive" className="ml-1 text-[9px] h-4">{stats.criticalAlerts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="surveys" className="text-xs">Encuestas</TabsTrigger>
          <TabsTrigger value="programs" className="text-xs">Programas</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Tendencias</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KPI Trends */}
            {latestKPI && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">KPIs Último Período ({latestKPI.period})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'eNPS Score', val: latestKPI.enps_score, prev: prevKPI?.enps_score },
                    { label: 'Engagement Index', val: latestKPI.engagement_index, prev: prevKPI?.engagement_index },
                    { label: 'Satisfacción Media', val: latestKPI.avg_satisfaction, prev: prevKPI?.avg_satisfaction },
                    { label: 'Estrés Medio', val: latestKPI.avg_stress, prev: prevKPI?.avg_stress, invert: true },
                    { label: 'Work-Life Balance', val: latestKPI.avg_work_life_balance, prev: prevKPI?.avg_work_life_balance },
                    { label: 'Participación Encuestas', val: latestKPI.survey_participation, prev: prevKPI?.survey_participation, suffix: '%' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.val}{item.suffix || ''}</span>
                        {item.prev != null && trendIcon(item.invert ? (item.prev - item.val) : (item.val - item.prev), 0.3)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent alerts */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Alertas Burnout Activas</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {burnoutAlerts.filter(a => a.status === 'active').slice(0, 5).map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={riskBadge(alert.risk_level)}>{alert.risk_level.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">Score: {alert.risk_score}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          {(alert.contributing_factors as string[]).slice(0, 2).map((f, i) => (
                            <p key={i}>• {f}</p>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => acknowledgeAlert(alert.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Reconocer
                        </Button>
                      </div>
                    ))}
                    {burnoutAlerts.filter(a => a.status === 'active').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Sin alertas activas</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BURNOUT */}
        <TabsContent value="burnout" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de Riesgo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map((level) => {
                  const count = assessments.filter(a => a.burnout_risk === level).length;
                  const pct = assessments.length > 0 ? (count / assessments.length) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={cn("capitalize font-medium", riskColor(level))}>{level}</span>
                        <span>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Todas las Alertas</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {burnoutAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <Badge variant={riskBadge(alert.risk_level)}>{alert.risk_level}</Badge>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{alert.status}</Badge>
                            <span className="text-xs text-muted-foreground">{alert.risk_score}pts</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium">Factores:</p>
                          {(alert.contributing_factors as string[]).map((f, i) => <p key={i} className="text-muted-foreground">• {f}</p>)}
                        </div>
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium">Acciones recomendadas:</p>
                          {(alert.recommended_actions as string[]).map((a, i) => <p key={i} className="text-muted-foreground">→ {a}</p>)}
                        </div>
                        {alert.status === 'active' && (
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => acknowledgeAlert(alert.id)}>Reconocer</Button>
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => resolveAlert(alert.id, 'Resuelto manualmente')}>Resolver</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SURVEYS */}
        <TabsContent value="surveys" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{survey.title}</CardTitle>
                    <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>{survey.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="outline">{survey.survey_type.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Respuestas</span>
                    <span className="font-medium">{survey.total_responses}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tasa respuesta</span>
                      <span>{survey.response_rate}%</span>
                    </div>
                    <Progress value={survey.response_rate} className="h-2" />
                  </div>
                  {survey.results_summary && (survey.results_summary as any).score != null && (
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">eNPS Score</p>
                      <p className={cn("text-2xl font-bold", (survey.results_summary as any).score > 0 ? 'text-green-500' : 'text-red-500')}>
                        {(survey.results_summary as any).score}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {survey.anonymized && <Shield className="h-3 w-3" />}
                    {survey.anonymized && 'Anónima'}
                    <span className="ml-auto">{survey.frequency}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {surveys.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No hay encuestas. Usa "Seed Demo" para generar datos.</p>
            )}
          </div>
        </TabsContent>

        {/* PROGRAMS */}
        <TabsContent value="programs" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => {
              const categoryIcons: Record<string, any> = { physical: Dumbbell, mental: Brain, financial: TrendingUp, social: Users, professional: Activity, environmental: Heart };
              const Icon = categoryIcons[program.category] || Heart;
              const occupancy = program.max_participants > 0 ? (program.current_participants / program.max_participants) * 100 : 0;
              return (
                <Card key={program.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-pink-500" />
                        <CardTitle className="text-sm">{program.name}</CardTitle>
                      </div>
                      <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>{program.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant="outline" className="text-xs">{program.category}</Badge>
                    {program.provider && <p className="text-xs text-muted-foreground">Proveedor: {program.provider}</p>}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{program.current_participants}/{program.max_participants} participantes</span>
                        <span>{occupancy.toFixed(0)}%</span>
                      </div>
                      <Progress value={occupancy} className="h-2" />
                    </div>
                    {program.satisfaction_score > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Satisfacción</span>
                        <span className="font-medium text-green-500">{program.satisfaction_score}/10</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Presupuesto</span>
                      <span className="font-medium">€{program.budget?.toLocaleString()}</span>
                    </div>
                    {program.benefits && (program.benefits as string[]).length > 0 && (
                      <div className="text-xs space-y-1">
                        {(program.benefits as string[]).slice(0, 3).map((b, i) => (
                          <p key={i} className="text-muted-foreground">✓ {b}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {programs.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No hay programas. Usa "Seed Demo" para generar datos.</p>
            )}
          </div>
        </TabsContent>

        {/* TRENDS */}
        <TabsContent value="trends" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución KPIs</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-4">
                    {kpis.map((kpi, idx) => (
                      <div key={kpi.id} className="p-3 rounded-lg border">
                        <p className="text-sm font-medium mb-2">{kpi.period}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">eNPS:</span> <span className={kpi.enps_score > 0 ? 'text-green-500' : 'text-red-500'}>{kpi.enps_score}</span></div>
                          <div><span className="text-muted-foreground">Engagement:</span> {kpi.engagement_index}</div>
                          <div><span className="text-muted-foreground">Satisfacción:</span> {kpi.avg_satisfaction}</div>
                          <div><span className="text-muted-foreground">Estrés:</span> {kpi.avg_stress}</div>
                          <div><span className="text-muted-foreground">Burnout:</span> {kpi.burnout_rate}%</div>
                          <div><span className="text-muted-foreground">Balance:</span> {kpi.avg_work_life_balance}</div>
                          <div><span className="text-muted-foreground">Absentismo:</span> {kpi.absenteeism_rate}%</div>
                          <div><span className="text-muted-foreground">Participación:</span> {kpi.survey_participation}%</div>
                        </div>
                      </div>
                    ))}
                    {kpis.length === 0 && <p className="text-center text-muted-foreground py-8">Sin datos de tendencias</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Dimensiones del Bienestar</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['autonomy', 'purpose', 'relationships', 'growth', 'recognition'].map((dim) => {
                    const values = assessments
                      .map(a => (a.dimensions as Record<string, number>)?.[dim])
                      .filter(v => v != null);
                    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
                    const labels: Record<string, string> = { autonomy: 'Autonomía', purpose: 'Propósito', relationships: 'Relaciones', growth: 'Crecimiento', recognition: 'Reconocimiento' };
                    return (
                      <div key={dim} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{labels[dim]}</span>
                          <span className="font-medium">{avg.toFixed(1)}/10</span>
                        </div>
                        <Progress value={avg * 10} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI ANALYSIS */}
        <TabsContent value="ai" className="mt-3">
          {aiAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    Estado General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                    <p className={cn("text-4xl font-bold", aiAnalysis.healthScore >= 70 ? 'text-green-500' : aiAnalysis.healthScore >= 40 ? 'text-yellow-500' : 'text-red-500')}>
                      {aiAnalysis.healthScore}
                    </p>
                    <Badge variant={aiAnalysis.overallHealth === 'healthy' ? 'default' : 'destructive'} className="mt-2">
                      {aiAnalysis.overallHealth}
                    </Badge>
                  </div>
                  {aiAnalysis.predictedTurnoverRisk != null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Riesgo Turnover Predicho</span>
                      <span className={cn("font-bold", aiAnalysis.predictedTurnoverRisk > 20 ? 'text-red-500' : 'text-green-500')}>
                        {aiAnalysis.predictedTurnoverRisk}%
                      </span>
                    </div>
                  )}
                  {aiAnalysis.burnoutRiskAnalysis && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Burnout Analysis</p>
                      <Badge variant="secondary">Tendencia: {aiAnalysis.burnoutRiskAnalysis.trend}</Badge>
                      {aiAnalysis.burnoutRiskAnalysis.rootCauses?.map((c, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {c}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Recomendaciones</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {aiAnalysis.recommendations?.map((rec, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">P{rec.priority}</Badge>
                            <span className="text-xs text-muted-foreground">{rec.timeframe}</span>
                          </div>
                          <p className="text-sm">{rec.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">Impacto: {rec.expectedImpact}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {aiAnalysis.keyFindings && aiAnalysis.keyFindings.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Hallazgos Clave</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiAnalysis.keyFindings.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{f.area}</Badge>
                            <Badge variant={f.impact === 'high' ? 'destructive' : 'secondary'}>{f.impact}</Badge>
                          </div>
                          <p className="text-sm">{f.finding}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Pulsa "Análisis IA" para generar un diagnóstico completo de bienestar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
