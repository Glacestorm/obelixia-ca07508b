/**
 * HRIncidentFormDialog - Registrar incidentes de seguridad laboral
 */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRIncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSaved?: () => void;
}

const INCIDENT_TYPES = [
  { value: 'accident_minor', label: 'Accidente Leve' },
  { value: 'accident_major', label: 'Accidente Grave' },
  { value: 'near_miss', label: 'Casi Accidente' },
  { value: 'illness', label: 'Enfermedad Profesional' },
  { value: 'fatality', label: 'Fallecimiento' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Baja', color: 'text-green-600' },
  { value: 'medium', label: 'Media', color: 'text-amber-600' },
  { value: 'high', label: 'Alta', color: 'text-orange-600' },
  { value: 'critical', label: 'Crítica', color: 'text-red-600' }
];

export function HRIncidentFormDialog({
  open,
  onOpenChange,
  companyId,
  onSaved
}: HRIncidentFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    incident_type: 'near_miss',
    severity: 'low',
    location: '',
    area: '',
    description: '',
    immediate_actions: '',
    witnesses: '',
    is_reportable: false
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      resetForm();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('erp_hr_employees')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('first_name');

    if (data) {
      setEmployees(data.map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`
      })));
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: '',
      incident_type: 'near_miss',
      severity: 'low',
      location: '',
      area: '',
      description: '',
      immediate_actions: '',
      witnesses: '',
      is_reportable: false
    });
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.incident_date) {
      toast.error('Fecha y descripción son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const incidentData = {
        company_id: companyId,
        employee_id: formData.employee_id || null,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        incident_type: formData.incident_type,
        severity: formData.severity,
        location: formData.location || null,
        area: formData.area || null,
        description: formData.description,
        immediate_actions: formData.immediate_actions || null,
        witnesses: formData.witnesses ? formData.witnesses.split(',').map(w => w.trim()) : [],
        is_reportable: formData.is_reportable,
        investigation_status: 'pending'
      };

      const { error } = await supabase
        .from('erp_hr_safety_incidents')
        .insert([incidentData]);

      if (error) throw error;

      // If critical or high severity, create an alert
      if (formData.severity === 'critical' || formData.severity === 'high') {
        await supabase.functions.invoke('send-hr-alert', {
          body: {
            company_id: companyId,
            alert_type: 'safety_incident',
            severity: formData.severity,
            title: `Incidente ${formData.severity === 'critical' ? 'CRÍTICO' : 'de alta gravedad'}`,
            message: formData.description.substring(0, 200),
            channels: ['email', 'in_app'],
            employee_id: formData.employee_id || null
          }
        });
      }

      toast.success('Incidente registrado correctamente');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Error al registrar el incidente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Registrar Incidente de Seguridad
          </DialogTitle>
          <DialogDescription>
            Complete los datos del incidente o accidente laboral
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha del Incidente *</Label>
                <Input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Incidente *</Label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, incident_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gravedad *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className={level.color}>{level.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Empleado Afectado</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin empleado específico</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ej: Planta 2, Almacén"
                />
              </div>
              <div className="space-y-2">
                <Label>Área / Departamento</Label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="Ej: Producción"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción del Incidente *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describa detalladamente qué ocurrió, cómo y por qué..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Acciones Inmediatas Tomadas</Label>
              <Textarea
                value={formData.immediate_actions}
                onChange={(e) => setFormData(prev => ({ ...prev, immediate_actions: e.target.value }))}
                placeholder="Qué medidas se tomaron inmediatamente..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Testigos (separados por coma)</Label>
              <Input
                value={formData.witnesses}
                onChange={(e) => setFormData(prev => ({ ...prev, witnesses: e.target.value }))}
                placeholder="Ej: Juan Pérez, María García"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>¿Requiere notificación a autoridades?</Label>
                <p className="text-xs text-muted-foreground">
                  Accidentes graves deben notificarse a Inspección de Trabajo
                </p>
              </div>
              <Switch
                checked={formData.is_reportable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_reportable: checked }))}
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Registrar Incidente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRIncidentFormDialog;
