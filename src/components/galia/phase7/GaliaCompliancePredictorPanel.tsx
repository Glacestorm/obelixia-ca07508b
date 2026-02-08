/**
 * GaliaCompliancePredictorPanel - Panel de Predicción de Cumplimiento
 * Fase 7: Excelencia Operacional
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3
} from 'lucide-react';
import { useGaliaCompliancePredictor, ComplianceRisk, PreventiveAction, ComplianceTrend } from '@/hooks/galia/useGaliaCompliancePredictor';
import { cn } from '@/lib/utils';

interface GaliaCompliancePredictorPanelProps {
  expedienteId?: string;
  convocatoriaId?: string;
  className?: string;
}

export function GaliaCompliancePredictorPanel({
  expedienteId,
  convocatoriaId,
  className
}: GaliaCompliancePredictorPanelProps) {
  const [activeTab, setActiveTab] = useState('risks');
  const [horizon, setHorizon] = useState<'week' | 'month' | 'quarter'>('month');

  const {
    isLoading,
    risks,
    forecast,
    actions,
    trends,
    predictRisks,
    generateForecast,
    getPreventiveActions,
    executeAction,
    analyzeTrends
  } = useGaliaCompliancePredictor();

  useEffect(() => {
    predictRisks({ expedienteIds: expedienteId ? [expedienteId] : undefined, horizon });
    analyzeTrends();
  }, [predictRisks, analyzeTrends, expedienteId, horizon]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const criticalRisks = risks.filter(r => r.riskLevel === 'critical').length;
  const highRisks = risks.filter(r => r.riskLevel === 'high').length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Predicción de Cumplimiento</CardTitle>
              <CardDescription>ML para anticipar riesgos</CardDescription>
            </div>
          </div>
          <Select value={horizon} onValueChange={(v: any) => setHorizon(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Risk Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{risks.length}</p>
            <p className="text-xs text-muted-foreground">Riesgos Total</p>
          </div>
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
            <p className="text-2xl font-bold text-red-600">{criticalRisks}</p>
            <p className="text-xs text-red-600/80">Críticos</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-center">
            <p className="text-2xl font-bold text-orange-600">{highRisks}</p>
            <p className="text-xs text-orange-600/80">Altos</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{actions.length}</p>
            <p className="text-xs text-muted-foreground">Acciones</p>
          </div>
        </div>

        {/* Forecast Card */}
        {forecast && (
          <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-accent/5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Pronóstico {forecast.period}</span>
              </div>
              <Badge variant="outline">
                {Math.round(forecast.confidence * 100)}% confianza
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold">{forecast.overallComplianceRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa cumplimiento esperada</p>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${forecast.overallComplianceRate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="risks" className="text-xs">
              Riesgos
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">
              Acciones
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">
              Tendencias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="mt-0">
            <ScrollArea className="h-[300px]">
              {risks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                  <p>No se detectaron riesgos significativos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {risks.map((risk) => (
                    <RiskCard key={risk.id} risk={risk} getRiskColor={getRiskColor} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="actions" className="mt-0">
            <Button
              variant="outline"
              size="sm"
              className="mb-3 w-full"
              onClick={() => getPreventiveActions(expedienteId)}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Obtener Acciones Preventivas
            </Button>

            <ScrollArea className="h-[260px]">
              {actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sin acciones preventivas pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onExecute={() => executeAction(action.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            <ScrollArea className="h-[300px]">
              {trends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Analizando tendencias...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trends.map((trend, idx) => (
                    <TrendCard key={idx} trend={trend} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Risk Card Component
function RiskCard({ risk, getRiskColor }: { risk: ComplianceRisk; getRiskColor: (s: string) => string }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn("text-xs", getRiskColor(risk.riskLevel))}>
              {risk.riskLevel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {risk.riskType}
            </Badge>
            {risk.trend === 'worsening' && (
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
            )}
            {risk.trend === 'improving' && (
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
            )}
          </div>
          <p className="text-sm">{risk.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Probabilidad: {Math.round(risk.probability * 100)}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Score: {risk.riskScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({ action, onExecute }: { action: PreventiveAction; onExecute: () => void }) {
  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn("text-xs", priorityColors[action.priority])}>
              {action.priority}
            </Badge>
            {action.automatable && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" /> Auto
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{action.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Esfuerzo: {action.estimatedEffort}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onExecute}>
          Ejecutar
        </Button>
      </div>
    </div>
  );
}

// Trend Card Component
function TrendCard({ trend }: { trend: ComplianceTrend }) {
  const isPositive = trend.trend === 'up' && trend.metric !== 'risks';
  const TrendIcon = trend.trend === 'up' ? TrendingUp : trend.trend === 'down' ? TrendingDown : Activity;

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{trend.metric}</span>
        <div className={cn(
          "flex items-center gap-1 text-sm",
          isPositive ? "text-green-500" : trend.trend === 'stable' ? "text-muted-foreground" : "text-red-500"
        )}>
          <TrendIcon className="h-4 w-4" />
          <span>{trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Actual: {trend.currentValue.toFixed(1)}</span>
        <span>Anterior: {trend.previousValue.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default GaliaCompliancePredictorPanel;
