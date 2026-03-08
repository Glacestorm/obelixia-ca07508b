/**
 * HRESGSelfServicePanel - Phase 7: ESG Social + Self-Service Portal
 * Dashboard with ESG social metrics, employee self-service, surveys, and AI analysis
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  RefreshCw, Sparkles, Leaf, Users, FileQuestion, BarChart3,
  TrendingUp, TrendingDown, Minus, ClipboardList, MessageSquare,
  ChevronRight, Target, AlertTriangle, CheckCircle, Search, Database
} from 'lucide-react';
import { useHRESGSelfService } from '@/hooks/admin/hr/useHRESGSelfService';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRESGSelfServicePanelProps {
  companyId: string;
}

export function HRESGSelfServicePanel({ companyId }: HRESGSelfServicePanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchFaq, setSearchFaq] = useState('');

  const {
    metrics, kpis, faqs, surveys, analysis, stats,
    loading, analysisLoading,
    fetchMetrics, fetchKPIs, seedDemo, runESGAnalysis,
  } = useHRESGSelfService(companyId);

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    if (trend === 'worsening') return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      on_track: { variant: 'default', label: 'En objetivo' },
      improving: { variant: 'default', label: 'Mejorando' },
      at_risk: { variant: 'destructive', label: 'En riesgo' },
      critical: { variant: 'destructive', label: 'Crítico' },
    };
    const s = map[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>;
  };

  const filteredFaqs = faqs.filter(f =>
    searchFaq === '' ||
    f.question.toLowerCase().includes(searchFaq.toLowerCase()) ||
    f.tags.some(t => t.toLowerCase().includes(searchFaq.toLowerCase()))
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchMetrics(), fetchKPIs()]);
  }, [fetchMetrics, fetchKPIs]);

  const categoryGroups = metrics.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, typeof metrics>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">ESG Social & Self-Service</h2>
            <p className="text-sm text-muted-foreground">Métricas sociales, portal del empleado y asistente IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={seedDemo} disabled={loading}>
            <Database className="h-4 w-4 mr-1" />
            Demo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Métricas ESG', value: stats.totalMetrics, icon: BarChart3, color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20' },
          { label: 'Mejorando', value: stats.improvingMetrics, icon: TrendingUp, color: 'from-green-500/15 to-green-600/5 border-green-500/20' },
          { label: 'Progreso KPI', value: `${stats.avgKPIProgress}%`, icon: Target, color: 'from-blue-500/15 to-blue-600/5 border-blue-500/20' },
          { label: 'Encuestas', value: stats.activeSurveys, icon: ClipboardList, color: 'from-purple-500/15 to-purple-600/5 border-purple-500/20' },
          { label: 'FAQs', value: stats.totalFAQs, icon: FileQuestion, color: 'from-amber-500/15 to-amber-600/5 border-amber-500/20' },
          { label: 'Solicitudes', value: stats.pendingRequests, icon: MessageSquare, color: 'from-red-500/15 to-red-600/5 border-red-500/20' },
        ].map(kpi => (
          <Card key={kpi.label} className={cn("bg-gradient-to-br", kpi.color)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs">KPIs ESG</TabsTrigger>
          <TabsTrigger value="surveys" className="text-xs">Encuestas</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs">Portal Empleado</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW === */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(categoryGroups).map(([cat, items]) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-500" />
                    {cat.replace('_', ' ')}
                    <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        {trendIcon(m.trend)}
                        <span className="text-sm">{m.metric_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{m.metric_value}{m.unit === '%' ? '%' : ` ${m.unit}`}</span>
                        {m.target_value != null && (
                          <span className="text-xs text-muted-foreground">/ {m.target_value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            {metrics.length === 0 && (
              <Card className="col-span-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Leaf className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Sin datos ESG Social. Pulsa "Demo" para cargar datos de ejemplo.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* === KPIs === */}
        <TabsContent value="kpis">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                KPIs ESG Social — Marcos GRI / ESRS / SASB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {kpis.map(kpi => {
                    const progress = kpi.target_value > 0 ? Math.min(100, (kpi.current_value / kpi.target_value) * 100) : 0;
                    const change = kpi.previous_value > 0 ? ((kpi.current_value - kpi.previous_value) / kpi.previous_value * 100).toFixed(1) : '0';
                    return (
                      <div key={kpi.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">{kpi.kpi_code}</Badge>
                              <span className="font-medium text-sm">{kpi.kpi_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{kpi.framework}</Badge>
                              {kpi.gri_disclosure && (
                                <span className="text-xs text-muted-foreground">{kpi.gri_disclosure}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {statusBadge(kpi.status)}
                            <div className="mt-1">
                              <span className="text-lg font-bold">{kpi.current_value}</span>
                              <span className="text-xs text-muted-foreground ml-1">{kpi.unit}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(progress)}%</span>
                          <span className={cn("text-xs font-medium", Number(change) >= 0 ? "text-emerald-600" : "text-destructive")}>
                            {Number(change) >= 0 ? '+' : ''}{change}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {kpis.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Sin KPIs configurados
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SURVEYS === */}
        <TabsContent value="surveys">
          <div className="space-y-4">
            {surveys.map(survey => (
              <Card key={survey.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                      {survey.status === 'active' ? 'Activa' : survey.status}
                    </Badge>
                  </div>
                  {survey.description && <p className="text-sm text-muted-foreground">{survey.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{survey.response_count}</p>
                      <p className="text-xs text-muted-foreground">Respuestas</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">{survey.avg_score}</p>
                      <p className="text-xs text-muted-foreground">Puntuación Media</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {(survey.results as any)?.participation || 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Participación</p>
                    </div>
                  </div>
                  {(survey.results as any)?.topStrengths && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Fortalezas
                        </p>
                        {((survey.results as any).topStrengths as string[]).map((s, i) => (
                          <div key={i} className="text-sm flex items-center gap-1 py-0.5">
                            <ChevronRight className="h-3 w-3 text-emerald-500" />
                            {s}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Áreas de Mejora
                        </p>
                        {((survey.results as any).topWeaknesses as string[] || []).map((w, i) => (
                          <div key={i} className="text-sm flex items-center gap-1 py-0.5">
                            <ChevronRight className="h-3 w-3 text-amber-500" />
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {surveys.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Sin encuestas. Carga datos demo para ver ejemplo.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* === FAQ / SELF-SERVICE === */}
        <TabsContent value="faq">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-amber-500" />
                Portal del Empleado — Preguntas Frecuentes
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pregunta o tema..."
                  value={searchFaq}
                  onChange={e => setSearchFaq(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  {filteredFaqs.map(faq => (
                    <div key={faq.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{faq.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">{faq.category}</Badge>
                            {faq.tags.slice(0, 3).map(t => (
                              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredFaqs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {searchFaq ? 'Sin resultados para tu búsqueda' : 'Sin FAQs disponibles'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === AI ANALYSIS === */}
        <TabsContent value="ai">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Análisis IA — ESG Social
                </CardTitle>
                <Button onClick={runESGAnalysis} disabled={analysisLoading} size="sm">
                  <Sparkles className={cn("h-4 w-4 mr-1", analysisLoading && "animate-pulse")} />
                  {analysisLoading ? 'Analizando...' : 'Ejecutar Análisis'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {/* Score */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-emerald-600">{analysis.overallScore}</p>
                        <p className="text-xs text-muted-foreground">Puntuación Global</p>
                      </div>
                      <div>
                        <Badge className="text-lg px-3 py-1">{analysis.rating}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">Rating ESG Social</p>
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Dimensiones</h4>
                      <div className="space-y-2">
                        {analysis.dimensions?.map((d, i) => (
                          <div key={i} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{d.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{d.score}</span>
                                {statusBadge(d.status)}
                              </div>
                            </div>
                            <Progress value={d.score} className="h-1.5 mb-2" />
                            {d.recommendations?.slice(0, 2).map((r, j) => (
                              <p key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />{r}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risks */}
                    {analysis.risks?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Riesgos Identificados</h4>
                        <div className="space-y-2">
                          {analysis.risks.map((r, i) => (
                            <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10 flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{r.area}</span>
                                  <Badge variant={r.level === 'high' ? 'destructive' : 'secondary'} className="text-xs">{r.level}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{r.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Plan */}
                    {analysis.actionPlan?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Plan de Acción</h4>
                        <div className="space-y-2">
                          {analysis.actionPlan.map((a, i) => (
                            <div key={i} className="p-2 rounded-lg border flex items-start gap-2">
                              <Badge variant={a.priority === 'high' ? 'destructive' : a.priority === 'medium' ? 'default' : 'secondary'} className="text-xs shrink-0 mt-0.5">
                                {a.priority}
                              </Badge>
                              <div>
                                <p className="text-sm">{a.action}</p>
                                <p className="text-xs text-muted-foreground">{a.timeline}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-16 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Pulsa "Ejecutar Análisis" para obtener insights IA sobre métricas ESG Social</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRESGSelfServicePanel;
