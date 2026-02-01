/**
 * HRTerminationAnalysisDialog - Vista estructurada del análisis de offboarding
 * Presenta resultados de IA de forma clara y accionable
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Calendar,
  DollarSign,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Brain,
  FileText,
  Scale,
  Clock,
  XCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HRLegalReviewDialog } from './HRLegalReviewDialog';

interface LegalRisk {
  risk: string;
  probability: 'alta' | 'media' | 'baja' | 'high' | 'medium' | 'low';
  mitigation: string;
  impact?: string;
}

interface CostBreakdown {
  concept: string;
  amount: number;
  notes?: string;
}

interface AnalysisResult {
  // Risk analysis
  legal_risks?: LegalRisk[];
  overall_risk_level?: 'high' | 'medium' | 'low' | 'alto' | 'medio' | 'bajo';
  recommended_approach?: string;
  legal_review_required?: boolean;
  
  // Optimal dates
  optimal_dates?: Array<{
    date: string;
    reason: string;
    savings?: number;
  }>;
  avoid_dates?: Array<{
    date: string;
    reason: string;
  }>;
  
  // Cost calculation
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  cost_breakdown?: CostBreakdown[];
  
  // Tasks
  generated_tasks?: number;
  task_summary?: string;
  
  // General
  summary?: string;
  recommendations?: string[];
}

interface HRTerminationAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  terminationType: string;
  analysisResult: AnalysisResult | null;
  isLoading?: boolean;
  onRunAnalysis?: (type: 'risks' | 'dates' | 'costs' | 'tasks') => void;
}

export function HRTerminationAnalysisDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  terminationType,
  analysisResult,
  isLoading = false,
  onRunAnalysis
}: HRTerminationAnalysisDialogProps) {
  const [showLegalReviewDialog, setShowLegalReviewDialog] = useState(false);

  const getRiskColor = (level: string | undefined) => {
    const normalized = level?.toLowerCase();
    if (normalized === 'high' || normalized === 'alta' || normalized === 'alto') {
      return 'text-red-600 bg-red-500/20 border-red-500/30';
    }
    if (normalized === 'medium' || normalized === 'media' || normalized === 'medio') {
      return 'text-amber-600 bg-amber-500/20 border-amber-500/30';
    }
    return 'text-green-600 bg-green-500/20 border-green-500/30';
  };

  const getRiskLabel = (level: string | undefined) => {
    const normalized = level?.toLowerCase();
    if (normalized === 'high' || normalized === 'alta' || normalized === 'alto') return 'Alto';
    if (normalized === 'medium' || normalized === 'media' || normalized === 'medio') return 'Medio';
    return 'Bajo';
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const hasRiskAnalysis = analysisResult?.legal_risks && analysisResult.legal_risks.length > 0;
  const hasDateAnalysis = analysisResult?.optimal_dates && analysisResult.optimal_dates.length > 0;
  const hasCostAnalysis = analysisResult?.cost_breakdown && analysisResult.cost_breakdown.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análisis de Offboarding
          </DialogTitle>
          <DialogDescription>
            {employeeName} - {terminationType}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 py-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-2"
                onClick={() => onRunAnalysis?.('risks')}
                disabled={isLoading}
              >
                <Shield className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Análisis Riesgos</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-2"
                onClick={() => onRunAnalysis?.('dates')}
                disabled={isLoading}
              >
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Fechas Óptimas</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-2"
                onClick={() => onRunAnalysis?.('costs')}
                disabled={isLoading}
              >
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-xs">Calcular Costes</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-2"
                onClick={() => onRunAnalysis?.('tasks')}
                disabled={isLoading}
              >
                <ClipboardList className="h-5 w-5 text-purple-500" />
                <span className="text-xs">Generar Tareas</span>
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-8 text-center">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary animate-pulse" />
                  <p className="text-sm">Analizando con IA...</p>
                </CardContent>
              </Card>
            )}

            {/* No Analysis Yet */}
            {!isLoading && !analysisResult && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Selecciona un tipo de análisis para comenzar
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {!isLoading && analysisResult && (
              <div className="space-y-4">
                {/* Summary */}
                {analysisResult.summary && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Resumen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{analysisResult.summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Level Overview */}
                {analysisResult.overall_risk_level && (
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Nivel de Riesgo Global
                        </CardTitle>
                        <Badge className={cn("font-semibold", getRiskColor(analysisResult.overall_risk_level))}>
                          {getRiskLabel(analysisResult.overall_risk_level)}
                        </Badge>
                      </div>
                    </CardHeader>
                    {analysisResult.legal_review_required && (
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Se recomienda revisión legal antes de proceder</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                          onClick={() => setShowLegalReviewDialog(true)}
                        >
                          <Scale className="h-4 w-4 mr-2" />
                          Solicitar Revisión Legal
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Legal Risks */}
                {hasRiskAnalysis && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Riesgos Legales Identificados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisResult.legal_risks?.map((risk, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{risk.risk}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Mitigación:</span> {risk.mitigation}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0", getRiskColor(risk.probability))}>
                              {getRiskLabel(risk.probability)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Approach */}
                {analysisResult.recommended_approach && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-500" />
                        Enfoque Recomendado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{analysisResult.recommended_approach}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Optimal Dates */}
                {hasDateAnalysis && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        Fechas Óptimas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisResult.optimal_dates?.map((date, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{formatDate(date.date)}</p>
                              <p className="text-xs text-muted-foreground">{date.reason}</p>
                            </div>
                          </div>
                          {date.savings && (
                            <Badge variant="outline" className="text-green-600">
                              Ahorro: {formatCurrency(date.savings)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Dates to Avoid */}
                {analysisResult.avoid_dates && analysisResult.avoid_dates.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Fechas a Evitar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisResult.avoid_dates.map((date, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-sm font-medium">{formatDate(date.date)}</p>
                            <p className="text-xs text-muted-foreground">{date.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Cost Breakdown */}
                {hasCostAnalysis && (
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          Desglose de Costes
                        </CardTitle>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Rango estimado</p>
                          <p className="text-sm font-bold">
                            {formatCurrency(analysisResult.estimated_cost_min)} - {formatCurrency(analysisResult.estimated_cost_max)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysisResult.cost_breakdown?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="text-sm">{item.concept}</p>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                              )}
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Tasks */}
                {analysisResult.generated_tasks && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-purple-500" />
                        Tareas Generadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-purple-600">
                            {analysisResult.generated_tasks}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {analysisResult.generated_tasks} tareas creadas
                          </p>
                          {analysisResult.task_summary && (
                            <p className="text-xs text-muted-foreground">{analysisResult.task_summary}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Recomendaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Legal Review Dialog */}
      <HRLegalReviewDialog
        open={showLegalReviewDialog}
        onOpenChange={setShowLegalReviewDialog}
        employeeId={employeeId}
        employeeName={employeeName}
        terminationType={terminationType}
        estimatedCost={analysisResult?.estimated_cost_max}
        identifiedRisks={analysisResult?.legal_risks}
        analysisData={analysisResult as Record<string, unknown> | undefined}
        onSuccess={() => setShowLegalReviewDialog(false)}
      />
    </Dialog>
  );
}

export default HRTerminationAnalysisDialog;
