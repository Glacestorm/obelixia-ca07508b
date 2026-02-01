/**
 * HRLegalReviewDialog - Solicitud de revisión legal para offboarding
 * Permite enviar una solicitud estructurada al departamento jurídico
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Scale,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  Sparkles,
  Upload,
  User,
  Building2,
  Calendar,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LegalRisk {
  risk: string;
  probability: string;
  mitigation: string;
}

interface HRLegalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  terminationType: string;
  estimatedCost?: number;
  identifiedRisks?: LegalRisk[];
  analysisData?: Record<string, unknown>;
  onSuccess?: () => void;
}

type Priority = 'urgent' | 'high' | 'normal' | 'low';
type ReviewType = 'termination' | 'contract_dispute' | 'harassment' | 'discrimination' | 'compensation' | 'other';

export function HRLegalReviewDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  terminationType,
  estimatedCost,
  identifiedRisks = [],
  analysisData,
  onSuccess
}: HRLegalReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priority, setPriority] = useState<Priority>('normal');
  const [reviewType, setReviewType] = useState<ReviewType>('termination');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [urgentReason, setUrgentReason] = useState('');
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeRisks, setIncludeRisks] = useState(true);
  const [requestedDeadline, setRequestedDeadline] = useState('');

  const priorityOptions: { value: Priority; label: string; color: string; days: string }[] = [
    { value: 'urgent', label: 'Urgente', color: 'text-red-600 bg-red-500/20', days: '24h' },
    { value: 'high', label: 'Alta', color: 'text-orange-600 bg-orange-500/20', days: '3 días' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600 bg-blue-500/20', days: '7 días' },
    { value: 'low', label: 'Baja', color: 'text-green-600 bg-green-500/20', days: '14 días' }
  ];

  const reviewTypes: { value: ReviewType; label: string }[] = [
    { value: 'termination', label: 'Extinción de contrato' },
    { value: 'contract_dispute', label: 'Disputa contractual' },
    { value: 'harassment', label: 'Acoso laboral' },
    { value: 'discrimination', label: 'Discriminación' },
    { value: 'compensation', label: 'Reclamación salarial' },
    { value: 'other', label: 'Otro' }
  ];

  const handleSubmit = async () => {
    if (priority === 'urgent' && !urgentReason.trim()) {
      toast.error('Debe indicar el motivo de la urgencia');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call edge function to create legal review request
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'create_legal_review_request',
          employee_id: employeeId,
          request_data: {
            employee_name: employeeName,
            termination_type: terminationType,
            estimated_cost: estimatedCost,
            priority,
            review_type: reviewType,
            additional_notes: additionalNotes,
            urgent_reason: priority === 'urgent' ? urgentReason : null,
            requested_deadline: requestedDeadline || null,
            include_ai_analysis: includeAnalysis,
            ai_analysis_data: includeAnalysis ? analysisData : null,
            include_risk_assessment: includeRisks,
            identified_risks: includeRisks ? identifiedRisks : [],
            requested_at: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      toast.success('Solicitud de revisión legal enviada correctamente', {
        description: `Prioridad: ${priorityOptions.find(p => p.value === priority)?.label} - Respuesta estimada: ${priorityOptions.find(p => p.value === priority)?.days}`
      });

      onSuccess?.();
      onOpenChange(false);

    } catch (error) {
      console.error('Error submitting legal review request:', error);
      toast.error('Error al enviar la solicitud de revisión legal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPriority = priorityOptions.find(p => p.value === priority);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Solicitar Revisión Legal
          </DialogTitle>
          <DialogDescription>
            Envía una solicitud estructurada al departamento jurídico para revisión del caso
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Información del caso */}
            <Card className="border-muted">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Empleado</p>
                      <p className="text-sm font-medium">{employeeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo extinción</p>
                      <p className="text-sm font-medium">{terminationType}</p>
                    </div>
                  </div>
                  {estimatedCost && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Coste estimado</p>
                        <p className="text-sm font-medium text-orange-600">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(estimatedCost)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Riesgos identificados */}
            {identifiedRisks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Riesgos Identificados por IA
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-risks"
                      checked={includeRisks}
                      onCheckedChange={(checked) => setIncludeRisks(checked === true)}
                    />
                    <label htmlFor="include-risks" className="text-xs text-muted-foreground">
                      Incluir en solicitud
                    </label>
                  </div>
                </div>
                <Card className={cn("border-amber-500/30", !includeRisks && "opacity-50")}>
                  <CardContent className="pt-3 space-y-2">
                    {identifiedRisks.slice(0, 3).map((risk, idx) => (
                      <div key={idx} className="text-sm p-2 rounded bg-amber-500/10">
                        <p className="font-medium">{risk.risk}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mitigación: {risk.mitigation}
                        </p>
                      </div>
                    ))}
                    {identifiedRisks.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{identifiedRisks.length - 3} riesgos adicionales
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Incluir análisis IA */}
            {analysisData && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
                <Checkbox 
                  id="include-analysis"
                  checked={includeAnalysis}
                  onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
                />
                <div className="flex-1">
                  <label htmlFor="include-analysis" className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Incluir análisis completo de IA
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Adjunta el informe detallado generado por el agente de IA
                  </p>
                </div>
              </div>
            )}

            {/* Tipo de revisión */}
            <div className="space-y-2">
              <Label>Tipo de Revisión</Label>
              <Select value={reviewType} onValueChange={(v) => setReviewType(v as ReviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reviewTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <div className="grid grid-cols-4 gap-2">
                {priorityOptions.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={priority === option.value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      priority === option.value && option.color
                    )}
                    onClick={() => setPriority(option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs opacity-70">{option.days}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Motivo urgencia */}
            {priority === 'urgent' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Motivo de la urgencia *
                </Label>
                <Textarea
                  value={urgentReason}
                  onChange={(e) => setUrgentReason(e.target.value)}
                  placeholder="Explique por qué esta solicitud requiere atención inmediata..."
                  className="border-red-500/30 focus-visible:ring-red-500"
                  rows={2}
                />
              </div>
            )}

            {/* Fecha límite solicitada */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha límite solicitada (opcional)
              </Label>
              <Input
                type="date"
                value={requestedDeadline}
                onChange={(e) => setRequestedDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas adicionales
              </Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Información adicional relevante para la revisión legal..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Respuesta estimada: {selectedPriority?.days}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Send className="h-4 w-4 mr-2 animate-pulse" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRLegalReviewDialog;
