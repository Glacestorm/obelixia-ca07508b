/**
 * HRBenefitFormDialog - Crear/Editar beneficios sociales
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
import { Gift, Save, Loader2 } from 'lucide-react';

interface HRBenefitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

const BENEFIT_TYPES = [
  { value: 'health_insurance', label: 'Seguro Médico' },
  { value: 'life_insurance', label: 'Seguro de Vida' },
  { value: 'dental_insurance', label: 'Seguro Dental' },
  { value: 'childcare', label: 'Guardería' },
  { value: 'meal_vouchers', label: 'Tickets Restaurante' },
  { value: 'transport', label: 'Transporte' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'pension', label: 'Plan de Pensiones' },
  { value: 'education', label: 'Formación' },
  { value: 'remote_work_allowance', label: 'Teletrabajo' },
  { value: 'wellness', label: 'Bienestar' },
  { value: 'pet_insurance', label: 'Seguro Mascotas' },
  { value: 'mental_health', label: 'Salud Mental' },
  { value: 'telemedicine', label: 'Telemedicina' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'other', label: 'Otros' },
];

export function HRBenefitFormDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: HRBenefitFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    benefit_code: '',
    benefit_name: '',
    benefit_type: 'health_insurance',
    provider_name: '',
    monthly_cost_company: 0,
    monthly_cost_employee: 0,
    is_taxable: false,
    tax_percentage: 0,
    is_flex_benefit: false,
    flex_points_cost: 0,
    max_beneficiaries: 1,
    description: '',
  });

  const handleSubmit = async () => {
    if (!form.benefit_name.trim()) {
      toast.error('El nombre del beneficio es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('erp_hr_social_benefits')
        .insert([{
          company_id: companyId,
          ...form,
          is_active: true,
        }]);

      if (error) throw error;

      toast.success('Beneficio creado correctamente');
      onOpenChange(false);
      setForm({
        benefit_code: '',
        benefit_name: '',
        benefit_type: 'health_insurance',
        provider_name: '',
        monthly_cost_company: 0,
        monthly_cost_employee: 0,
        is_taxable: false,
        tax_percentage: 0,
        is_flex_benefit: false,
        flex_points_cost: 0,
        max_beneficiaries: 1,
        description: '',
      });
      onSuccess?.();
    } catch (error) {
      console.error('Error creating benefit:', error);
      toast.error('Error al crear el beneficio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Nuevo Beneficio Social
          </DialogTitle>
          <DialogDescription>
            Configura una nueva prestación social para los empleados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.benefit_code}
                onChange={(e) => setForm({ ...form, benefit_code: e.target.value })}
                placeholder="BEN-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Beneficio *</Label>
              <Select
                value={form.benefit_type}
                onValueChange={(v) => setForm({ ...form, benefit_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre del Beneficio *</Label>
            <Input
              value={form.benefit_name}
              onChange={(e) => setForm({ ...form, benefit_name: e.target.value })}
              placeholder="Ej: Seguro Médico Premium"
            />
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              placeholder="Ej: Sanitas, Adeslas..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Coste Empresa (€/mes)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.monthly_cost_company}
                onChange={(e) => setForm({ ...form, monthly_cost_company: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Coste Empleado (€/mes)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.monthly_cost_employee}
                onChange={(e) => setForm({ ...form, monthly_cost_employee: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Tributa IRPF</Label>
              <Switch
                checked={form.is_taxable}
                onCheckedChange={(v) => setForm({ ...form, is_taxable: v })}
              />
            </div>
            {form.is_taxable && (
              <div className="space-y-2">
                <Label>% IRPF</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.tax_percentage}
                  onChange={(e) => setForm({ ...form, tax_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Flex Benefit</Label>
              <p className="text-xs text-muted-foreground">Canjeable con puntos flexibles</p>
            </div>
            <Switch
              checked={form.is_flex_benefit}
              onCheckedChange={(v) => setForm({ ...form, is_flex_benefit: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Máximo Beneficiarios</Label>
            <Input
              type="number"
              min={1}
              value={form.max_beneficiaries}
              onChange={(e) => setForm({ ...form, max_beneficiaries: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalles del beneficio..."
              rows={3}
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
            Guardar Beneficio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
