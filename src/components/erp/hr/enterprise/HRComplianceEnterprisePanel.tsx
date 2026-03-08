/**
 * HRComplianceEnterprisePanel - Dashboard Compliance Enterprise
 * Fase 5: Gestión integral de compliance laboral
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield, FileText, AlertTriangle, GraduationCap, BarChart3,
  RefreshCw, Sparkles, Database, CheckCircle, XCircle, Clock,
  TrendingUp, TrendingDown, Minus, AlertOctagon, Search
} from 'lucide-react';
import { useHRComplianceEnterprise } from '@/hooks/admin/hr/useHRComplianceEnterprise';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export function HRComplianceEnterprisePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const {
    loading, policies, audits, incidents, training, riskAssessments, kpis, stats,
    riskAnalysis, gapAnalysis,
    fetchDashboard, runRiskAnalysis, runGapAnalysis, seedDemo,
  } = useHRComplianceEnterprise(companyId);

  const handleAiAction = async (action: 'risk' | 'gap') => {
    setAiLoading(action);
    if (action === 'risk') await runRiskAnalysis();
    else await runGapAnalysis();
    setAiLoading(null);
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'active': case 'completed': case 'resolved': return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case 'in_progress': case 'investigating': return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
      case 'draft': case 'planned': return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'open': return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
      default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const trendIcon = (t: string) => {
    if (t === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
    if (t === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Compliance Enterprise</h2>
            <p className="text-sm text-muted-foreground">Gestión integral de cumplimiento normativo laboral</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={seedDemo} disabled={loading}>
            <Database className="h-4 w-4 mr-1" /> Seed Demo
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Políticas Activas</p>
            <p className="text-2xl font-bold">{stats.activePolicies}<span className="text-sm text-muted-foreground">/{stats.totalPolicies}</span></p>
          </CardContent>
        </Card>
        <Card className={cn("border-orange-500/20 bg-orange-500/5", stats.openIncidents > 0 && "border-orange-500/40")}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Incidentes Abiertos</p>
            <p className="text-2xl font-bold">{stats.openIncidents}
              {stats.criticalIncidents > 0 && <Badge variant="destructive" className="ml-2 text-xs">{stats.criticalIncidents} críticos</Badge>}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Formación Completada</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.avgTrainingCompletion}%</p>
              <Progress value={stats.avgTrainingCompletion} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-purple-500/20 bg-purple-500/5")}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Riesgo Global</p>
            <p className="text-2xl font-bold">{stats.overallRiskScore}<span className="text-sm text-muted-foreground">/100</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">Políticas</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs">Incidentes</TabsTrigger>
          <TabsTrigger value="audits" className="text-xs">Auditorías</TabsTrigger>
          <TabsTrigger value="training" className="text-xs">Formación</TabsTrigger>
          <TabsTrigger value="ai-analysis" className="text-xs">IA Analysis</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            {/* KPIs */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> KPIs Compliance</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {kpis.map(kpi => (
                      <div key={kpi.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{kpi.kpi_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold">{kpi.current_value}</span>
                            <span className="text-xs text-muted-foreground">/ {kpi.target_value} {kpi.unit}</span>
                            {trendIcon(kpi.trend)}
                          </div>
                          {kpi.unit === '%' && (
                            <Progress value={kpi.current_value} className="mt-1 h-1.5" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">{kpi.period}</Badge>
                      </div>
                    ))}
                    {kpis.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin KPIs. Usa "Seed Demo" para generar datos.</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Risk Assessments */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertOctagon className="h-4 w-4" /> Evaluaciones de Riesgo</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {riskAssessments.map(ra => (
                      <div key={ra.id} className="p-3 rounded-lg border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{ra.assessment_name}</p>
                          <Badge className={severityColor(ra.risk_level)}>{ra.risk_level}</Badge>
                        </div>
                        {ra.overall_risk_score !== null && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Score:</span>
                            <Progress value={100 - (ra.overall_risk_score || 0)} className="flex-1 h-2" />
                            <span className="text-xs font-medium">{ra.overall_risk_score}/100</span>
                          </div>
                        )}
                        {Array.isArray(ra.risk_areas) && ra.risk_areas.length > 0 && (
                          <div className="grid grid-cols-2 gap-1">
                            {(ra.risk_areas as Array<{ area: string; score: number; level: string }>).map((area, i) => (
                              <div key={i} className="text-xs flex items-center gap-1">
                                <span className={cn("w-2 h-2 rounded-full",
                                  area.level === 'low' ? 'bg-green-400' : area.level === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                                )} />
                                {area.area}: {area.score}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {riskAssessments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin evaluaciones de riesgo</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* POLICIES */}
        <TabsContent value="policies">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Políticas y Normativas ({policies.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {policies.map(p => (
                    <div key={p.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {statusIcon(p.status)}
                          <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
                          <span className="text-sm font-medium">{p.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={severityColor(p.risk_level)} variant="outline">{p.risk_level}</Badge>
                          <Badge variant="secondary" className="text-xs">v{p.version}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {p.regulation_reference && <span className="text-xs text-muted-foreground">{p.regulation_reference}</span>}
                        <div className="flex gap-1 ml-auto">
                          {p.jurisdictions?.map(j => (
                            <Badge key={j} variant="outline" className="text-xs px-1.5">{j}</Badge>
                          ))}
                        </div>
                      </div>
                      {p.review_date && (
                        <p className="text-xs text-muted-foreground mt-1">Revisión: {new Date(p.review_date).toLocaleDateString('es-ES')}</p>
                      )}
                    </div>
                  ))}
                  {policies.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin políticas registradas</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCIDENTS */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Incidentes de Compliance ({incidents.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {incidents.map(inc => (
                    <div key={inc.id} className={cn("p-3 rounded-lg border bg-card", inc.severity === 'critical' && "border-red-500/30 bg-red-500/5")}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {statusIcon(inc.status)}
                          <span className="text-xs font-mono text-muted-foreground">{inc.incident_code}</span>
                          <span className="text-sm font-medium">{inc.title}</span>
                        </div>
                        <Badge className={severityColor(inc.severity)}>{inc.severity}</Badge>
                      </div>
                      {inc.description && <p className="text-xs text-muted-foreground mt-1">{inc.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{inc.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{inc.status}</Badge>
                        {inc.affected_regulations?.map(r => (
                          <Badge key={r} variant="outline" className="text-xs bg-blue-500/10">{r}</Badge>
                        ))}
                      </div>
                      {inc.resolution && (
                        <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                          <p className="text-xs"><span className="font-medium">Resolución:</span> {inc.resolution}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {incidents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin incidentes registrados</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDITS */}
        <TabsContent value="audits">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Search className="h-4 w-4" /> Auditorías ({audits.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {audits.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {statusIcon(a.status)}
                          <span className="text-sm font-medium">{a.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">{a.audit_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                        </div>
                      </div>
                      {a.scope && <p className="text-xs text-muted-foreground">{a.scope}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        {a.lead_auditor && <span className="text-xs">Auditor: <strong>{a.lead_auditor}</strong></span>}
                        {a.overall_score !== null && a.overall_score !== undefined && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Score:</span>
                            <Progress value={a.overall_score} className="w-20 h-1.5" />
                            <span className="text-xs font-medium">{a.overall_score}%</span>
                          </div>
                        )}
                        {a.findings_count > 0 && (
                          <span className="text-xs">
                            {a.findings_count} hallazgos
                            {a.critical_findings > 0 && <span className="text-red-400 ml-1">({a.critical_findings} críticos)</span>}
                          </span>
                        )}
                      </div>
                      {a.planned_start && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(a.planned_start).toLocaleDateString('es-ES')} — {a.planned_end ? new Date(a.planned_end).toLocaleDateString('es-ES') : 'En curso'}
                        </p>
                      )}
                    </div>
                  ))}
                  {audits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin auditorías registradas</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRAINING */}
        <TabsContent value="training">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Formación Compliance ({training.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {training.map(t => (
                    <div key={t.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{t.title}</span>
                        <div className="flex items-center gap-1.5">
                          {t.certification_required && <Badge variant="outline" className="text-xs bg-purple-500/10">Certificación</Badge>}
                          <Badge variant="secondary" className="text-xs">{t.training_type}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{t.regulation_area}</Badge>
                        <Badge variant="outline" className="text-xs">{t.format}</Badge>
                        <span className="text-xs text-muted-foreground">{t.duration_hours}h</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={t.completion_rate} className="flex-1 h-2" />
                        <span className="text-xs font-medium">{t.completion_rate}%</span>
                        <span className="text-xs text-muted-foreground">({t.total_completed}/{t.total_enrolled})</span>
                      </div>
                      {t.deadline && (
                        <p className="text-xs text-muted-foreground mt-1">Plazo: {new Date(t.deadline).toLocaleDateString('es-ES')}</p>
                      )}
                    </div>
                  ))}
                  {training.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin formación registrada</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI ANALYSIS */}
        <TabsContent value="ai-analysis">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => handleAiAction('risk')} disabled={!!aiLoading} variant="default" size="sm">
                <Sparkles className={cn("h-4 w-4 mr-1", aiLoading === 'risk' && "animate-spin")} />
                {aiLoading === 'risk' ? 'Analizando...' : 'Análisis de Riesgos IA'}
              </Button>
              <Button onClick={() => handleAiAction('gap')} disabled={!!aiLoading} variant="outline" size="sm">
                <Search className={cn("h-4 w-4 mr-1", aiLoading === 'gap' && "animate-spin")} />
                {aiLoading === 'gap' ? 'Analizando...' : 'Gap Analysis IA'}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Risk Analysis Results */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Análisis de Riesgos IA</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    {riskAnalysis ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-sm">Riesgo Global</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{riskAnalysis.overallRiskScore}/100</span>
                            <Badge className={severityColor(riskAnalysis.riskLevel)}>{riskAnalysis.riskLevel}</Badge>
                          </div>
                        </div>
                        {riskAnalysis.topRisks?.map((r, i) => (
                          <div key={i} className="p-2.5 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{r.area}</span>
                              <Badge className={severityColor(r.severity)}>{r.severity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                            <p className="text-xs mt-1"><span className="font-medium">Mitigación:</span> {r.mitigation}</p>
                          </div>
                        ))}
                        {riskAnalysis.narrative && (
                          <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs">{riskAnalysis.narrative}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-12">Ejecuta el análisis de riesgos para ver resultados</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Gap Analysis Results */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gap Analysis IA</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    {gapAnalysis ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="text-sm">Madurez</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{gapAnalysis.overallMaturity}/5</span>
                            <Badge variant="outline">{gapAnalysis.maturityLevel}</Badge>
                          </div>
                        </div>
                        {gapAnalysis.maturityByArea?.map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                            <span className="text-xs">{a.area}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(a.score / 5) * 100} className="w-16 h-1.5" />
                              <span className="text-xs font-medium">{a.score}/5</span>
                            </div>
                          </div>
                        ))}
                        {gapAnalysis.gaps?.slice(0, 5).map((g, i) => (
                          <div key={i} className="p-2.5 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{g.regulation}</span>
                              <Badge variant="outline" className="text-xs">{g.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{g.gap}</p>
                          </div>
                        ))}
                        {gapAnalysis.narrative && (
                          <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs">{gapAnalysis.narrative}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-12">Ejecuta el Gap Analysis para ver resultados</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRComplianceEnterprisePanel;
