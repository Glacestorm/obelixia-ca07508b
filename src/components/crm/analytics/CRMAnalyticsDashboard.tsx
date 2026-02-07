import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  Activity,
  Users,
  DollarSign,
  Sparkles,
  Filter,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useCRMAdvancedAnalytics } from '@/hooks/crm/analytics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface CRMAnalyticsDashboardProps {
  companyId?: string;
  className?: string;
}

export function CRMAnalyticsDashboard({ companyId, className }: CRMAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const {
    isLoading,
    dashboards,
    metrics,
    predictions,
    cohorts,
    funnels,
    error,
    lastRefresh,
    fetchDashboards,
    fetchMetrics,
    fetchPredictions,
    fetchCohorts,
    fetchFunnels,
    generateAIAnalysis,
    runPredictiveAnalysis,
    generateFunnelAnalysis,
    generateCohortAnalysis,
    startAutoRefresh,
    stopAutoRefresh
  } = useCRMAdvancedAnalytics();

  useEffect(() => {
    fetchDashboards();
    fetchMetrics();
    fetchPredictions();
    fetchCohorts();
    fetchFunnels();
    startAutoRefresh(300000);

    return () => stopAutoRefresh();
  }, []);

  const handleGenerateExecutiveSummary = useCallback(async () => {
    const result = await generateAIAnalysis('executive_summary', {
      companyId: companyId || '',
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    });
    if (result) setExecutiveSummary(result);
  }, [generateAIAnalysis, companyId]);

  const handleGenerateTrends = useCallback(async () => {
    const result = await generateAIAnalysis('trend_analysis', {
      companyId: companyId || '',
      timeRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    });
    if (result) setTrendAnalysis(result);
  }, [generateAIAnalysis, companyId]);

  const handleGenerateRecommendations = useCallback(async () => {
    const result = await generateAIAnalysis('recommendations', {
      companyId: companyId || ''
    });
    if (result) setRecommendations(result);
  }, [generateAIAnalysis, companyId]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500 bg-green-500/10';
      case 'good': return 'text-blue-500 bg-blue-500/10';
      case 'at_risk': return 'text-amber-500 bg-amber-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                CRM Advanced Analytics
                <Badge variant="outline" className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateExecutiveSummary}
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Resumen Ejecutivo
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                fetchDashboards();
                fetchMetrics();
              }}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-4", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">Métricas</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predicciones</TabsTrigger>
            <TabsTrigger value="funnels" className="text-xs">Funnels</TabsTrigger>
            <TabsTrigger value="cohorts" className="text-xs">Cohortes</TabsTrigger>
          </TabsList>

          <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {executiveSummary?.summary ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{executiveSummary.summary.headline}</h3>
                      <Badge className={getStatusColor(executiveSummary.healthStatus)}>
                        {executiveSummary.healthStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {executiveSummary.performanceScore}
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      <Progress value={executiveSummary.performanceScore} className="flex-1" />
                    </div>
                    {executiveSummary.summary.keyMetrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {executiveSummary.summary.keyMetrics.map((m: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-background/50">
                            <div className="text-xs text-muted-foreground">{m.name}</div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{m.value}</span>
                              {getTrendIcon(m.trend)}
                              <span className={cn(
                                "text-xs",
                                m.change > 0 ? "text-green-500" : m.change < 0 ? "text-red-500" : ""
                              )}>
                                {m.change > 0 ? '+' : ''}{m.change}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {executiveSummary.summary.recommendations && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Recomendaciones
                      </h4>
                      {executiveSummary.summary.recommendations.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border bg-card flex items-start gap-3">
                          <Badge variant={r.priority === 'high' ? 'destructive' : 'secondary'}>
                            {r.priority}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{r.action}</div>
                            <div className="text-xs text-muted-foreground">{r.expectedImpact}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Genera un resumen ejecutivo con IA
                  </p>
                  <Button onClick={handleGenerateExecutiveSummary} disabled={isLoading}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Resumen
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* METRICS TAB */}
            <TabsContent value="metrics" className="mt-0 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Métricas Calculadas</h4>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtrar
                </Button>
              </div>
              {metrics.length > 0 ? (
                <div className="grid gap-3">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{metric.metric_name}</div>
                          <div className="text-xs text-muted-foreground">{metric.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {metric.current_value?.toLocaleString() ?? '-'}
                            </span>
                            {metric.unit && <span className="text-xs text-muted-foreground">{metric.unit}</span>}
                          </div>
                          {metric.trend && (
                            <div className="flex items-center justify-end gap-1">
                              {getTrendIcon(metric.trend)}
                              <span className={cn(
                                "text-xs",
                                (metric.trend_percentage ?? 0) > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {(metric.trend_percentage ?? 0) > 0 ? '+' : ''}{metric.trend_percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {metric.target_value && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progreso hacia objetivo</span>
                            <span>{((metric.current_value ?? 0) / metric.target_value * 100).toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={Math.min(100, ((metric.current_value ?? 0) / metric.target_value * 100))} 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No hay métricas configuradas
                </div>
              )}
            </TabsContent>

            {/* PREDICTIONS TAB */}
            <TabsContent value="predictions" className="mt-0 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Análisis Predictivo</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => runPredictiveAnalysis('deal_forecast', 'deal')}
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Ejecutar Predicción
                </Button>
              </div>
              {predictions.length > 0 ? (
                <div className="grid gap-3">
                  {predictions.map((pred) => (
                    <div key={pred.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{pred.analysis_type}</Badge>
                        <Badge variant={pred.confidence_level && pred.confidence_level > 70 ? 'default' : 'secondary'}>
                          {pred.confidence_level}% confianza
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">Score de predicción</div>
                          <div className="text-2xl font-bold">{pred.prediction_score ?? '-'}</div>
                        </div>
                        {pred.predicted_value && (
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Valor proyectado</div>
                            <div className="text-lg font-semibold text-primary">
                              ${pred.predicted_value.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                      {pred.risk_factors && pred.risk_factors.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground mb-2">Factores de riesgo</div>
                          <div className="flex flex-wrap gap-1">
                            {pred.risk_factors.slice(0, 3).map((rf, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {rf.factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No hay predicciones recientes
                </div>
              )}
            </TabsContent>

            {/* FUNNELS TAB */}
            <TabsContent value="funnels" className="mt-0 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Análisis de Funnels</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateFunnelAnalysis(
                    'sales',
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    new Date().toISOString().split('T')[0]
                  )}
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Analizar Funnel
                </Button>
              </div>
              {funnels.length > 0 ? (
                <div className="space-y-4">
                  {funnels.map((funnel) => (
                    <div key={funnel.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{funnel.funnel_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {funnel.funnel_type} • {funnel.analysis_period_start} a {funnel.analysis_period_end}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {funnel.overall_conversion_rate?.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Conversión global</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {funnel.stages?.map((stage, i) => (
                          <div key={i} className="flex-1 text-center">
                            <div className="text-xs text-muted-foreground truncate">{stage.name}</div>
                            <div className="font-semibold">{stage.count}</div>
                            <div className="text-xs text-green-500">{stage.conversion_rate}%</div>
                          </div>
                        ))}
                      </div>
                      {funnel.bottleneck_stage && (
                        <div className="mt-3 p-2 bg-amber-500/10 rounded flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm">
                            Cuello de botella: <strong>{funnel.bottleneck_stage}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No hay análisis de funnels
                </div>
              )}
            </TabsContent>

            {/* COHORTS TAB */}
            <TabsContent value="cohorts" className="mt-0 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Análisis de Cohortes</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateCohortAnalysis('retention', 'monthly')}
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Analizar Cohortes
                </Button>
              </div>
              {cohorts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Cohorte</th>
                        <th className="text-center p-2">Total</th>
                        <th className="text-center p-2">Activos</th>
                        <th className="text-center p-2">Retención</th>
                        <th className="text-center p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.slice(0, 10).map((cohort) => (
                        <tr key={cohort.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{cohort.cohort_date}</td>
                          <td className="text-center p-2">{cohort.total_entities}</td>
                          <td className="text-center p-2">{cohort.active_entities}</td>
                          <td className="text-center p-2">
                            <Badge variant={
                              (cohort.retention_rate ?? 0) > 70 ? 'default' : 
                              (cohort.retention_rate ?? 0) > 40 ? 'secondary' : 
                              'destructive'
                            }>
                              {cohort.retention_rate?.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="text-center p-2 font-medium">
                            ${cohort.metric_value?.toLocaleString() ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No hay análisis de cohortes
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CRMAnalyticsDashboard;
