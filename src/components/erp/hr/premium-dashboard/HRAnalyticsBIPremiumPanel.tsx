/**
 * HRAnalyticsBIPremiumPanel — P12
 * Executive Analytics & BI Dashboard for all Premium HR modules
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, Shield, Brain, Sparkles, FileText, Loader2, Maximize2,
  Minimize2, Activity, Lightbulb, Download, Eye
} from 'lucide-react';
import {
  useHRAnalyticsBIPremium,
  PREMIUM_MODULES,
  type BIKpi,
  type BIModuleHealth,
  type BICrossModuleInsight,
} from '@/hooks/admin/hr/useHRAnalyticsBIPremium';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  success: 'text-green-600 bg-green-500/10 border-green-500/20',
  warning: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  danger: 'text-destructive bg-destructive/10 border-destructive/20',
  info: 'text-primary bg-primary/10 border-primary/20',
};

const INSIGHT_ICON: Record<string, React.ReactNode> = {
  correlation: <Activity className="h-4 w-4" />,
  anomaly: <AlertTriangle className="h-4 w-4" />,
  prediction: <Brain className="h-4 w-4" />,
  recommendation: <Lightbulb className="h-4 w-4" />,
};

function ScoreGauge({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-destructive';
  const bg = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card">
      <div className={cn("p-2 rounded-lg bg-muted", color)}>{icon}</div>
      <span className={cn("text-2xl font-bold tabular-nums", color)}>{score}</span>
      <Progress value={score} className={cn("h-1.5 w-full [&>div]:", bg)} />
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: BIKpi }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
  const trendColor = kpi.trend === 'up'
    ? (kpi.severity === 'danger' ? 'text-destructive' : 'text-green-600')
    : kpi.trend === 'down'
    ? (kpi.severity === 'danger' ? 'text-green-600' : 'text-amber-600')
    : 'text-muted-foreground';

  return (
    <div className={cn("p-3 rounded-xl border", SEVERITY_STYLE[kpi.severity] || SEVERITY_STYLE.info)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium truncate">{kpi.label}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{kpi.module}</Badge>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold tabular-nums">{kpi.value.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground mb-0.5">{kpi.unit}</span>
      </div>
      <div className={cn("flex items-center gap-1 mt-1 text-xs", trendColor)}>
        <TrendIcon className="h-3 w-3" />
        <span>{kpi.trendPercent > 0 ? '+' : ''}{kpi.trendPercent}%</span>
      </div>
    </div>
  );
}

function ModuleHealthRow({ health }: { health: BIModuleHealth }) {
  const mod = PREMIUM_MODULES.find(m => m.key === health.module);
  const scoreColor = health.score >= 80 ? 'text-green-600' : health.score >= 60 ? 'text-amber-600' : 'text-destructive';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: mod?.color || '#666' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{health.label}</span>
          <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>{health.score}%</span>
        </div>
        <Progress value={health.score} className="h-1 mt-1" />
        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>{health.activeItems} activos</span>
          <span>{health.pendingItems} pendientes</span>
          {health.alerts > 0 && (
            <span className="text-destructive font-medium">{health.alerts} alertas</span>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: BICrossModuleInsight }) {
  const severityStyle = insight.severity === 'critical'
    ? 'border-destructive/30 bg-destructive/5'
    : insight.severity === 'warning'
    ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-primary/20 bg-primary/5';

  return (
    <div className={cn("p-3 rounded-lg border", severityStyle)}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{INSIGHT_ICON[insight.type] || <Sparkles className="h-4 w-4" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{insight.title}</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1">{insight.confidence}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
          {insight.suggestedAction && (
            <p className="text-xs text-primary mt-1 font-medium">→ {insight.suggestedAction}</p>
          )}
          <div className="flex gap-1 mt-2">
            {insight.relatedModules.map(m => (
              <Badge key={m} variant="secondary" className="text-[9px] h-4">{m}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HRAnalyticsBIPremiumPanel({ companyId, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const {
    isLoading, dashboard, executiveReport, error, lastRefresh,
    refresh, generateExecutiveReport, runPredictiveAnalysis,
    startAutoRefresh, stopAutoRefresh,
  } = useHRAnalyticsBIPremium();

  useEffect(() => {
    if (companyId) {
      startAutoRefresh(companyId, 120000);
    }
    return () => stopAutoRefresh();
  }, [companyId]);

  const handleRefresh = useCallback(() => {
    if (companyId) refresh(companyId);
  }, [companyId, refresh]);

  const handleReport = useCallback(async () => {
    if (!companyId) return;
    setIsGeneratingReport(true);
    await generateExecutiveReport(companyId);
    setIsGeneratingReport(false);
  }, [companyId, generateExecutiveReport]);

  // ── Inactive state ──
  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para activar Analytics BI</p>
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
      <CardHeader className="pb-2 bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-emerald-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Analytics & BI Premium</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Cargando datos...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReport} disabled={isGeneratingReport} className="h-8 w-8">
              {isGeneratingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="modules" className="text-xs">Módulos</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
            <TabsTrigger value="report" className="text-xs">Informe</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[420px]"}>
              {isLoading && !dashboard ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : dashboard ? (
                <div className="space-y-4">
                  {/* Score gauges */}
                  <div className="grid grid-cols-5 gap-2">
                    <ScoreGauge label="Salud Global" score={dashboard.overallHealth} icon={<Activity className="h-4 w-4" />} />
                    <ScoreGauge label="Seguridad" score={dashboard.securityScore} icon={<Shield className="h-4 w-4" />} />
                    <ScoreGauge label="Cumplimiento" score={dashboard.complianceScore} icon={<CheckCircle className="h-4 w-4" />} />
                    <ScoreGauge label="Equidad" score={dashboard.fairnessScore} icon={<TrendingUp className="h-4 w-4" />} />
                    <ScoreGauge label="Riesgo" score={100 - dashboard.riskScore} icon={<AlertTriangle className="h-4 w-4" />} />
                  </div>

                  {/* KPI grid */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">KPIs Principales</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {dashboard.kpis.slice(0, 8).map(kpi => (
                        <KpiCard key={kpi.id} kpi={kpi} />
                      ))}
                    </div>
                  </div>

                  {/* Top insights */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Insights Críticos</h3>
                    <div className="space-y-2">
                      {dashboard.insights
                        .filter(i => i.severity !== 'info')
                        .slice(0, 3)
                        .map(insight => (
                          <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay datos disponibles
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Modules Tab ── */}
          <TabsContent value="modules" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[420px]"}>
              {dashboard?.moduleHealth ? (
                <div className="space-y-2">
                  {dashboard.moduleHealth.map(health => (
                    <ModuleHealthRow key={health.module} health={health} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'Sin datos de módulos'}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Insights Tab ── */}
          <TabsContent value="insights" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[420px]"}>
              {dashboard?.insights ? (
                <div className="space-y-2">
                  {dashboard.insights.map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'Sin insights'}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Report Tab ── */}
          <TabsContent value="report" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[420px]"}>
              {executiveReport ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{executiveReport.title}</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {new Date(executiveReport.generatedAt).toLocaleDateString('es')}
                    </Badge>
                  </div>
                  {executiveReport.sections.map((section, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <h4 className="text-sm font-medium mb-2">{section.title}</h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Genera un informe ejecutivo con IA
                  </p>
                  <Button onClick={handleReport} disabled={isGeneratingReport} className="gap-2">
                    {isGeneratingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generar Informe Ejecutivo
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRAnalyticsBIPremiumPanel;
