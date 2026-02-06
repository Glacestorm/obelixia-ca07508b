/**
 * CrossModuleAnalyticsPanel
 * Dashboard Unificado de Analítica Cross-Module
 * Fase 10 - Enterprise SaaS 2025-2026
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Brain, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  Sparkles,
  Download,
  BarChart3,
  LineChart,
  Lightbulb,
  MessageSquare,
  Network,
  Activity,
  Users,
  Scale,
  Calculator,
  Wallet,
  Package,
  ShoppingCart,
  Receipt,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useCrossModuleAnalytics, type CrossModuleContext, type ERPModuleId } from '@/hooks/admin/enterprise/useCrossModuleAnalytics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface CrossModuleAnalyticsPanelProps {
  context?: CrossModuleContext;
  className?: string;
}

const MODULE_ICONS: Record<ERPModuleId, React.ReactNode> = {
  hr: <Users className="h-4 w-4" />,
  legal: <Scale className="h-4 w-4" />,
  accounting: <Calculator className="h-4 w-4" />,
  treasury: <Wallet className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  sales: <ShoppingCart className="h-4 w-4" />,
  purchasing: <Receipt className="h-4 w-4" />,
  tax: <Receipt className="h-4 w-4" />,
};

const MODULE_COLORS: Record<ERPModuleId, string> = {
  hr: 'from-blue-500 to-blue-600',
  legal: 'from-purple-500 to-purple-600',
  accounting: 'from-green-500 to-green-600',
  treasury: 'from-amber-500 to-amber-600',
  inventory: 'from-cyan-500 to-cyan-600',
  sales: 'from-rose-500 to-rose-600',
  purchasing: 'from-indigo-500 to-indigo-600',
  tax: 'from-orange-500 to-orange-600',
};

export function CrossModuleAnalyticsPanel({ 
  context = { modules: ['hr', 'legal', 'accounting', 'treasury', 'sales'] },
  className 
}: CrossModuleAnalyticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('executive');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const {
    isLoading,
    moduleKPIs,
    moduleSummaries,
    correlations,
    alerts,
    activeAlerts,
    criticalAlerts,
    predictions,
    insights,
    executiveSummary,
    error,
    lastRefresh,
    fetchUnifiedDashboard,
    generateCrossModuleInsights,
    analyzeCorrelations,
    generateExecutiveBriefing,
    askCrossModuleQuestion,
    exportUnifiedReport,
    acknowledgeAlert,
    startAutoRefresh,
    stopAutoRefresh
  } = useCrossModuleAnalytics();

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    startAutoRefresh(context, 120000);
    return () => stopAutoRefresh();
  }, [context.companyId]);

  const handleRefresh = useCallback(async () => {
    await fetchUnifiedDashboard(context);
  }, [context, fetchUnifiedDashboard]);

  const handleAskQuestion = useCallback(async () => {
    if (!question.trim()) {
      toast.error('Escribe una pregunta');
      return;
    }
    setIsAsking(true);
    setAiAnswer(null);
    const answer = await askCrossModuleQuestion(question, context);
    if (answer) {
      setAiAnswer(typeof answer === 'string' ? answer : answer.answer || JSON.stringify(answer));
    }
    setIsAsking(false);
  }, [question, context, askCrossModuleQuestion]);

  const handleExport = useCallback(async (format: 'pdf' | 'excel' | 'pptx') => {
    await exportUnifiedReport(format);
  }, [exportUnifiedReport]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <span className="text-muted-foreground">—</span>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-yellow-500 text-black';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-destructive';
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Analítica Cross-Module
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalAlerts.length} críticas
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleExport('excel')}
              className="h-8 w-8"
              title="Exportar Excel"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
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

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {error ? (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {error}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 mb-3">
              <TabsTrigger value="executive" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Ejecutivo
              </TabsTrigger>
              <TabsTrigger value="modules" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Módulos
              </TabsTrigger>
              <TabsTrigger value="correlations" className="text-xs">
                <Network className="h-3 w-3 mr-1" />
                Correlaciones
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="predictions" className="text-xs">
                <LineChart className="h-3 w-3 mr-1" />
                Predicciones
              </TabsTrigger>
              <TabsTrigger value="ask" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                IA
              </TabsTrigger>
            </TabsList>

            {/* EXECUTIVE TAB */}
            <TabsContent value="executive" className="flex-1 mt-0">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
                {executiveSummary ? (
                  <div className="space-y-4">
                    {/* Health Score Card */}
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Health Score Global</span>
                        {getTrendIcon(executiveSummary.trend)}
                      </div>
                      <div className="flex items-end gap-3">
                        <span className={cn("text-4xl font-bold", getHealthColor(executiveSummary.overallHealthScore))}>
                          {executiveSummary.overallHealthScore}
                        </span>
                        <span className="text-muted-foreground mb-1">/100</span>
                      </div>
                      <Progress value={executiveSummary.overallHealthScore} className="mt-2" />
                    </div>

                    {/* KPIs Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="text-xl font-bold">€{(executiveSummary.totalRevenue / 1000).toFixed(0)}K</p>
                        <p className={cn("text-xs", executiveSummary.revenueGrowth >= 0 ? "text-green-600" : "text-destructive")}>
                          {executiveSummary.revenueGrowth >= 0 ? '+' : ''}{executiveSummary.revenueGrowth}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground">Costes</p>
                        <p className="text-xl font-bold">€{(executiveSummary.totalCosts / 1000).toFixed(0)}K</p>
                        <p className={cn("text-xs", executiveSummary.costReduction >= 0 ? "text-green-600" : "text-destructive")}>
                          {executiveSummary.costReduction >= 0 ? '-' : '+'}{Math.abs(executiveSummary.costReduction)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground">Empleados</p>
                        <p className="text-xl font-bold">{executiveSummary.employeeCount}</p>
                        <p className="text-xs text-muted-foreground">
                          Satisfacción: {executiveSummary.employeeSatisfaction}/10
                        </p>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground">Cumplimiento</p>
                        <p className="text-xl font-bold">{executiveSummary.complianceScore}%</p>
                        <Badge className={cn(
                          "text-xs mt-1",
                          executiveSummary.riskLevel === 'low' ? 'bg-green-500' :
                          executiveSummary.riskLevel === 'medium' ? 'bg-yellow-500 text-black' :
                          'bg-destructive'
                        )}>
                          Riesgo {executiveSummary.riskLevel}
                        </Badge>
                      </div>
                    </div>

                    {/* Top Priorities */}
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-sm font-medium mb-2">🎯 Prioridades</p>
                      <ul className="space-y-1">
                        {executiveSummary.topPriorities?.map((priority, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <ArrowRight className="h-3 w-3 mt-0.5 text-primary" />
                            {priority}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Insights */}
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-sm font-medium mb-2">💡 Insights Clave</p>
                      <ul className="space-y-1">
                        {executiveSummary.keyInsights?.map((insight, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">
                            • {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2" />
                    <p className="text-sm">Cargando resumen ejecutivo...</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* MODULES TAB */}
            <TabsContent value="modules" className="flex-1 mt-0">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
                <div className="space-y-3">
                  {moduleSummaries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2" />
                      <p className="text-sm">Cargando módulos...</p>
                    </div>
                  ) : (
                    moduleSummaries.map((module) => (
                      <div key={module.moduleId} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-md bg-gradient-to-br text-white",
                              MODULE_COLORS[module.moduleId as ERPModuleId] || 'from-gray-500 to-gray-600'
                            )}>
                              {MODULE_ICONS[module.moduleId as ERPModuleId]}
                            </div>
                            <span className="text-sm font-medium">{module.moduleName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(module.trend)}
                            <span className={cn("text-lg font-bold", getHealthColor(module.healthScore))}>
                              {module.healthScore}
                            </span>
                          </div>
                        </div>
                        <Progress value={module.healthScore} className="h-1.5 mb-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Cumplimiento: {module.complianceScore}%</span>
                          <span>{module.activeAlerts} alertas · {module.pendingTasks} tareas</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CORRELATIONS TAB */}
            <TabsContent value="correlations" className="flex-1 mt-0">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => analyzeCorrelations()}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Network className="h-4 w-4 mr-2" />
                    Analizar Correlaciones con IA
                  </Button>

                  {correlations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Network className="h-8 w-8 mb-2" />
                      <p className="text-sm">Sin correlaciones analizadas</p>
                    </div>
                  ) : (
                    correlations.map((corr) => (
                      <div key={corr.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "p-1 rounded bg-gradient-to-br text-white",
                            MODULE_COLORS[corr.sourceModule as ERPModuleId]
                          )}>
                            {MODULE_ICONS[corr.sourceModule as ERPModuleId]}
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className={cn(
                            "p-1 rounded bg-gradient-to-br text-white",
                            MODULE_COLORS[corr.targetModule as ERPModuleId]
                          )}>
                            {MODULE_ICONS[corr.targetModule as ERPModuleId]}
                          </div>
                          <Badge variant={corr.significance === 'high' ? 'destructive' : 'secondary'}>
                            r = {corr.correlationCoefficient.toFixed(2)}
                          </Badge>
                          {corr.predictiveValue && (
                            <Badge variant="outline" className="text-xs">Predictivo</Badge>
                          )}
                        </div>
                        <p className="text-xs mb-1">
                          <span className="font-medium">{corr.sourceMetric}</span>
                          {' → '}
                          <span className="font-medium">{corr.targetMetric}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{corr.insight}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* INSIGHTS TAB */}
            <TabsContent value="insights" className="flex-1 mt-0">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => generateCrossModuleInsights(context)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Insights Cross-Module con IA
                  </Button>

                  {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mb-2" />
                      <p className="text-sm">Sin insights disponibles</p>
                    </div>
                  ) : (
                    insights.map((insight) => (
                      <div key={insight.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {insight.modules?.map((m) => (
                              <div key={m} className={cn(
                                "p-1 rounded bg-gradient-to-br text-white",
                                MODULE_COLORS[m as ERPModuleId]
                              )}>
                                {MODULE_ICONS[m as ERPModuleId]}
                              </div>
                            ))}
                          </div>
                          <Badge className={cn(
                            insight.impactLevel === 'high' ? 'bg-destructive' :
                            insight.impactLevel === 'medium' ? 'bg-yellow-500 text-black' :
                            'bg-blue-500'
                          )}>
                            {insight.impactLevel}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                        {insight.potentialSavings && (
                          <p className="text-xs text-green-600 mb-2">
                            💰 Ahorro potencial: €{insight.potentialSavings.toLocaleString()}
                          </p>
                        )}
                        {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                          <div className="text-xs text-primary">
                            {insight.suggestedActions.map((action, idx) => (
                              <p key={idx}>💡 {action}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* PREDICTIONS TAB */}
            <TabsContent value="predictions" className="flex-1 mt-0">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
                {predictions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <LineChart className="h-8 w-8 mb-2" />
                    <p className="text-sm">Sin predicciones disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictions.map((pred) => (
                      <div key={pred.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1 rounded bg-gradient-to-br text-white",
                              MODULE_COLORS[pred.moduleId as ERPModuleId]
                            )}>
                              {MODULE_ICONS[pred.moduleId as ERPModuleId]}
                            </div>
                            <span className="text-sm font-medium">{pred.metric}</span>
                          </div>
                          <Badge variant="outline">
                            {Math.round(pred.confidence * 100)}% confianza
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Actual</p>
                            <p className="text-lg font-semibold">{pred.currentValue.toLocaleString()}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Predicción</p>
                            <p className={cn(
                              "text-lg font-semibold",
                              pred.predictedValue > pred.currentValue ? "text-green-600" : "text-destructive"
                            )}>
                              {pred.predictedValue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Horizonte: {pred.timeHorizon} · Escenario: {pred.scenario}
                        </p>
                        {pred.factors && pred.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pred.factors.slice(0, 3).map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor.direction === 'positive' ? '↑' : '↓'} {factor.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ASK IA TAB */}
            <TabsContent value="ask" className="flex-1 mt-0">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Pregunta Cross-Module</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Haz preguntas que involucren datos de múltiples módulos.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: ¿Cómo afecta el coste laboral al cashflow?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAskQuestion}
                      disabled={isAsking || !question.trim()}
                    >
                      {isAsking ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {aiAnswer && (
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Respuesta IA</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnswer}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-2">Ejemplos de preguntas cross-module:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>¿Cuál es la correlación entre rotación de personal y calidad de entregas?</li>
                    <li>¿Cómo impactan los retrasos de proveedores en las ventas?</li>
                    <li>¿Qué departamentos generan más costes vs. ingresos?</li>
                    <li>¿Cuál es el riesgo fiscal combinado de RRHH y Compras?</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Active Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="mt-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">{activeAlerts.length} Alertas Activas</span>
              </div>
            </div>
            <div className="space-y-1">
              {activeAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                      {alert.severity}
                    </Badge>
                    <span>{alert.title}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="h-6 px-2"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CrossModuleAnalyticsPanel;
