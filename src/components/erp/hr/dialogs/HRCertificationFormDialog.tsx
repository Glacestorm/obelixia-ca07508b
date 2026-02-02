/**
 * HRCertificationFormDialog - Registrar certificación de empleado
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, Save, Loader2 } from 'lucide-react';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';

interface HRCertificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

export function HRCertificationFormDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: HRCertificationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    certification_name: '',
    issuing_organization: '',
    credential_id: '',
    issued_date: '',
    expiry_date: '',
    is_mandatory: false,
    notes: '',
  });

  const handleSubmit = async () => {
    if (!form.employee_id) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (!form.certification_name.trim()) {
      toast.error('El nombre de la certificación es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('erp_hr_employee_certifications')
        .insert([{
          employee_id: form.employee_id,
          certification_name: form.certification_name,
          issuing_organization: form.issuing_organization || null,
          credential_id: form.credential_id || null,
          issued_date: form.issued_date || null,
          expiry_date: form.expiry_date || null,
          is_mandatory: form.is_mandatory,
          notes: form.notes || null,
          status: 'active',
        }]);

      if (error) throw error;

      toast.success('Certificación registrada correctamente');
      onOpenChange(false);
      setForm({
        employee_id: '',
        certification_name: '',
        issuing_organization: '',
        credential_id: '',
        issued_date: '',
        expiry_date: '',
        is_mandatory: false,
        notes: '',
      });
      onSuccess?.();
    } catch (error) {
      console.error('Error creating certification:', error);
      toast.error('Error al registrar la certificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Nueva Certificación
          </DialogTitle>
          <DialogDescription>
            Registra una certificación profesional de un empleado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Empleado *</Label>
            <HREmployeeSearchSelect
              companyId={companyId}
              value={form.employee_id}
              onValueChange={(v) => setForm({ ...form, employee_id: v })}
              placeholder="Buscar empleado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre de la Certificación *</Label>
            <Input
              value={form.certification_name}
              onChange={(e) => setForm({ ...form, certification_name: e.target.value })}
              placeholder="Ej: PMP, AWS Solutions Architect..."
            />
          </div>

          <div className="space-y-2">
            <Label>Organismo Emisor</Label>
            <Input
              value={form.issuing_organization}
              onChange={(e) => setForm({ ...form, issuing_organization: e.target.value })}
              placeholder="Ej: PMI, Amazon Web Services..."
            />
          </div>

          <div className="space-y-2">
            <Label>ID de Credencial</Label>
            <Input
              value={form.credential_id}
              onChange={(e) => setForm({ ...form, credential_id: e.target.value })}
              placeholder="Número o código de la certificación"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Emisión</Label>
              <Input
                type="date"
                value={form.issued_date}
                onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Certificación Obligatoria</Label>
              <p className="text-xs text-muted-foreground">Requerida para el puesto</p>
            </div>
            <Switch
              checked={form.is_mandatory}
              onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>
        </div>

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
            Guardar Certificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
