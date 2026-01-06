/**
 * Predictive Pipeline Panel - 2026 Trend
 * ML-powered pipeline predictions and recommendations
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  Clock,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealPrediction {
  id: string;
  dealName: string;
  company: string;
  value: number;
  currentStage: string;
  winProbability: number;
  predictedCloseDate: string;
  daysToClose: number;
  trend: 'up' | 'down' | 'stable';
  riskFactors: string[];
  recommendations: string[];
  confidenceScore: number;
}

interface QuarterForecast {
  quarter: string;
  predicted: number;
  optimistic: number;
  pessimistic: number;
  achieved: number;
  probability: number;
}

const MOCK_PREDICTIONS: DealPrediction[] = [
  {
    id: '1',
    dealName: 'Enterprise License',
    company: 'Acme Corp',
    value: 85000,
    currentStage: 'Propuesta',
    winProbability: 78,
    predictedCloseDate: '2026-02-15',
    daysToClose: 12,
    trend: 'up',
    riskFactors: [],
    recommendations: ['Agendar demo técnica', 'Enviar casos de éxito'],
    confidenceScore: 92
  },
  {
    id: '2',
    dealName: 'CRM Implementation',
    company: 'TechStart',
    value: 45000,
    currentStage: 'Negociación',
    winProbability: 65,
    predictedCloseDate: '2026-02-28',
    daysToClose: 25,
    trend: 'down',
    riskFactors: ['Sin respuesta hace 5 días', 'Competidor activo'],
    recommendations: ['Llamada urgente', 'Ofrecer descuento early-bird'],
    confidenceScore: 78
  },
  {
    id: '3',
    dealName: 'Full Suite',
    company: 'Global Industries',
    value: 120000,
    currentStage: 'Contactado',
    winProbability: 45,
    predictedCloseDate: '2026-03-30',
    daysToClose: 55,
    trend: 'stable',
    riskFactors: ['Proceso de decisión largo', 'Múltiples stakeholders'],
    recommendations: ['Identificar decision maker', 'Preparar ROI personalizado'],
    confidenceScore: 85
  }
];

const QUARTER_FORECASTS: QuarterForecast[] = [
  { quarter: 'Q1 2026', predicted: 450000, optimistic: 520000, pessimistic: 380000, achieved: 180000, probability: 75 },
  { quarter: 'Q2 2026', predicted: 580000, optimistic: 680000, pessimistic: 480000, achieved: 0, probability: 68 },
];

export function PredictivePipelinePanel() {
  const [selectedDeal, setSelectedDeal] = useState<DealPrediction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('deals');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsRefreshing(false);
  };

  const pipelineHealth = useMemo(() => {
    const avgProbability = MOCK_PREDICTIONS.reduce((acc, d) => acc + d.winProbability, 0) / MOCK_PREDICTIONS.length;
    const atRisk = MOCK_PREDICTIONS.filter(d => d.trend === 'down').length;
    return {
      score: Math.round(avgProbability),
      atRisk,
      healthy: MOCK_PREDICTIONS.filter(d => d.trend === 'up').length,
      totalValue: MOCK_PREDICTIONS.reduce((acc, d) => acc + d.value, 0),
      weightedValue: MOCK_PREDICTIONS.reduce((acc, d) => acc + (d.value * d.winProbability / 100), 0)
    };
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Pipeline Predictivo
                <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs">
                  ML
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Predicciones basadas en 2.5M+ deals analizados
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Health Score */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Health Score</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{pipelineHealth.score}%</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">En Riesgo</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pipelineHealth.atRisk}</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Valor Ponderado</span>
            </div>
            <p className="text-xl font-bold text-blue-600">${(pipelineHealth.weightedValue / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deals" className="text-xs">Predicciones</TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="deals" className="flex-1 mt-3">
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-3">
                {MOCK_PREDICTIONS.map((deal) => (
                  <div
                    key={deal.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      selectedDeal?.id === deal.id && "ring-2 ring-primary",
                      deal.trend === 'down' && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                    )}
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{deal.dealName}</h4>
                        <p className="text-xs text-muted-foreground">{deal.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${(deal.value / 1000).toFixed(0)}K</p>
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          deal.trend === 'up' && "text-green-600",
                          deal.trend === 'down' && "text-amber-600",
                          deal.trend === 'stable' && "text-muted-foreground"
                        )}>
                          {deal.trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                          {deal.trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
                          {deal.winProbability}% win
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Probabilidad</span>
                        <span className={cn(
                          "font-medium",
                          deal.winProbability >= 70 && "text-green-600",
                          deal.winProbability >= 40 && deal.winProbability < 70 && "text-amber-600",
                          deal.winProbability < 40 && "text-red-600"
                        )}>
                          {deal.winProbability}%
                        </span>
                      </div>
                      <Progress 
                        value={deal.winProbability} 
                        className={cn(
                          "h-1.5",
                          deal.winProbability >= 70 && "[&>div]:bg-green-500",
                          deal.winProbability >= 40 && deal.winProbability < 70 && "[&>div]:bg-amber-500",
                          deal.winProbability < 40 && "[&>div]:bg-red-500"
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {deal.daysToClose}d para cierre
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {deal.currentStage}
                      </Badge>
                    </div>

                    {deal.riskFactors.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-amber-100/50 dark:bg-amber-900/20">
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{deal.riskFactors[0]}</span>
                        </div>
                      </div>
                    )}

                    {deal.recommendations.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                        <Lightbulb className="h-3 w-3" />
                        <span>{deal.recommendations[0]}</span>
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="forecast" className="flex-1 mt-3">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {QUARTER_FORECASTS.map((forecast) => (
                  <Card key={forecast.quarter} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{forecast.quarter}</h4>
                      <Badge variant="secondary">{forecast.probability}% conf.</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Predicción</span>
                          <span className="font-medium">${(forecast.predicted / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex gap-1">
                          <div 
                            className="h-2 rounded-l bg-green-500"
                            style={{ width: `${(forecast.achieved / forecast.predicted) * 100}%` }}
                          />
                          <div 
                            className="h-2 rounded-r bg-green-200 dark:bg-green-900"
                            style={{ width: `${100 - (forecast.achieved / forecast.predicted) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${(forecast.achieved / 1000).toFixed(0)}K logrado
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                          <span className="text-muted-foreground">Optimista</span>
                          <p className="font-medium text-blue-600">${(forecast.optimistic / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                          <span className="text-muted-foreground">Pesimista</span>
                          <p className="font-medium text-amber-600">${(forecast.pessimistic / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 mt-3">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                <Card className="p-3 border-green-200 bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Momentum positivo</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tu tasa de conversión ha mejorado un 15% en las últimas 2 semanas. Los deals en etapa "Propuesta" tienen 23% más probabilidad de cerrar.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Atención requerida</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        2 deals de alto valor no han tenido actividad en 7+ días. El ML sugiere contacto inmediato para evitar pérdida.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">
                        Ver deals
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Oportunidad detectada</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Basado en patrones similares, los leads del sector "Tecnología" tienen 40% más probabilidad de convertir en enero.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PredictivePipelinePanel;
