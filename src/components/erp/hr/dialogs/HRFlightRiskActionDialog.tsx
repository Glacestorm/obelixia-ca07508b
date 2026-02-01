/**
 * HRFlightRiskActionDialog - Dialog para crear plan de acción para empleados en riesgo de fuga
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Loader2, 
  Shield, 
  Target, 
  Calendar, 
  User,
  Sparkles,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FlightRiskEmployee {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  mainDrivers: string[];
  recommendedActions: string[];
}

interface HRFlightRiskActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: FlightRiskEmployee | null;
  companyId: string;
  onPlanCreated?: () => void;
}

const SUGGESTED_ACTIONS = [
  { id: 'meeting', label: 'Agendar reunión 1:1 con manager', category: 'Comunicación' },
  { id: 'salary', label: 'Revisar compensación/beneficios', category: 'Compensación' },
  { id: 'career', label: 'Crear plan de carrera personalizado', category: 'Desarrollo' },
  { id: 'training', label: 'Ofrecer formación especializada', category: 'Desarrollo' },
  { id: 'workload', label: 'Evaluar y ajustar carga de trabajo', category: 'Bienestar' },
  { id: 'flexibility', label: 'Ofrecer mayor flexibilidad horaria', category: 'Bienestar' },
  { id: 'recognition', label: 'Implementar programa de reconocimiento', category: 'Motivación' },
  { id: 'mentorship', label: 'Asignar mentor senior', category: 'Desarrollo' },
  { id: 'project', label: 'Asignar proyecto desafiante', category: 'Motivación' },
  { id: 'team', label: 'Considerar cambio de equipo/proyecto', category: 'Reorganización' },
];

export function HRFlightRiskActionDialog({
  open,
  onOpenChange,
  employee,
  companyId,
  onPlanCreated
}: HRFlightRiskActionDialogProps) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customActions, setCustomActions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleAction = (actionId: string) => {
    setSelectedActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      default: return 'Bajo';
    }
  };

  const handleCreate = async () => {
    if (selectedActions.length === 0 && !customActions.trim()) {
      toast.error('Selecciona al menos una acción o añade acciones personalizadas');
      return;
    }

    setIsCreating(true);
    try {
      // Simular creación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Plan de retención creado correctamente', {
        description: `Se han definido ${selectedActions.length} acciones para ${employee?.employeeName}`
      });
      
      onPlanCreated?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating action plan:', error);
      toast.error('Error al crear el plan de acción');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedActions([]);
    setCustomActions('');
    setDeadline('');
    setAssignee('');
    setNotes('');
  };

  // Min date tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Plan de Retención
          </DialogTitle>
          <DialogDescription>
            Define acciones para retener a {employee.employeeName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-4">
            {/* Info del empleado */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{employee.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    Confianza del análisis: {employee.confidence}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={cn("mb-1", getRiskColor(employee.riskLevel))}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Riesgo {getRiskLabel(employee.riskLevel)}
                </Badge>
                <p className="text-sm font-medium">{employee.riskScore}%</p>
              </div>
            </div>

            {/* Drivers de riesgo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Factores de Riesgo Identificados
              </Label>
              <div className="flex flex-wrap gap-2">
                {employee.mainDrivers.map((driver, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {driver}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Acciones recomendadas por IA */}
            {employee.recommendedActions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Recomendaciones IA
                </Label>
                <div className="space-y-1">
                  {employee.recommendedActions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selección de acciones */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Acciones a Implementar
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED_ACTIONS.map((action) => {
                  const isSelected = selectedActions.includes(action.id);
                  return (
                    <div
                      key={action.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-primary/50"
                      )}
                      onClick={() => toggleAction(action.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleAction(action.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Acciones personalizadas */}
            <div className="space-y-2">
              <Label htmlFor="custom">Acciones adicionales</Label>
              <Textarea
                id="custom"
                value={customActions}
                onChange={(e) => setCustomActions(e.target.value)}
                placeholder="Añade acciones personalizadas (una por línea)..."
                rows={3}
              />
            </div>

            {/* Deadline y responsable */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Fecha límite</Label>
                <div className="relative">
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={minDate}
                    className="pl-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsable</Label>
                <div className="relative">
                  <Input
                    id="assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Manager directo"
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexto adicional o consideraciones especiales..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || (selectedActions.length === 0 && !customActions.trim())}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Crear Plan de Retención
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRFlightRiskActionDialog;
