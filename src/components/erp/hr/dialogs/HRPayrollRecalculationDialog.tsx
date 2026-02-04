/**
 * HRPayrollRecalculationDialog - Detalle y aprobación de recálculo de nómina
 * Muestra comparativa, validaciones IA/Legal y permite aprobar/rechazar
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Scale,
  UserCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecalculationData {
  id: string;
  employee_id: string;
  employee_name?: string;
  period: string;
  status: string;
  original_values?: Record<string, number>;
  recalculated_values?: Record<string, number>;
  differences?: Record<string, { original: number; recalculated: number; diff: number }>;
  compliance_issues?: Array<{ type: string; severity: string; message: string; recommendation?: string }>;
  ai_validation?: { status: string; analysis: string; recommendations: string[] };
  legal_validation?: { status: string; opinion: string; risk_level: string };
  hr_approval?: { status: string; approver: string; notes: string; approved_at: string };
}

interface HRPayrollRecalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recalculation: RecalculationData;
  onApproved?: () => void;
}

export function HRPayrollRecalculationDialog({
  open,
  onOpenChange,
  recalculation,
  onApproved
}: HRPayrollRecalculationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('comparison');

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
        body: {
          action: 'approve_recalculation',
          recalculation_id: recalculation.id,
          notes: approvalNotes
        }
      });

      if (error) throw error;

      toast.success('Recálculo aprobado correctamente');
      onApproved?.();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Error al aprobar el recálculo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approvalNotes.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
        body: {
          action: 'reject_recalculation',
          recalculation_id: recalculation.id,
          notes: approvalNotes
        }
      });

      if (error) throw error;

      toast.success('Recálculo rechazado');
      onApproved?.();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Error al rechazar el recálculo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestLegalReview = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
        body: {
          action: 'request_legal_validation',
          recalculation_id: recalculation.id
        }
      });

      if (error) throw error;

      toast.success('Solicitud de revisión legal enviada');
    } catch (error) {
      console.error('Legal review request error:', error);
      toast.error('Error al solicitar revisión legal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear valores monetarios
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Obtener color de severidad
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const isPendingApproval = recalculation.status === 'pending_approval' || 
                            recalculation.status === 'legal_reviewed' ||
                            recalculation.status === 'ai_reviewed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detalle de Recálculo - {recalculation.employee_name}
          </DialogTitle>
          <DialogDescription>
            Período: {recalculation.period} | Estado: {recalculation.status}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison" className="gap-1">
              <Calculator className="h-4 w-4" />
              Comparativa
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-1">
              <AlertTriangle className="h-4 w-4" />
              Incidencias
              {(recalculation.compliance_issues?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {recalculation.compliance_issues?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="validations" className="gap-1">
              <Brain className="h-4 w-4" />
              Validaciones
            </TabsTrigger>
            <TabsTrigger value="approval" className="gap-1">
              <UserCheck className="h-4 w-4" />
              Aprobación
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab: Comparativa */}
            <TabsContent value="comparison" className="m-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Comparativa de Valores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground mb-2">
                      <span>Concepto</span>
                      <span className="text-center">Original</span>
                      <span className="text-center">Recalculado</span>
                    </div>
                    <Separator className="mb-3" />
                    
                    {recalculation.differences ? (
                      Object.entries(recalculation.differences).map(([key, values]) => {
                        const diff = values.recalculated - values.original;
                        const isPositive = diff > 0;
                        const isNegative = diff < 0;

                        return (
                          <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
                            <span className="font-medium">{key}</span>
                            <span className="text-center">{formatCurrency(values.original)}</span>
                            <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                isPositive && "text-emerald-600",
                                isNegative && "text-destructive"
                              )}>
                                {formatCurrency(values.recalculated)}
                              </span>
                              {diff !== 0 && (
                                <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                  {isPositive ? '+' : ''}{formatCurrency(diff)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No hay datos de comparativa disponibles
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Incidencias */}
            <TabsContent value="issues" className="m-0">
              <div className="space-y-3">
                {recalculation.compliance_issues && recalculation.compliance_issues.length > 0 ? (
                  recalculation.compliance_issues.map((issue, idx) => (
                    <Card key={idx} className={cn(
                      "border-l-4",
                      issue.severity === 'high' && "border-l-destructive",
                      issue.severity === 'medium' && "border-l-amber-500",
                      issue.severity === 'low' && "border-l-blue-500"
                    )}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn("h-5 w-5 mt-0.5", getSeverityColor(issue.severity))} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{issue.type}</span>
                              <Badge variant={
                                issue.severity === 'high' ? 'destructive' :
                                issue.severity === 'medium' ? 'secondary' : 'outline'
                              }>
                                {issue.severity === 'high' ? 'Alto' :
                                 issue.severity === 'medium' ? 'Medio' : 'Bajo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                            {issue.recommendation && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">
                                <strong>Recomendación:</strong> {issue.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                      <p className="font-medium">Sin incidencias detectadas</p>
                      <p className="text-sm text-muted-foreground">
                        El recálculo cumple con los requisitos del convenio colectivo
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab: Validaciones */}
            <TabsContent value="validations" className="m-0">
              <div className="space-y-4">
                {/* Validación IA */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Validación Agente IA RRHH
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recalculation.ai_validation ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={recalculation.ai_validation.status === 'approved' ? 'default' : 'secondary'}>
                            {recalculation.ai_validation.status === 'approved' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Validado</>
                            ) : (
                              <><AlertTriangle className="h-3 w-3 mr-1" /> Requiere revisión</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm">{recalculation.ai_validation.analysis}</p>
                        {recalculation.ai_validation.recommendations?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Recomendaciones:</p>
                            <ul className="text-sm space-y-1">
                              {recalculation.ai_validation.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <ArrowRight className="h-4 w-4 text-primary mt-0.5" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Pendiente de validación IA</p>
                    )}
                  </CardContent>
                </Card>

                {/* Validación Legal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Validación Agente Jurídico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recalculation.legal_validation ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={recalculation.legal_validation.status === 'approved' ? 'default' : 'destructive'}>
                            {recalculation.legal_validation.status === 'approved' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Conforme</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> No conforme</>
                            )}
                          </Badge>
                          <Badge variant="outline">
                            Riesgo: {recalculation.legal_validation.risk_level}
                          </Badge>
                        </div>
                        <p className="text-sm">{recalculation.legal_validation.opinion}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">Sin revisión legal</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={requestLegalReview}
                          disabled={isSubmitting}
                        >
                          <Scale className="h-4 w-4 mr-2" />
                          Solicitar Revisión Legal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Aprobación */}
            <TabsContent value="approval" className="m-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Aprobación del Responsable de RRHH
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recalculation.hr_approval ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={recalculation.hr_approval.status === 'approved' ? 'default' : 'destructive'}>
                          {recalculation.hr_approval.status === 'approved' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Aprobado</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Rechazado</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        <strong>Aprobado por:</strong> {recalculation.hr_approval.approver}
                      </p>
                      {recalculation.hr_approval.notes && (
                        <p className="text-sm p-3 bg-muted rounded">
                          {recalculation.hr_approval.notes}
                        </p>
                      )}
                    </div>
                  ) : isPendingApproval ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="approval-notes">Notas / Comentarios</Label>
                        <Textarea
                          id="approval-notes"
                          placeholder="Añade notas sobre la aprobación o el motivo del rechazo..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleApprove}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar Recálculo
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Este recálculo aún no está listo para aprobación. 
                      Debe completar las validaciones previas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRPayrollRecalculationDialog;
