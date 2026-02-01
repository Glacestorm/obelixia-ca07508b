/**
 * HRObjectiveFormDialog - Crear objetivo de empleado
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Target } from 'lucide-react';

interface HRObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  cycleId?: string;
  onSuccess?: () => void;
}

const OBJECTIVE_TYPES = [
  { value: 'quantitative', label: 'Cuantitativo', description: 'Medible numéricamente' },
  { value: 'qualitative', label: 'Cualitativo', description: 'Evaluación subjetiva' },
  { value: 'behavioral', label: 'Comportamental', description: 'Competencias y conducta' },
  { value: 'development', label: 'Desarrollo', description: 'Formación y crecimiento' },
  { value: 'project', label: 'Proyecto', description: 'Entregable específico' },
];

export function HRObjectiveFormDialog({
  open,
  onOpenChange,
  companyId,
  cycleId,
  onSuccess
}: HRObjectiveFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    title: '',
    description: '',
    objectiveType: 'quantitative',
    targetValue: '',
    targetUnit: '',
    weightPercentage: 20,
    dueDate: '',
    kpis: ''
  });

  const handleSubmit = async () => {
    if (!form.employeeId || !form.title) {
      toast.error('Empleado y título son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('erp_hr_employee_objectives')
        .insert([{
          company_id: companyId,
          employee_id: form.employeeId,
          cycle_id: cycleId,
          title: form.title,
          description: form.description || null,
          objective_type: form.objectiveType,
          target_value: form.targetValue ? parseFloat(form.targetValue) : null,
          target_unit: form.targetUnit || null,
          weight_percentage: form.weightPercentage,
          due_date: form.dueDate || null,
          status: 'pending',
          achievement_percentage: 0,
          ai_suggested: false
        }]);

      if (error) throw error;
      
      toast.success('Objetivo creado correctamente');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setForm({
        employeeId: '',
        title: '',
        description: '',
        objectiveType: 'quantitative',
        targetValue: '',
        targetUnit: '',
        weightPercentage: 20,
        dueDate: '',
        kpis: ''
      });
    } catch (error) {
      console.error('Error creating objective:', error);
      toast.error('Error al crear el objetivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Nuevo Objetivo
          </DialogTitle>
          <DialogDescription>
            Define un objetivo SMART para el empleado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Empleado *</Label>
            <HREmployeeSearchSelect
              companyId={companyId}
              value={form.employeeId}
              onValueChange={(id) => setForm({ ...form, employeeId: id })}
              placeholder="Buscar empleado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Título del Objetivo *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Incrementar ventas del territorio norte"
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción detallada del objetivo y criterios de éxito..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Objetivo</Label>
              <Select 
                value={form.objectiveType} 
                onValueChange={(v) => setForm({ ...form, objectiveType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Límite</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          {form.objectiveType === 'quantitative' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta Numérica</Label>
                <Input
                  type="number"
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input
                  value={form.targetUnit}
                  onChange={(e) => setForm({ ...form, targetUnit: e.target.value })}
                  placeholder="%, €, unidades..."
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Peso del Objetivo</Label>
              <span className="text-sm font-medium">{form.weightPercentage}%</span>
            </div>
            <Slider
              value={[form.weightPercentage]}
              onValueChange={([v]) => setForm({ ...form, weightPercentage: v })}
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              El peso determina la importancia relativa en la evaluación final
            </p>
          </div>

          <div className="space-y-2">
            <Label>KPIs Asociados (opcional)</Label>
            <Input
              value={form.kpis}
              onChange={(e) => setForm({ ...form, kpis: e.target.value })}
              placeholder="Ej: Facturación mensual, Nº nuevos clientes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Objetivo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRObjectiveFormDialog;
