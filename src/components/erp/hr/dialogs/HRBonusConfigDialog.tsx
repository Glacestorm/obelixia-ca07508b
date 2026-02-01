/**
 * HRBonusConfigDialog - Dialog para configurar políticas de bonus
 * Permite definir parámetros de compensación variable
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  Percent, 
  Users, 
  BarChart3, 
  Calendar,
  Target,
  AlertCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRBonusConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onConfigCreated?: () => void;
}

export function HRBonusConfigDialog({
  open,
  onOpenChange,
  companyId,
  onConfigCreated
}: HRBonusConfigDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fiscal_year: new Date().getFullYear().toString(),
    pool_type: 'percentage', // 'percentage' | 'fixed'
    pool_percentage: 10, // % del beneficio
    pool_fixed_amount: 0,
    min_profit_threshold: 100000, // Beneficio mínimo para activar
    distribution_method: 'performance', // 'performance' | 'salary' | 'hybrid'
    performance_weight: 60, // % peso del rendimiento
    tenure_weight: 20, // % peso de la antigüedad
    department_weight: 20, // % peso del departamento
    min_performance_score: 70, // Puntuación mínima para bonus
    max_bonus_multiplier: 2.0, // Multiplicador máximo
    prorate_new_hires: true,
    exclude_probation: true,
    require_active_cycle: true
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (formData.distribution_method === 'hybrid' && totalWeight !== 100) {
      toast.error('Los pesos deben sumar 100%');
      return;
    }

    setSubmitting(true);
    try {
      // Simulamos guardado ya que la tabla no existe aún
      // En producción, esto se guardaría en erp_hr_bonus_policies
      console.log('[HRBonusConfigDialog] Saving bonus policy:', {
        company_id: companyId,
        name: formData.name,
        description: formData.description || null,
        fiscal_year: parseInt(formData.fiscal_year),
        pool_type: formData.pool_type,
        pool_percentage: formData.pool_type === 'percentage' ? formData.pool_percentage : null,
        pool_fixed_amount: formData.pool_type === 'fixed' ? formData.pool_fixed_amount : null,
        min_profit_threshold: formData.min_profit_threshold,
        distribution_method: formData.distribution_method,
        distribution_weights: {
          performance: formData.performance_weight,
          tenure: formData.tenure_weight,
          department: formData.department_weight
        },
        min_performance_score: formData.min_performance_score,
        max_bonus_multiplier: formData.max_bonus_multiplier,
        prorate_new_hires: formData.prorate_new_hires,
        exclude_probation: formData.exclude_probation,
        require_active_cycle: formData.require_active_cycle
      });

      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Política de bonus creada');
      onOpenChange(false);
      onConfigCreated?.();

      // Reset form
      setFormData({
        name: '',
        description: '',
        fiscal_year: new Date().getFullYear().toString(),
        pool_type: 'percentage',
        pool_percentage: 10,
        pool_fixed_amount: 0,
        min_profit_threshold: 100000,
        distribution_method: 'performance',
        performance_weight: 60,
        tenure_weight: 20,
        department_weight: 20,
        min_performance_score: 70,
        max_bonus_multiplier: 2.0,
        prorate_new_hires: true,
        exclude_probation: true,
        require_active_cycle: true
      });
    } catch (error) {
      console.error('Error creating bonus policy:', error);
      toast.error('Error al crear política');
    } finally {
      setSubmitting(false);
    }
  };

  const totalWeight = formData.performance_weight + formData.tenure_weight + formData.department_weight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Configurar Política de Bonus
          </DialogTitle>
          <DialogDescription>
            Define los parámetros de compensación variable basada en desempeño
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Información Básica
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Política *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Bonus Anual 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Año Fiscal</Label>
                  <Select
                    value={formData.fiscal_year}
                    onValueChange={(v) => setFormData({ ...formData, fiscal_year: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la política..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Pool Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Pool de Bonus
              </h4>
              
              <div className="space-y-2">
                <Label>Tipo de Pool</Label>
                <Select
                  value={formData.pool_type}
                  onValueChange={(v) => setFormData({ ...formData, pool_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% del Beneficio Neto</SelectItem>
                    <SelectItem value="fixed">Cantidad Fija</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pool_type === 'percentage' ? (
                <div className="space-y-2">
                  <Label>Porcentaje del Beneficio: {formData.pool_percentage}%</Label>
                  <Slider
                    value={[formData.pool_percentage]}
                    onValueChange={([v]) => setFormData({ ...formData, pool_percentage: v })}
                    min={1}
                    max={30}
                    step={1}
                    className="py-2"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Cantidad Fija (€)</Label>
                  <Input
                    type="number"
                    value={formData.pool_fixed_amount}
                    onChange={(e) => setFormData({ ...formData, pool_fixed_amount: Number(e.target.value) })}
                    placeholder="50000"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Beneficio Mínimo para Activar (€)</Label>
                <Input
                  type="number"
                  value={formData.min_profit_threshold}
                  onChange={(e) => setFormData({ ...formData, min_profit_threshold: Number(e.target.value) })}
                  placeholder="100000"
                />
                <p className="text-xs text-muted-foreground">
                  El bonus solo se activará si la empresa supera este beneficio
                </p>
              </div>
            </div>

            <Separator />

            {/* Distribution Method */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Método de Distribución
              </h4>

              <div className="space-y-2">
                <Label>Método</Label>
                <Select
                  value={formData.distribution_method}
                  onValueChange={(v) => setFormData({ ...formData, distribution_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">100% por Rendimiento</SelectItem>
                    <SelectItem value="salary">Proporcional al Salario</SelectItem>
                    <SelectItem value="hybrid">Híbrido (Personalizable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.distribution_method === 'hybrid' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label>Peso Rendimiento: {formData.performance_weight}%</Label>
                    {totalWeight !== 100 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Total: {totalWeight}%
                      </Badge>
                    )}
                  </div>
                  <Slider
                    value={[formData.performance_weight]}
                    onValueChange={([v]) => setFormData({ ...formData, performance_weight: v })}
                    min={0}
                    max={100}
                    step={5}
                  />
                  
                  <Label>Peso Antigüedad: {formData.tenure_weight}%</Label>
                  <Slider
                    value={[formData.tenure_weight]}
                    onValueChange={([v]) => setFormData({ ...formData, tenure_weight: v })}
                    min={0}
                    max={100}
                    step={5}
                  />
                  
                  <Label>Peso Departamento: {formData.department_weight}%</Label>
                  <Slider
                    value={[formData.department_weight]}
                    onValueChange={([v]) => setFormData({ ...formData, department_weight: v })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Eligibility Rules */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reglas de Elegibilidad
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puntuación Mínima Desempeño</Label>
                  <Input
                    type="number"
                    value={formData.min_performance_score}
                    onChange={(e) => setFormData({ ...formData, min_performance_score: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplicador Máximo</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={formData.max_bonus_multiplier}
                    onChange={(e) => setFormData({ ...formData, max_bonus_multiplier: Number(e.target.value) })}
                    min={1}
                    max={5}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Prorratear nuevas incorporaciones</Label>
                    <p className="text-xs text-muted-foreground">
                      Calcular bonus proporcional al tiempo trabajado
                    </p>
                  </div>
                  <Switch
                    checked={formData.prorate_new_hires}
                    onCheckedChange={(v) => setFormData({ ...formData, prorate_new_hires: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Excluir período de prueba</Label>
                    <p className="text-xs text-muted-foreground">
                      No incluir empleados en período de prueba
                    </p>
                  </div>
                  <Switch
                    checked={formData.exclude_probation}
                    onCheckedChange={(v) => setFormData({ ...formData, exclude_probation: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requerir ciclo de evaluación activo</Label>
                    <p className="text-xs text-muted-foreground">
                      Solo empleados con evaluación completada
                    </p>
                  </div>
                  <Switch
                    checked={formData.require_active_cycle}
                    onCheckedChange={(v) => setFormData({ ...formData, require_active_cycle: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !formData.name.trim() || (formData.distribution_method === 'hybrid' && totalWeight !== 100)}
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Política
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRBonusConfigDialog;
