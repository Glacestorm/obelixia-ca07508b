/**
 * Intrastat Line Editor - Editor de línea individual
 */

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  IntrastatLine, 
  IntrastatDirection,
  EU_COUNTRIES,
  TRANSPORT_MODES,
  NATURE_OF_TRANSACTION,
  DELIVERY_TERMS,
} from '@/hooks/erp/useERPIntrastat';

interface IntrastatLineEditorProps {
  direction: IntrastatDirection;
  initialData?: Partial<IntrastatLine>;
  onSave: (data: Partial<IntrastatLine>) => void;
  onCancel: () => void;
}

export function IntrastatLineEditor({
  direction,
  initialData,
  onSave,
  onCancel,
}: IntrastatLineEditorProps) {
  const [formData, setFormData] = useState<Partial<IntrastatLine>>({
    commodity_code: initialData?.commodity_code || '',
    commodity_description: initialData?.commodity_description || '',
    country_of_origin: initialData?.country_of_origin || '',
    country_of_destination: initialData?.country_of_destination || '',
    transport_mode: initialData?.transport_mode || '3',
    nature_of_transaction: initialData?.nature_of_transaction || '11',
    delivery_terms: initialData?.delivery_terms || 'DAP',
    net_mass: initialData?.net_mass || 0,
    invoice_value: initialData?.invoice_value || 0,
    statistical_value: initialData?.statistical_value || 0,
    partner_vat: initialData?.partner_vat || '',
    partner_name: initialData?.partner_name || '',
    source_document: initialData?.source_document || '',
    is_triangular: initialData?.is_triangular || false,
    notes: initialData?.notes || '',
  });

  const handleChange = (field: keyof IntrastatLine, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calcular valor estadístico si no se ha editado manualmente
    if (field === 'invoice_value' && !initialData?.statistical_value) {
      setFormData(prev => ({ 
        ...prev, 
        statistical_value: (value as number) * 1.03 // 3% adicional como ejemplo
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const countryField = direction === 'dispatches' ? 'country_of_destination' : 'country_of_origin';
  const countryLabel = direction === 'dispatches' ? 'País de destino' : 'País de origen';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Commodity Code */}
        <div className="space-y-2">
          <Label htmlFor="commodity_code">Código CN8 *</Label>
          <Input
            id="commodity_code"
            placeholder="84713000"
            value={formData.commodity_code}
            onChange={(e) => handleChange('commodity_code', e.target.value)}
            required
            maxLength={8}
          />
          <p className="text-xs text-muted-foreground">
            Código de 8 dígitos de la Nomenclatura Combinada
          </p>
        </div>

        {/* Source Document */}
        <div className="space-y-2">
          <Label htmlFor="source_document">Documento origen</Label>
          <Input
            id="source_document"
            placeholder="FV-2025-0001"
            value={formData.source_document}
            onChange={(e) => handleChange('source_document', e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="commodity_description">Descripción mercancía</Label>
        <Input
          id="commodity_description"
          placeholder="Ordenadores portátiles"
          value={formData.commodity_description}
          onChange={(e) => handleChange('commodity_description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Country */}
        <div className="space-y-2">
          <Label>{countryLabel} *</Label>
          <Select
            value={formData[countryField] || ''}
            onValueChange={(v) => handleChange(countryField, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar país" />
            </SelectTrigger>
            <SelectContent>
              {EU_COUNTRIES.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  {country.code} - {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transport Mode */}
        <div className="space-y-2">
          <Label>Modo de transporte *</Label>
          <Select
            value={formData.transport_mode || '3'}
            onValueChange={(v) => handleChange('transport_mode', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_MODES.map(mode => (
                <SelectItem key={mode.code} value={mode.code}>
                  {mode.code} - {mode.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Nature of Transaction */}
        <div className="space-y-2">
          <Label>Naturaleza transacción *</Label>
          <Select
            value={formData.nature_of_transaction || '11'}
            onValueChange={(v) => handleChange('nature_of_transaction', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NATURE_OF_TRANSACTION.map(nat => (
                <SelectItem key={nat.code} value={nat.code}>
                  {nat.code} - {nat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delivery Terms */}
        <div className="space-y-2">
          <Label>Incoterm</Label>
          <Select
            value={formData.delivery_terms || 'DAP'}
            onValueChange={(v) => handleChange('delivery_terms', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_TERMS.map(term => (
                <SelectItem key={term.code} value={term.code}>
                  {term.code} - {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Net Mass */}
        <div className="space-y-2">
          <Label htmlFor="net_mass">Masa neta (kg) *</Label>
          <Input
            id="net_mass"
            type="number"
            step="0.001"
            min="0"
            placeholder="0.000"
            value={formData.net_mass || ''}
            onChange={(e) => handleChange('net_mass', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        {/* Invoice Value */}
        <div className="space-y-2">
          <Label htmlFor="invoice_value">Valor factura (€) *</Label>
          <Input
            id="invoice_value"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.invoice_value || ''}
            onChange={(e) => handleChange('invoice_value', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        {/* Statistical Value */}
        <div className="space-y-2">
          <Label htmlFor="statistical_value">Valor estadístico (€)</Label>
          <Input
            id="statistical_value"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.statistical_value || ''}
            onChange={(e) => handleChange('statistical_value', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Partner VAT */}
        <div className="space-y-2">
          <Label htmlFor="partner_vat">NIF/VAT socio</Label>
          <Input
            id="partner_vat"
            placeholder="FR12345678901"
            value={formData.partner_vat}
            onChange={(e) => handleChange('partner_vat', e.target.value)}
          />
        </div>

        {/* Partner Name */}
        <div className="space-y-2">
          <Label htmlFor="partner_name">Nombre socio</Label>
          <Input
            id="partner_name"
            placeholder="Empresa ejemplo SARL"
            value={formData.partner_name}
            onChange={(e) => handleChange('partner_name', e.target.value)}
          />
        </div>
      </div>

      {/* Triangular Operation */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_triangular"
          checked={formData.is_triangular}
          onCheckedChange={(checked) => handleChange('is_triangular', checked)}
        />
        <Label htmlFor="is_triangular" className="text-sm font-normal">
          Operación triangular (mercancía no pasa por España)
        </Label>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Observaciones adicionales..."
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initialData ? 'Guardar cambios' : 'Añadir línea'}
        </Button>
      </div>
    </form>
  );
}

export default IntrastatLineEditor;
