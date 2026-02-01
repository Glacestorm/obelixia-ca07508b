/**
 * HRTrainingPlanDialog - Dialog para crear planes formativos anuales
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, DollarSign, Loader2, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';

interface HRTrainingPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onCreated?: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export function HRTrainingPlanDialog({
  open,
  onOpenChange,
  companyId,
  onCreated
}: HRTrainingPlanDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR.toString());
  const [totalBudget, setTotalBudget] = useState('');
  const [objectives, setObjectives] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !year || !totalBudget) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setIsCreating(true);
    try {
      // Simular creación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Plan formativo creado correctamente');
      onCreated?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating training plan:', error);
      toast.error('Error al crear el plan formativo');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setYear(CURRENT_YEAR.toString());
    setTotalBudget('');
    setObjectives('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Nuevo Plan Formativo
          </DialogTitle>
          <DialogDescription>
            Crea un plan de formación anual para la organización
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nombre del Plan *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Plan de Formación 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Año *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los objetivos generales del plan..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Presupuesto Total *</Label>
            <div className="relative">
              <Input
                id="budget"
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="50000"
                className="pl-10"
              />
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objetivos Clave</Label>
            <div className="relative">
              <Textarea
                id="objectives"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Lista los objetivos principales del plan (uno por línea)..."
                rows={4}
                className="pl-10"
              />
              <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ejemplo: Certificar al 80% del equipo técnico en metodologías ágiles
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name || !year || !totalBudget}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Crear Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRTrainingPlanDialog;
