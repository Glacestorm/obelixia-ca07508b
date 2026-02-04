/**
 * LegalPredictiveAnalyticsPanel
 * Phase 9: AI-powered litigation prediction, cost estimation, and jurisprudence analysis
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  TrendingUp, 
  Scale, 
  DollarSign,
  Target,
  AlertTriangle,
  Clock,
  Search,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { usePredictiveLegalAnalytics } from '@/hooks/admin/legal/usePredictiveLegalAnalytics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalPredictiveAnalyticsPanelProps {
  className?: string;
}

export function LegalPredictiveAnalyticsPanel({ className }: LegalPredictiveAnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState('prediction');
  const [caseDescription, setCaseDescription] = useState('');

  const {
    isLoading,
    prediction,
    costEstimate,
    trends,
    settlementRec,
    risks,
    lastRefresh,
    predictLitigationOutcome,
    estimateLegalCosts,
    analyzeJurisprudenceTrends,
    getSettlementRecommendation,
    identifyProactiveRisks,
  } = usePredictiveLegalAnalytics();

  const handleAnalyze = useCallback(async () => {
    if (!caseDescription.trim()) return;
    
    const caseDetails = { description: caseDescription };
    
    switch (activeTab) {
      case 'prediction':
        await predictLitigationOutcome(caseDetails);
        break;
      case 'costs':
        await estimateLegalCosts(caseDetails);
        break;
      case 'trends':
        await analyzeJurisprudenceTrends(caseDescription);
        break;
      case 'settlement':
        await getSettlementRecommendation(caseDetails);
        break;
      case 'risks':
        await identifyProactiveRisks(caseDetails);
        break;
    }
  }, [activeTab, caseDescription, predictLitigationOutcome, estimateLegalCosts, analyzeJurisprudenceTrends, getSettlementRecommendation, identifyProactiveRisks]);

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'favorable': return 'bg-green-500/20 text-green-400';
      case 'unfavorable': return 'bg-red-500/20 text-red-400';
      case 'settlement_likely': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Analítica Predictiva Legal
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Predicciones basadas en IA'
                }
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="prediction" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Predicción
            </TabsTrigger>
            <TabsTrigger value="costs" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              Costes
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Tendencias
            </TabsTrigger>
            <TabsTrigger value="settlement" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Acuerdos
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Riesgos
            </TabsTrigger>
          </TabsList>

          {/* Input Section */}
          <div className="mb-4 space-y-2">
            <Label className="text-sm">Descripción del caso o consulta</Label>
            <Textarea
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="Describe el caso, litigio o situación a analizar..."
              className="min-h-[80px]"
            />
            <Button 
              onClick={handleAnalyze}
              disabled={isLoading || !caseDescription.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analizar
                </>
              )}
            </Button>
          </div>

          <TabsContent value="prediction" className="mt-0">
            <ScrollArea className="h-[350px]">
              {prediction ? (
                <div className="space-y-4">
                  {/* Main Prediction */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Resultado Predicho</span>
                      <Badge className={getOutcomeColor(prediction.prediction.outcome)}>
                        {prediction.prediction.outcome === 'favorable' && 'Favorable'}
                        {prediction.prediction.outcome === 'unfavorable' && 'Desfavorable'}
                        {prediction.prediction.outcome === 'settlement_likely' && 'Acuerdo Probable'}
                        {prediction.prediction.outcome === 'uncertain' && 'Incierto'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Probabilidad</span>
                        <span className="font-medium">{prediction.prediction.probability}%</span>
                      </div>
                      <Progress value={prediction.prediction.probability} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Intervalo de confianza: {prediction.prediction.confidenceInterval.low}% - {prediction.prediction.confidenceInterval.high}%
                      </p>
                    </div>
                  </div>

                  {/* Duration Estimate */}
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Duración Estimada</span>
                    </div>
                    <p className="text-sm">
                      {prediction.estimatedDuration.mostLikelyMonths} meses 
                      <span className="text-muted-foreground text-xs ml-1">
                        (rango: {prediction.estimatedDuration.minMonths} - {prediction.estimatedDuration.maxMonths})
                      </span>
                    </p>
                  </div>

                  {/* Factors */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Factores Clave</h4>
                    {prediction.factors.slice(0, 5).map((factor, idx) => (
                      <div key={idx} className="p-2 rounded border bg-muted/30 text-sm">
                        <div className="flex items-center justify-between">
                          <span>{factor.factor}</span>
                          <Badge variant="outline" className={
                            factor.impact === 'positive' ? 'text-green-400' :
                            factor.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                          }>
                            {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : '~'}{factor.weight}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{factor.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recomendaciones</h4>
                    {prediction.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Scale className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe un caso para predecir su resultado
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="costs" className="mt-0">
            <ScrollArea className="h-[350px]">
              {costEstimate ? (
                <div className="space-y-4">
                  {/* Total Estimate */}
                  <div className="p-4 rounded-lg border bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                    <h4 className="text-sm font-medium mb-2">Estimación Total</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        €{costEstimate.totalEstimate.expected.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({costEstimate.totalEstimate.currency})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rango: €{costEstimate.totalEstimate.low.toLocaleString()} - €{costEstimate.totalEstimate.high.toLocaleString()}
                    </p>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Desglose por Concepto</h4>
                    {costEstimate.breakdown.map((item, idx) => (
                      <div key={idx} className="p-2 rounded border bg-muted/30">
                        <div className="flex justify-between text-sm">
                          <span>{item.concept}</span>
                          <span className="font-medium">€{item.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{item.phase}</span>
                          <span>{item.percentageOfTotal}%</span>
                        </div>
                        <Progress value={item.percentageOfTotal} className="h-1 mt-1" />
                      </div>
                    ))}
                  </div>

                  {/* Cost Optimizations */}
                  {costEstimate.costOptimizations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-green-400">💡 Optimizaciones</h4>
                      {costEstimate.costOptimizations.map((opt, idx) => (
                        <div key={idx} className="p-2 rounded border border-green-500/30 bg-green-500/5 text-sm">
                          <div className="flex justify-between">
                            <span>{opt.suggestion}</span>
                            <Badge variant="outline" className="text-green-400">
                              -€{opt.potentialSavings.toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe un caso para estimar costes legales
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            <ScrollArea className="h-[350px]">
              {trends ? (
                <div className="space-y-4">
                  {/* Trends */}
                  {trends.trends.map((trend, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{trend.area}</span>
                        <Badge className={getSeverityColor(trend.impactLevel)}>
                          {trend.impactLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className={cn("h-4 w-4", 
                          trend.trend === 'expansive' && 'text-green-400',
                          trend.trend === 'restrictive' && 'text-red-400',
                          trend.trend === 'volatile' && 'text-yellow-400',
                          trend.trend === 'stable' && 'text-blue-400'
                        )} />
                        <span className="text-muted-foreground">{trend.direction}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Confianza: {trend.confidence}% | Período: {trend.timeframe}
                      </p>
                    </div>
                  ))}

                  {/* Key Decisions */}
                  {trends.keyDecisions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Decisiones Clave</h4>
                      {trends.keyDecisions.slice(0, 3).map((decision, idx) => (
                        <div key={idx} className="p-2 rounded border bg-muted/30 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{decision.caseReference}</span>
                            <span className="text-xs text-muted-foreground">{decision.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{decision.doctrine}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Introduce un tema para analizar tendencias jurisprudenciales
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settlement" className="mt-0">
            <ScrollArea className="h-[350px]">
              {settlementRec ? (
                <div className="space-y-4">
                  {/* Recommendation */}
                  <div className={cn("p-4 rounded-lg border", 
                    settlementRec.recommendation === 'settle' && 'bg-green-500/10 border-green-500/30',
                    settlementRec.recommendation === 'litigate' && 'bg-red-500/10 border-red-500/30',
                    settlementRec.recommendation === 'negotiate_further' && 'bg-yellow-500/10 border-yellow-500/30'
                  )}>
                    <h4 className="font-medium mb-2">Recomendación</h4>
                    <Badge className={cn("text-lg py-1 px-3",
                      settlementRec.recommendation === 'settle' && 'bg-green-500/20 text-green-400',
                      settlementRec.recommendation === 'litigate' && 'bg-red-500/20 text-red-400',
                      settlementRec.recommendation === 'negotiate_further' && 'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {settlementRec.recommendation === 'settle' && '✓ ACORDAR'}
                      {settlementRec.recommendation === 'litigate' && '⚖️ LITIGAR'}
                      {settlementRec.recommendation === 'negotiate_further' && '🔄 NEGOCIAR MÁS'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Confianza: {settlementRec.confidenceLevel}%
                    </p>
                  </div>

                  {/* Value Analysis */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Valor Acuerdo</p>
                      <p className="text-lg font-bold text-green-400">
                        €{settlementRec.analysis.settlementValue.recommended.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Valor Esperado Litigio</p>
                      <p className="text-lg font-bold text-blue-400">
                        €{settlementRec.analysis.litigationValue.expectedValue.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Negotiation Strategy */}
                  <div className="p-3 rounded-lg border bg-card">
                    <h4 className="text-sm font-medium mb-2">Estrategia de Negociación</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Posición inicial</span>
                        <span>€{settlementRec.negotiationStrategy.openingPosition.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Objetivo</span>
                        <span>€{settlementRec.negotiationStrategy.targetSettlement.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mínimo aceptable</span>
                        <span className="text-orange-400">€{settlementRec.negotiationStrategy.minimumAcceptable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Target className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe un caso para obtener recomendación de acuerdo
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="risks" className="mt-0">
            <ScrollArea className="h-[350px]">
              {risks ? (
                <div className="space-y-4">
                  {/* Risk Matrix Summary */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                      <p className="text-lg font-bold text-red-400">{risks.riskMatrix.critical}</p>
                      <p className="text-xs text-muted-foreground">Críticos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
                      <p className="text-lg font-bold text-orange-400">{risks.riskMatrix.high}</p>
                      <p className="text-xs text-muted-foreground">Altos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <p className="text-lg font-bold text-yellow-400">{risks.riskMatrix.medium}</p>
                      <p className="text-xs text-muted-foreground">Medios</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <p className="text-lg font-bold text-green-400">{risks.riskMatrix.low}</p>
                      <p className="text-xs text-muted-foreground">Bajos</p>
                    </div>
                  </div>

                  {/* Total Exposure */}
                  <div className="p-3 rounded-lg border bg-gradient-to-r from-red-500/10 to-orange-500/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Exposición Total</span>
                      <span className="text-xl font-bold text-red-400">
                        €{risks.totalExposure.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Identified Risks */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Riesgos Identificados</h4>
                    {risks.identifiedRisks.map((risk, idx) => (
                      <div key={idx} className={cn("p-3 rounded-lg border", getSeverityColor(risk.impact))}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{risk.category}</p>
                            <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                          </div>
                          <Badge variant="outline">{risk.probability}%</Badge>
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span className="text-muted-foreground">Coste esperado: €{risk.expectedCost.toLocaleString()}</span>
                          <span className="text-muted-foreground">Materialización: {risk.timeToMaterialization}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prioritized Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Acciones Prioritarias</h4>
                    {risks.prioritizedActions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe el contexto para identificar riesgos proactivos
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalPredictiveAnalyticsPanel;
