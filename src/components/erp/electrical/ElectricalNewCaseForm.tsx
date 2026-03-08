import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { useEnergyCases } from '@/hooks/erp/useEnergyCases';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  onCreated: (caseId: string) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'analysis', label: 'En análisis' },
  { value: 'proposal', label: 'Propuesta' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

export function ElectricalNewCaseForm({ companyId, onCreated, onCancel }: Props) {
  const { createCase } = useEnergyCases(companyId);
  const [saving, setSaving] = useState(false);
  const [contractEndDate, setContractEndDate] = useState<Date | undefined>();

  const [form, setForm] = useState({
    title: '',
    current_supplier: '',
    current_tariff: '',
    cups: '',
    address: '',
    status: 'draft',
    priority: 'medium',
    assigned_user_id: '',
    customer_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'El título es obligatorio';
    if (form.title.length > 200) e.title = 'Máximo 200 caracteres';
    if (form.cups && !/^ES\d{16,22}$/i.test(form.cups.replace(/\s/g, '')) && form.cups.length > 0) {
      // Soft validation - just warn but don't block
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      status: form.status,
      priority: form.priority,
      current_supplier: form.current_supplier.trim() || null,
      current_tariff: form.current_tariff.trim() || null,
      cups: form.cups.trim() || null,
      address: form.address.trim() || null,
      assigned_user_id: form.assigned_user_id || null,
      customer_id: form.customer_id || null,
      contract_end_date: contractEndDate ? format(contractEndDate, 'yyyy-MM-dd') : null,
    };
    const result = await createCase(payload as any);
    setSaving(false);
    if (result) onCreated(result.id);
  }, [form, contractEndDate, validate, createCase, onCreated]);

  const updateField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Expedientes" subsection="Nuevo expediente" />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-xl font-bold">Nuevo Expediente</h2>
          <p className="text-sm text-muted-foreground">Rellena los datos para crear un nuevo expediente de optimización eléctrica.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos del expediente</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Título del expediente *</Label>
            <Input id="title" value={form.title} onChange={e => updateField('title', e.target.value)}
              placeholder="Ej: Optimización factura Nave Industrial Polígono Sur" maxLength={200}
              className={errors.title ? 'border-destructive' : ''} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Row 2: Supplier + Tariff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Comercializadora actual</Label>
              <Input value={form.current_supplier} onChange={e => updateField('current_supplier', e.target.value)}
                placeholder="Ej: Iberdrola, Endesa, Naturgy..." />
            </div>
            <div className="grid gap-2">
              <Label>Tarifa actual</Label>
              <Input value={form.current_tariff} onChange={e => updateField('current_tariff', e.target.value)}
                placeholder="Ej: 2.0TD, 3.0TD, 6.1TD..." />
            </div>
          </div>

          {/* Row 3: CUPS + Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>CUPS</Label>
              <Input value={form.cups} onChange={e => updateField('cups', e.target.value)}
                placeholder="ES0021000..." className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>Dirección del suministro</Label>
              <Input value={form.address} onChange={e => updateField('address', e.target.value)}
                placeholder="Calle, número, ciudad..." />
            </div>
          </div>

          {/* Row 4: Status + Priority + Contract End */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Estado inicial</Label>
              <Select value={form.status} onValueChange={v => updateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={v => updateField('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fecha fin de contrato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal",
                    !contractEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {contractEndDate ? format(contractEndDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={contractEndDate} onSelect={setContractEndDate}
                    initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? 'Guardando...' : 'Crear Expediente'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalNewCaseForm;
