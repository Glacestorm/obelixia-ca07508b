/**
 * HRSafetyEvaluationDialog - Diálogo para crear/editar evaluaciones de riesgo
 * Fase D - Diálogos funcionales PRL
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, AlertTriangle, Plus, Trash2, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface HRSafetyEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
  evaluation?: {
    id: string;
    area: string;
    riskLevel: string;
    lastReview: string;
    nextReview: string;
    pendingActions: number;
  } | null;
}

interface RiskItem {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high';
  controlMeasures: string;
}

export function HRSafetyEvaluationDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
  evaluation = null,
}: HRSafetyEvaluationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Form state
  const [area, setArea] = useState(evaluation?.area || '');
  const [evaluationType, setEvaluationType] = useState<string>('initial');
  const [evaluationDate, setEvaluationDate] = useState(
    evaluation?.lastReview || new Date().toISOString().split('T')[0]
  );
  const [nextReviewDate, setNextReviewDate] = useState(evaluation?.nextReview || '');
  const [evaluator, setEvaluator] = useState('');
  const [observations, setObservations] = useState('');
  
  // Risk items
  const [riskItems, setRiskItems] = useState<RiskItem[]>([
    {
      id: '1',
      description: '',
      probability: 'medium',
      severity: 'medium',
      controlMeasures: '',
    }
  ]);

  const calculateRiskLevel = (probability: string, severity: string): string => {
    const matrix: Record<string, Record<string, string>> = {
      low: { low: 'low', medium: 'low', high: 'medium' },
      medium: { low: 'low', medium: 'medium', high: 'high' },
      high: { low: 'medium', medium: 'high', high: 'high' },
    };
    return matrix[probability]?.[severity] || 'medium';
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Medio</Badge>;
      case 'low':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Bajo</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const addRiskItem = () => {
    setRiskItems([
      ...riskItems,
      {
        id: Date.now().toString(),
        description: '',
        probability: 'medium',
        severity: 'medium',
        controlMeasures: '',
      }
    ]);
  };

  const removeRiskItem = (id: string) => {
    if (riskItems.length > 1) {
      setRiskItems(riskItems.filter(item => item.id !== id));
    }
  };

  const updateRiskItem = (id: string, field: keyof RiskItem, value: string) => {
    setRiskItems(riskItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAISuggest = async () => {
    if (!area) {
      toast.error('Indica primero el área a evaluar');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'prl_audit',
          context: {
            area,
            evaluation_type: evaluationType,
            company_id: companyId
          }
        }
      });

      if (error) throw error;

      if (data?.risks && Array.isArray(data.risks)) {
        const suggestedRisks: RiskItem[] = data.risks.map((risk: any, idx: number) => ({
          id: `ai-${idx}`,
          description: risk.description || '',
          probability: risk.probability || 'medium',
          severity: risk.severity || 'medium',
          controlMeasures: risk.control_measures || '',
        }));
        setRiskItems(suggestedRisks);
        toast.success('Riesgos sugeridos por IA añadidos');
      } else {
        toast.info('La IA no encontró riesgos específicos para esta área');
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
      toast.error('Error al obtener sugerencias de IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!area || !evaluationDate || !nextReviewDate) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const validRisks = riskItems.filter(r => r.description.trim() !== '');
    if (validRisks.length === 0) {
      toast.error('Añade al menos un riesgo identificado');
      return;
    }

    setLoading(true);
    try {
      // Calculate overall risk level
      const riskLevels = validRisks.map(r => calculateRiskLevel(r.probability, r.severity));
      const overallRisk = riskLevels.includes('high') ? 'high' 
        : riskLevels.includes('medium') ? 'medium' : 'low';

      // Here would go the actual database insert
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(
        evaluation ? 'Evaluación actualizada correctamente' : 'Evaluación de riesgos creada'
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      toast.error('Error al guardar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {evaluation ? 'Editar Evaluación de Riesgos' : 'Nueva Evaluación de Riesgos'}
          </DialogTitle>
          <DialogDescription>
            Identifica y evalúa los riesgos laborales del área seleccionada
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área / Puesto de Trabajo *</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ej: Taller Mecánico, Oficinas..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Evaluación</Label>
                <Select value={evaluationType} onValueChange={setEvaluationType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Inicial</SelectItem>
                    <SelectItem value="periodic">Periódica</SelectItem>
                    <SelectItem value="post_incident">Post-incidente</SelectItem>
                    <SelectItem value="change">Por cambio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evalDate">Fecha Evaluación *</Label>
                <Input
                  id="evalDate"
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextDate">Próxima Revisión *</Label>
                <Input
                  id="nextDate"
                  type="date"
                  value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluator">Evaluador</Label>
                <Input
                  id="evaluator"
                  value={evaluator}
                  onChange={(e) => setEvaluator(e.target.value)}
                  placeholder="Nombre del técnico"
                />
              </div>
            </div>

            {/* Risk Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Riesgos Identificados</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggest}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Sugerir con IA
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRiskItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir Riesgo
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {riskItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Riesgo #{index + 1}</span>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(calculateRiskLevel(item.probability, item.severity))}
                        {riskItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRiskItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción del Riesgo</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateRiskItem(item.id, 'description', e.target.value)}
                        placeholder="Describe el riesgo identificado..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Probabilidad</Label>
                        <Select
                          value={item.probability}
                          onValueChange={(v) => updateRiskItem(item.id, 'probability', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Severidad</Label>
                        <Select
                          value={item.severity}
                          onValueChange={(v) => updateRiskItem(item.id, 'severity', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Medidas de Control</Label>
                      <Textarea
                        value={item.controlMeasures}
                        onChange={(e) => updateRiskItem(item.id, 'controlMeasures', e.target.value)}
                        placeholder="Medidas preventivas y de protección..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones Generales</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Notas adicionales sobre la evaluación..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                {evaluation ? 'Actualizar' : 'Crear Evaluación'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRSafetyEvaluationDialog;
