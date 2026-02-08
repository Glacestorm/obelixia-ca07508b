/**
 * GaliaExecutiveDashboardPanel - Dashboard Ejecutivo con IA
 * Fase 7: Excelencia Operacional
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  X
} from 'lucide-react';
import { useGaliaExecutiveDashboard, ExecutiveKPI, StrategicInsight } from '@/hooks/galia/useGaliaExecutiveDashboard';
import { cn } from '@/lib/utils';

interface GaliaExecutiveDashboardPanelProps {
  className?: string;
}

export function GaliaExecutiveDashboardPanel({
  className
}: GaliaExecutiveDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState('kpis');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');

  const {
    isLoading,
    kpis,
    insights,
    metrics,
    report,
    loadKPIs,
    generateInsights,
    generateExecutiveReport,
    exportReport,
    dismissInsight,
    refreshDashboard
  } = useGaliaExecutiveDashboard();

  useEffect(() => {
    loadKPIs(period);
    generateInsights();
  }, [loadKPIs, generateInsights, period]);

  const getKPIStatus = (status: string) => {
    switch (status) {
      case 'exceeded': return { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: TrendingUp };
      case 'on_track': return { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle };
      case 'at_risk': return { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle };
      case 'off_track': return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: TrendingDown };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted', icon: Activity };
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'opportunity': return { icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' };
      case 'risk': return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' };
      case 'recommendation': return { icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' };
      case 'trend': return { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' };
      case 'benchmark': return { icon: Target, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' };
      default: return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Dashboard Ejecutivo</CardTitle>
              <CardDescription>Vista estratégica con IA</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Día</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refreshDashboard} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="kpis" className="text-xs">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> KPIs
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Insights ({insights.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Informes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="mt-0">
            <ScrollArea className="h-[380px]">
              {kpis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Cargando indicadores...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kpis.map((kpi) => (
                    <KPICard key={kpi.id} kpi={kpi} getKPIStatus={getKPIStatus} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <ScrollArea className="h-[380px]">
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Generando insights estratégicos...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      getInsightStyle={getInsightStyle}
                      onDismiss={() => dismissInsight(insight.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={() => generateExecutiveReport('weekly')}
                  disabled={isLoading}
                >
                  <Download className="h-6 w-6 mb-2" />
                  <span>Informe Semanal</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={() => generateExecutiveReport('monthly')}
                  disabled={isLoading}
                >
                  <Download className="h-6 w-6 mb-2" />
                  <span>Informe Mensual</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={() => generateExecutiveReport('quarterly')}
                  disabled={isLoading}
                >
                  <PieChart className="h-6 w-6 mb-2" />
                  <span>Informe Trimestral</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={() => generateExecutiveReport('annual')}
                  disabled={isLoading}
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Memoria Anual</span>
                </Button>
              </div>

              {report && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{report.reportType} Report</p>
                      <p className="text-xs text-muted-foreground">
                        Generado: {new Date(report.generatedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => exportReport(report.id, 'pdf')}>
                        PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportReport(report.id, 'excel')}>
                        Excel
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{report.summary}</p>
                  {report.highlights.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-1">Highlights:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {report.highlights.slice(0, 3).map((h, i) => (
                          <li key={i}>• {h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// KPI Card Component
function KPICard({
  kpi,
  getKPIStatus
}: {
  kpi: ExecutiveKPI;
  getKPIStatus: (status: string) => { color: string; bg: string; icon: any };
}) {
  const statusInfo = getKPIStatus(kpi.status);
  const StatusIcon = statusInfo.icon;
  const progressPercent = Math.min((kpi.currentValue / kpi.target) * 100, 100);

  return (
    <div className={cn("p-4 rounded-lg border", statusInfo.bg)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.category}</p>
          <p className="font-medium text-sm">{kpi.name}</p>
        </div>
        <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
      </div>
      
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold">{kpi.currentValue.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">{kpi.unit}</span>
        <div className={cn(
          "ml-auto flex items-center text-sm",
          kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
        )}>
          {kpi.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 mr-1" />}
          {kpi.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 mr-1" />}
          {kpi.trendPercent > 0 ? '+' : ''}{kpi.trendPercent.toFixed(1)}%
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Objetivo: {kpi.target.toLocaleString()}</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({
  insight,
  getInsightStyle,
  onDismiss
}: {
  insight: StrategicInsight;
  getInsightStyle: (type: string) => { icon: any; color: string; bg: string };
  onDismiss: () => void;
}) {
  const style = getInsightStyle(insight.insightType);
  const Icon = style.icon;

  return (
    <div className={cn("p-4 rounded-lg border", style.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-full", style.bg)}>
          <Icon className={cn("h-4 w-4", style.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                {insight.insightType}
              </Badge>
              <p className="font-medium text-sm">{insight.title}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
          <div className="mt-2 p-2 rounded bg-background/50">
            <p className="text-xs font-medium">Acción sugerida:</p>
            <p className="text-xs text-muted-foreground">{insight.suggestedAction}</p>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Confianza: {Math.round(insight.confidence * 100)}%</span>
            <span>· Impacto: {insight.impact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GaliaExecutiveDashboardPanel;
