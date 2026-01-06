/**
 * Formulario General del Proveedor
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export interface SupplierFormData {
  code: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

interface SupplierGeneralFormProps {
  formData: SupplierFormData;
  onChange: (data: SupplierFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  isPending: boolean;
}

export const SupplierGeneralForm: React.FC<SupplierGeneralFormProps> = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isPending
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => onChange({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="PROV001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_id">CIF/NIF</Label>
          <Input
            id="tax_id"
            value={formData.tax_id}
            onChange={(e) => onChange({ ...formData, tax_id: e.target.value.toUpperCase() })}
            placeholder="B12345678"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legal_name">Razón Social *</Label>
        <Input
          id="legal_name"
          value={formData.legal_name}
          onChange={(e) => onChange({ ...formData, legal_name: e.target.value })}
          placeholder="Proveedor S.L."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            placeholder="contacto@proveedor.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => onChange({ ...formData, phone: e.target.value })}
            placeholder="+34 912 345 678"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          placeholder="Observaciones..."
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => onChange({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Proveedor activo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
        </Button>
      </div>
    </form>
  );
};

export default SupplierGeneralForm;
