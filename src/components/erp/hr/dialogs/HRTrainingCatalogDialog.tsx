/**
 * HRTrainingCatalogDialog - Dialog para añadir formaciones al catálogo
 * Permite definir cursos, talleres, certificaciones con proveedor, coste y duración
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Save, 
  Loader2,
  DollarSign,
  Clock,
  Award,
  Building2,
  Globe,
  Video
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrainingItem {
  id?: string;
  title: string;
  description: string;
  provider: string;
  provider_name: string;
  modality: string;
  duration_hours: number;
  cost_per_person: number;
  certification_provided: boolean;
  certification_name: string;
  is_mandatory: boolean;
  is_active: boolean;
  max_participants?: number;
  prerequisites?: string;
  competencies_covered?: string[];
}

interface HRTrainingCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  training?: TrainingItem | null;
  onSaved?: () => void;
}

const PROVIDERS = [
  { value: 'interno', label: 'Interno', icon: Building2 },
  { value: 'externo', label: 'Externo', icon: Globe },
  { value: 'online', label: 'Online/E-learning', icon: Video },
];

const MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online_sincrono', label: 'Online Síncrono' },
  { value: 'online_asincrono', label: 'Online Asíncrono (E-learning)' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'outdoor', label: 'Outdoor/Experiencial' },
];

export function HRTrainingCatalogDialog({
  open,
  onOpenChange,
  companyId,
  training,
  onSaved
}: HRTrainingCatalogDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState<TrainingItem>({
    title: '',
    description: '',
    provider: 'externo',
    provider_name: '',
    modality: 'presencial',
    duration_hours: 8,
    cost_per_person: 0,
    certification_provided: false,
    certification_name: '',
    is_mandatory: false,
    is_active: true,
    max_participants: 20,
    prerequisites: ''
  });

  useEffect(() => {
    if (training) {
      setForm({
        id: training.id,
        title: training.title,
        description: training.description,
        provider: training.provider,
        provider_name: training.provider_name,
        modality: training.modality,
        duration_hours: training.duration_hours,
        cost_per_person: training.cost_per_person,
        certification_provided: training.certification_provided,
        certification_name: training.certification_name || '',
        is_mandatory: training.is_mandatory,
        is_active: training.is_active,
        max_participants: training.max_participants || 20,
        prerequisites: training.prerequisites || ''
      });
    } else {
      setForm({
        title: '',
        description: '',
        provider: 'externo',
        provider_name: '',
        modality: 'presencial',
        duration_hours: 8,
        cost_per_person: 0,
        certification_provided: false,
        certification_name: '',
        is_mandatory: false,
        is_active: true,
        max_participants: 20,
        prerequisites: ''
      });
    }
    setActiveTab('basic');
  }, [training, open]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    if (form.duration_hours <= 0) {
      toast.error('La duración debe ser mayor a 0');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        company_id: companyId,
        title: form.title.trim(),
        description: form.description.trim(),
        provider: form.provider,
        provider_name: form.provider_name.trim(),
        modality: form.modality,
        duration_hours: form.duration_hours,
        cost_per_person: form.cost_per_person,
        certification_provided: form.certification_provided,
        certification_name: form.certification_provided ? form.certification_name.trim() : null,
        is_mandatory: form.is_mandatory,
        is_active: form.is_active,
        max_participants: form.max_participants,
        prerequisites: form.prerequisites.trim() || null
      };

      if (form.id) {
        const { error } = await supabase
          .from('erp_hr_training_catalog')
          .update(payload)
          .eq('id', form.id);

        if (error) throw error;
        toast.success('Formación actualizada');
      } else {
        const { error } = await supabase
          .from('erp_hr_training_catalog')
          .insert([payload]);

        if (error) throw error;
        toast.success('Formación añadida al catálogo');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save training error:', error);
      toast.error('Error al guardar formación');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!form.id;
  const totalCost = form.cost_per_person * (form.max_participants || 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Formación' : 'Nueva Formación'}
          </DialogTitle>
          <DialogDescription>
            Añade una formación al catálogo para que los empleados puedan inscribirse.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="certification">Certificación</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Gestión de Proyectos con metodología Agile"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el contenido y objetivos de la formación..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Proveedor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Proveedor</Label>
                <Select
                  value={form.provider}
                  onValueChange={(value) => setForm({ ...form, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider_name">Nombre del Proveedor</Label>
                <Input
                  id="provider_name"
                  placeholder="Ej: Fundación Empresa, Coursera..."
                  value={form.provider_name}
                  onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
                />
              </div>
            </div>

            {/* Modalidad */}
            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select
                value={form.modality}
                onValueChange={(value) => setForm({ ...form, modality: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 pt-4">
            {/* Duración y coste */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duración (horas) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={form.duration_hours}
                  onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Coste por persona (€)
                </Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.cost_per_person}
                  onChange={(e) => setForm({ ...form, cost_per_person: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Máximo participantes */}
            <div className="space-y-2">
              <Label htmlFor="max_participants">Máximo de Participantes</Label>
              <Input
                id="max_participants"
                type="number"
                min={1}
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 20 })}
              />
            </div>

            {/* Coste total estimado */}
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Coste total estimado:</span>
                <span className="font-bold text-lg">
                  {totalCost.toLocaleString('es-ES')}€
                </span>
              </div>
            </div>

            {/* Prerrequisitos */}
            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerrequisitos</Label>
              <Textarea
                id="prerequisites"
                placeholder="Conocimientos o formaciones previas necesarias..."
                value={form.prerequisites}
                onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
                rows={2}
              />
            </div>

            {/* Obligatoria */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="mandatory" className="cursor-pointer">
                  Formación Obligatoria
                </Label>
                <p className="text-xs text-muted-foreground">
                  Requerida para determinados puestos o departamentos
                </p>
              </div>
              <Switch
                id="mandatory"
                checked={form.is_mandatory}
                onCheckedChange={(checked) => setForm({ ...form, is_mandatory: checked })}
              />
            </div>

            {/* Estado activa */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="active" className="cursor-pointer">
                  Formación Activa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Visible en el catálogo para inscripciones
                </p>
              </div>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </TabsContent>

          <TabsContent value="certification" className="space-y-4 pt-4">
            {/* Otorga certificación */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                <div>
                  <Label htmlFor="cert_provided" className="cursor-pointer text-base">
                    Otorga Certificación
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Los participantes reciben un certificado al completar
                  </p>
                </div>
              </div>
              <Switch
                id="cert_provided"
                checked={form.certification_provided}
                onCheckedChange={(checked) => setForm({ ...form, certification_provided: checked })}
              />
            </div>

            {form.certification_provided && (
              <div className="space-y-2">
                <Label htmlFor="cert_name">Nombre de la Certificación</Label>
                <Input
                  id="cert_name"
                  placeholder="Ej: Certificado PMP, Scrum Master, ISO 9001..."
                  value={form.certification_name}
                  onChange={(e) => setForm({ ...form, certification_name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este nombre aparecerá en el registro de certificaciones del empleado
                </p>
              </div>
            )}

            {form.certification_provided && form.certification_name && (
              <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Award className="h-5 w-5" />
                  <span className="font-medium">Vista previa del certificado</span>
                </div>
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                  {form.certification_name}
                </Badge>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Actualizar' : 'Añadir al Catálogo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRTrainingCatalogDialog;
