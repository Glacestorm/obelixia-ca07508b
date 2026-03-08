/**
 * HRAIGovernancePanel - AI Governance Layer Dashboard
 * Model Registry, Decision Audit, Bias Detection, Explainability, Policies
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw, Sparkles, Brain, ShieldCheck, AlertTriangle,
  Eye, BarChart3, FileText, Scale, Database, Activity
} from 'lucide-react';
import { useHRAIGovernance } from '@/hooks/admin/hr/useHRAIGovernance';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

export function HRAIGovernancePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    models, decisions, biasAudits, policies, stats, analysis, loading,
    fetchAll, fetchStats, runGovernanceAnalysis, runBiasAudit, seedDemo,
  } = useHRAIGovernance();

  useEffect(() => {
    fetchAll(companyId);
    fetchStats(companyId);
  }, [companyId, fetchAll, fetchStats]);

  const riskColor = (level: string) => {
    const map: Record<string, string> = { minimal: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', limited: 'bg-blue-500/10 text-blue-700 border-blue-500/30', high: 'bg-orange-500/10 text-orange-700 border-orange-500/30', unacceptable: 'bg-destructive/10 text-destructive border-destructive/30' };
    return map[level] || 'bg-muted text-muted-foreground';
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-700', testing: 'bg-amber-500/10 text-amber-700', deprecated: 'bg-muted text-muted-foreground', suspended: 'bg-destructive/10 text-destructive', draft: 'bg-blue-500/10 text-blue-700' };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">AI Governance Layer</CardTitle>
              <p className="text-xs text-muted-foreground">EU AI Act · Explainability · Bias Detection · Model Registry</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => seedDemo(companyId)} disabled={loading}>
              <Database className="h-3.5 w-3.5 mr-1" /> Seed
            </Button>
            <Button variant="outline" size="sm" onClick={() => { fetchAll(companyId); fetchStats(companyId); }} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {/* KPI Strip */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Modelos IA', value: stats.total_models, sub: `${stats.high_risk_models} alto riesgo`, icon: Brain },
              { label: 'Decisiones', value: stats.total_decisions, sub: `${stats.overridden_decisions} overrides`, icon: Activity },
              { label: 'Políticas', value: stats.active_policies, sub: 'activas', icon: ShieldCheck },
              { label: 'Fairness Avg', value: stats.avg_fairness_score ? `${stats.avg_fairness_score}%` : 'N/A', sub: `${stats.pending_audits} auditorías`, icon: Scale },
            ].map((kpi, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <kpi.icon className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold mt-0.5">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-3">
            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="registry" className="text-xs">Modelos</TabsTrigger>
            <TabsTrigger value="decisions" className="text-xs">Decisiones</TabsTrigger>
            <TabsTrigger value="bias" className="text-xs">Sesgo</TabsTrigger>
            <TabsTrigger value="policies" className="text-xs">Políticas</TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">IA Analysis</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                <Card className="bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-violet-500" /> EU AI Act Compliance
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Modelos alto riesgo</p>
                        <p className="text-xl font-bold text-orange-500">{models.filter(m => m.risk_level === 'high').length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Con auditoría vigente</p>
                        <p className="text-xl font-bold text-emerald-500">{models.filter(m => m.last_audit_at).length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Human-in-the-loop</p>
                        <p className="text-xl font-bold text-violet-500">{policies.filter(p => p.policy_type === 'accountability' && p.is_active).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent decisions */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Últimas decisiones IA</h3>
                  {decisions.slice(0, 5).map(dec => (
                    <div key={dec.id} className="flex items-center justify-between p-2 rounded-lg border mb-1.5 bg-card">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">{dec.decision_type}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(dec.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {dec.confidence_score && (
                          <Badge variant="outline" className="text-[10px]">{(Number(dec.confidence_score) * 100).toFixed(0)}%</Badge>
                        )}
                        <Badge className={cn("text-[10px]", dec.human_override ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700')}>
                          {dec.human_override ? 'Override' : dec.outcome_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {decisions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin decisiones registradas</p>}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* MODEL REGISTRY */}
          <TabsContent value="registry">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {models.map(model => (
                  <Card key={model.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-violet-500" />
                            <span className="text-sm font-semibold">{model.model_name}</span>
                            <Badge variant="outline" className="text-[10px]">v{model.model_version}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{model.purpose}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={cn("text-[10px]", riskColor(model.risk_level))}>{model.risk_level.toUpperCase()}</Badge>
                            <Badge className={cn("text-[10px]", statusColor(model.status))}>{model.status}</Badge>
                            {model.eu_ai_act_category && (
                              <Badge variant="outline" className="text-[10px]">EU: {model.eu_ai_act_category}</Badge>
                            )}
                          </div>
                          {model.performance_metrics && Object.keys(model.performance_metrics).length > 0 && (
                            <div className="flex gap-3 mt-2">
                              {Object.entries(model.performance_metrics).slice(0, 4).map(([k, v]) => (
                                <div key={k} className="text-center">
                                  <p className="text-[10px] text-muted-foreground">{k}</p>
                                  <p className="text-xs font-bold">{typeof v === 'number' ? (v * (v < 1 ? 100 : 1)).toFixed(0) + '%' : String(v)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => runBiasAudit(companyId, model.id)} disabled={loading} className="text-xs">
                          <Scale className="h-3.5 w-3.5 mr-1" /> Auditar sesgo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {models.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Sin modelos registrados. Usa "Seed" para cargar datos demo.</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* DECISIONS */}
          <TabsContent value="decisions">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1.5">
                {decisions.map(dec => (
                  <div key={dec.id} className="p-2.5 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{dec.decision_type}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(dec.created_at), { locale: es, addSuffix: true })}
                          {dec.processing_time_ms && ` · ${dec.processing_time_ms}ms`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge className={cn("text-[10px]", riskColor(dec.risk_level))}>{dec.risk_level}</Badge>
                        <Badge variant="outline" className="text-[10px]">{dec.outcome_status}</Badge>
                      </div>
                    </div>
                    {dec.explanation && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{dec.explanation}</p>}
                    {dec.human_override && (
                      <div className="mt-1 p-1.5 bg-amber-500/10 rounded text-[10px] text-amber-700">
                        <Eye className="h-3 w-3 inline mr-1" /> Override humano: {dec.override_reason || 'Sin motivo registrado'}
                      </div>
                    )}
                  </div>
                ))}
                {decisions.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Sin decisiones IA registradas</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* BIAS AUDITS */}
          <TabsContent value="bias">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {biasAudits.map(audit => (
                  <Card key={audit.id} className={cn(audit.bias_detected ? 'border-orange-500/40' : 'border-emerald-500/30')}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scale className={cn("h-4 w-4", audit.bias_detected ? 'text-orange-500' : 'text-emerald-500')} />
                          <div>
                            <p className="text-xs font-semibold">Auditoría {audit.audit_type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(audit.created_at), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {audit.overall_fairness_score != null && (
                            <Badge variant="outline" className="text-[10px]">Fairness: {Number(audit.overall_fairness_score).toFixed(0)}%</Badge>
                          )}
                          <Badge className={cn("text-[10px]", audit.bias_detected ? 'bg-orange-500/10 text-orange-700' : 'bg-emerald-500/10 text-emerald-700')}>
                            {audit.bias_detected ? 'Sesgo detectado' : 'Sin sesgo'}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {audit.protected_attributes.map(attr => (
                          <Badge key={attr} variant="outline" className="text-[10px]">{attr}</Badge>
                        ))}
                      </div>
                      {audit.overall_fairness_score != null && (
                        <Progress value={Number(audit.overall_fairness_score)} className="h-1.5 mt-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
                {biasAudits.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Sin auditorías de sesgo. Ejecuta una desde la tab "Modelos".</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* POLICIES */}
          <TabsContent value="policies">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {policies.map(policy => (
                  <Card key={policy.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-violet-500" />
                          <div>
                            <p className="text-sm font-semibold">{policy.policy_name}</p>
                            <p className="text-xs text-muted-foreground">{policy.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">{policy.policy_type}</Badge>
                          <Badge className={cn("text-[10px]", policy.enforcement_level === 'mandatory' || policy.enforcement_level === 'regulatory' ? 'bg-destructive/10 text-destructive' : 'bg-blue-500/10 text-blue-700')}>
                            {policy.enforcement_level}
                          </Badge>
                        </div>
                      </div>
                      {policy.regulatory_reference && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">📜 {policy.regulatory_reference}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {policies.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Sin políticas de gobernanza IA</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI ANALYSIS */}
          <TabsContent value="analysis">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                <Button onClick={() => runGovernanceAnalysis(companyId)} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                  <Sparkles className="h-4 w-4 mr-2" /> Ejecutar análisis IA de gobernanza
                </Button>

                {analysis && (
                  <>
                    <Card className="bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3">Madurez de Gobernanza IA</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-violet-500">{analysis.governance_maturity}%</p>
                            <p className="text-[10px] text-muted-foreground">Madurez global</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-fuchsia-500">{analysis.transparency_score}%</p>
                            <p className="text-[10px] text-muted-foreground">Transparencia</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-500">{analysis.accountability_score}%</p>
                            <p className="text-[10px] text-muted-foreground">Accountability</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {analysis.eu_ai_act_compliance && (
                      <Card>
                        <CardContent className="p-3">
                          <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> EU AI Act Compliance: {analysis.eu_ai_act_compliance.score}%
                          </h4>
                          <Progress value={analysis.eu_ai_act_compliance.score} className="h-1.5 mb-2" />
                          {analysis.eu_ai_act_compliance.gaps.length > 0 && (
                            <div className="space-y-0.5">
                              {analysis.eu_ai_act_compliance.gaps.map((gap, i) => (
                                <div key={i} className="flex items-center gap-1 text-[10px] text-orange-600">
                                  <AlertTriangle className="h-2.5 w-2.5" /> {gap}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {analysis.recommendations?.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <h4 className="text-xs font-semibold mb-2">Recomendaciones priorizadas</h4>
                          {analysis.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5 p-1.5 rounded bg-muted/30">
                              <Badge variant="outline" className="text-[10px] shrink-0">P{rec.priority}</Badge>
                              <div>
                                <p className="text-xs">{rec.action}</p>
                                <p className="text-[10px] text-muted-foreground">Impacto: {rec.impact}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {analysis.executive_summary && (
                      <Card>
                        <CardContent className="p-3">
                          <h4 className="text-xs font-semibold mb-1">Resumen ejecutivo</h4>
                          <p className="text-xs text-muted-foreground">{analysis.executive_summary}</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {!analysis && !loading && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Pulsa el botón para ejecutar un análisis completo de gobernanza IA
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRAIGovernancePanel;
