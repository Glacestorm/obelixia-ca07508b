/**
 * Panel de Agente IA para Pipeline
 * Muestra análisis, predicciones y recomendaciones inteligentes
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Sparkles, 
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Maximize2,
  Minimize2,
  Trophy,
  Shield
} from 'lucide-react';
import { usePipelineAgent, NextBestAction, RiskDetection, FullAnalysis } from '@/hooks/usePipelineAgent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  proposal: FileText,
  follow_up: MessageSquare,
  escalate: AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-50 dark:bg-red-950',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
  medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
};

interface PipelineAgentPanelProps {
  className?: string;
  onOpportunitySelect?: (id: string) => void;
  autoStart?: boolean;
}

export function PipelineAgentPanel({ 
  className, 
  onOpportunitySelect,
  autoStart = true 
}: PipelineAgentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [nbas, setNbas] = useState<NextBestAction[]>([]);
  const [risks, setRisks] = useState<RiskDetection | null>(null);

  const {
    isLoading,
    lastAnalysis,
    lastRefresh,
    error,
    getFullAnalysis,
    suggestActions,
    detectRisks,
  } = usePipelineAgent();

  // Initial load
  useEffect(() => {
    if (autoStart) {
      loadAll();
    }
  }, [autoStart]);

  const loadAll = useCallback(async () => {
    const [analysis, actionsResult, risksResult] = await Promise.all([
      getFullAnalysis(),
      suggestActions(),
      detectRisks(),
    ]);
    
    if (actionsResult?.next_best_actions) {
      setNbas(actionsResult.next_best_actions);
    }
    if (risksResult) {
      setRisks(risksResult);
    }
  }, [getFullAnalysis, suggestActions, detectRisks]);

  const handleRefresh = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  // Render empty state
  if (!lastAnalysis && !isLoading) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-8 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium mb-2">Agente IA Pipeline</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Análisis inteligente de tu pipeline de ventas
          </p>
          <Button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Iniciar Análisis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Agente IA Pipeline
                {lastAnalysis && (
                  <Badge 
                    variant="outline" 
                    className={cn("ml-2", getHealthColor(lastAnalysis.health_score))}
                  >
                    {lastAnalysis.health_score}% salud
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs gap-1">
              <Zap className="h-3 w-3" />
              Acciones
              {nbas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px]">
                  {nbas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              Riesgos
              {risks && risks.at_risk_count > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                  {risks.at_risk_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              Forecast
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 mt-0 space-y-3">
            <div className={isExpanded ? "h-[calc(100vh-280px)] overflow-auto" : ""}>
              {lastAnalysis && (
                <div className="space-y-4 pr-2">
                  {/* Executive Summary */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm leading-relaxed">{lastAnalysis.executive_summary}</p>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Win Rate</span>
                        <span className="text-sm font-semibold text-green-600">
                          {lastAnalysis.key_metrics.win_rate}%
                        </span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Ciclo Venta</span>
                        <span className="text-sm font-semibold">
                          {lastAnalysis.key_metrics.sales_cycle_days}d
                        </span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Ticket Medio</span>
                        <span className="text-sm font-semibold">
                          €{(lastAnalysis.key_metrics.average_deal_size / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Velocidad</span>
                        <span className="text-sm font-semibold">
                          €{(lastAnalysis.key_metrics.pipeline_velocity / 1000).toFixed(0)}k/día
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Wins */}
                  {lastAnalysis.quick_wins.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        Quick Wins
                      </h4>
                      {lastAnalysis.quick_wins.slice(0, 3).map((win, idx) => (
                        <div 
                          key={idx}
                          className="p-2 rounded-lg border bg-yellow-50/50 dark:bg-yellow-950/20 cursor-pointer hover:bg-yellow-100/50 dark:hover:bg-yellow-950/40 transition-colors"
                          onClick={() => onOpportunitySelect?.(win.opportunity_id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{win.action}</span>
                            <Badge variant="outline" className="text-xs text-green-600">
                              +€{(win.value / 1000).toFixed(0)}k
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Weekly Focus */}
                  {lastAnalysis.weekly_focus_areas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Foco Semanal
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {lastAnalysis.weekly_focus_areas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isLoading && !lastAnalysis && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="flex-1 mt-0">
            <div className={isExpanded ? "h-[calc(100vh-280px)] overflow-auto" : ""}>
              <div className="space-y-2 pr-2">
                {nbas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Sin acciones pendientes</p>
                  </div>
                ) : (
                  nbas.map((action, idx) => {
                    const ActionIcon = ACTION_ICONS[action.action_type] || MessageSquare;
                    return (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => onOpportunitySelect?.(action.opportunity_id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            PRIORITY_COLORS[action.priority] + '/10'
                          )}>
                            <ActionIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {action.opportunity_title}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] shrink-0",
                                  action.priority === 'urgent' && "border-red-500 text-red-500"
                                )}
                              >
                                {action.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {action.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {action.deadline}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="flex-1 mt-0">
            <div className={isExpanded ? "h-[calc(100vh-280px)] overflow-auto" : ""}>
              <div className="space-y-3 pr-2">
                {/* Risk Summary */}
                {risks && risks.at_risk_count > 0 && (
                  <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-600">
                        {risks.at_risk_count} oportunidades en riesgo
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        €{(risks.total_value_at_risk / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                )}

                {/* Risk Items */}
                {risks?.risks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Sin oportunidades en riesgo</p>
                  </div>
                ) : (
                  risks?.risks.map((risk, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer group",
                        RISK_COLORS[risk.risk_level]
                      )}
                      onClick={() => onOpportunitySelect?.(risk.opportunity_id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{risk.opportunity_title}</span>
                        <Badge variant={risk.risk_level === 'critical' ? 'destructive' : 'outline'}>
                          {risk.risk_score}% riesgo
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {risk.signals.slice(0, 2).map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {risk.days_stalled} días sin movimiento
                        </span>
                        <span className="text-green-600">
                          {risk.save_probability}% salvable
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Prevention Tips */}
                {risks?.prevention_tips && risks.prevention_tips.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Tips de Prevención
                    </h4>
                    {risks.prevention_tips.map((tip, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground pl-4 border-l-2">
                        {tip}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="flex-1 mt-0">
            <div className={isExpanded ? "h-[calc(100vh-280px)] overflow-auto" : ""}>
              <div className="space-y-4 pr-2">
                {lastAnalysis?.forecast_summary && (
                  <>
                    {/* Forecast Bars */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Commit (&gt;90%)
                          </span>
                          <span className="font-semibold">
                            €{(lastAnalysis.forecast_summary.commit / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <Progress value={70} className="h-2 bg-green-100" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Best Case (50-90%)
                          </span>
                          <span className="font-semibold">
                            €{(lastAnalysis.forecast_summary.best_case / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <Progress value={50} className="h-2 bg-blue-100" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            Pipeline (&lt;50%)
                          </span>
                          <span className="font-semibold">
                            €{(lastAnalysis.forecast_summary.pipeline / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <Progress value={30} className="h-2 bg-gray-100" />
                      </div>
                    </div>

                    <Separator />

                    {/* Top Opportunities */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium">Top Oportunidades</h4>
                      {lastAnalysis.top_opportunities?.slice(0, 4).map((opp, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer"
                          onClick={() => onOpportunitySelect?.(opp.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{opp.title}</span>
                            <span className="text-xs text-muted-foreground">{opp.next_action}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-sm font-semibold block">
                              €{(opp.value / 1000).toFixed(0)}k
                            </span>
                            <span className="text-xs text-green-600">{opp.probability}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {isLoading && !lastAnalysis && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PipelineAgentPanel;
