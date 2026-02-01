/**
 * HRCompetencyFormDialog - Dialog para crear/editar competencias
 * Permite definir competencias con categoría, nivel requerido y si es obligatoria
 */

import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Brain, 
  Save, 
  Loader2,
  Sparkles 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Competency {
  id?: string;
  name: string;
  description: string;
  category: string;
  is_mandatory: boolean;
  required_level?: number;
}

interface HRCompetencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  competency?: Competency | null;
  onSaved?: () => void;
}

const CATEGORIES = [
  { value: 'technical', label: 'Técnica' },
  { value: 'soft_skills', label: 'Habilidades Blandas' },
  { value: 'leadership', label: 'Liderazgo' },
  { value: 'communication', label: 'Comunicación' },
  { value: 'digital', label: 'Digital' },
  { value: 'regulatory', label: 'Normativa/Legal' },
  { value: 'safety', label: 'Seguridad (PRL)' },
  { value: 'languages', label: 'Idiomas' },
];

const LEVELS = [
  { value: 1, label: 'Básico', description: 'Conocimiento fundamental' },
  { value: 2, label: 'Intermedio', description: 'Aplicación práctica' },
  { value: 3, label: 'Avanzado', description: 'Dominio completo' },
  { value: 4, label: 'Experto', description: 'Referente interno' },
  { value: 5, label: 'Maestro', description: 'Referente externo' },
];

export function HRCompetencyFormDialog({
  open,
  onOpenChange,
  companyId,
  competency,
  onSaved
}: HRCompetencyFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState<Competency>({
    name: '',
    description: '',
    category: 'technical',
    is_mandatory: false,
    required_level: 2
  });

  useEffect(() => {
    if (competency) {
      setForm({
        id: competency.id,
        name: competency.name,
        description: competency.description,
        category: competency.category,
        is_mandatory: competency.is_mandatory,
        required_level: competency.required_level || 2
      });
    } else {
      setForm({
        name: '',
        description: '',
        category: 'technical',
        is_mandatory: false,
        required_level: 2
      });
    }
  }, [competency, open]);

  const handleAISuggest = async () => {
    if (!form.category) {
      toast.error('Selecciona una categoría primero');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-training-agent', {
        body: {
          action: 'suggest_competencies',
          company_id: companyId,
          params: {
            category: form.category,
            count: 1
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.competencies?.[0]) {
        const suggested = data.data.competencies[0];
        setForm(prev => ({
          ...prev,
          name: suggested.name || prev.name,
          description: suggested.description || prev.description
        }));
        toast.success('Sugerencia generada con IA');
      }
    } catch (error) {
      console.error('AI suggest error:', error);
      toast.error('Error al generar sugerencia');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        is_mandatory: form.is_mandatory,
        required_level: form.required_level
      };

      if (form.id) {
        const { error } = await supabase
          .from('erp_hr_competencies')
          .update(payload)
          .eq('id', form.id);

        if (error) throw error;
        toast.success('Competencia actualizada');
      } else {
        const { error } = await supabase
          .from('erp_hr_competencies')
          .insert([payload]);

        if (error) throw error;
        toast.success('Competencia creada');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save competency error:', error);
      toast.error('Error al guardar competencia');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!form.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Competencia' : 'Nueva Competencia'}
          </DialogTitle>
          <DialogDescription>
            Define una competencia profesional para evaluar y desarrollar en los empleados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                placeholder="Ej: Gestión de proyectos"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAISuggest}
                disabled={isGenerating}
                title="Sugerir con IA"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe en qué consiste esta competencia..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Nivel requerido */}
          <div className="space-y-2">
            <Label>Nivel Requerido</Label>
            <div className="grid grid-cols-5 gap-1">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm({ ...form, required_level: level.value })}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    form.required_level === level.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted hover:bg-muted/80 border-border'
                  }`}
                >
                  <div className="text-lg font-bold">{level.value}</div>
                  <div className="text-[10px] truncate">{level.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {LEVELS.find(l => l.value === form.required_level)?.description}
            </p>
          </div>

          {/* Obligatoria */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div>
              <Label htmlFor="mandatory" className="cursor-pointer">
                Competencia Obligatoria
              </Label>
              <p className="text-xs text-muted-foreground">
                Todos los empleados deben tenerla
              </p>
            </div>
            <Switch
              id="mandatory"
              checked={form.is_mandatory}
              onCheckedChange={(checked) => setForm({ ...form, is_mandatory: checked })}
            />
          </div>

          {form.is_mandatory && (
            <Badge variant="destructive" className="text-xs">
              Esta competencia será requerida para todos los empleados
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRCompetencyFormDialog;
