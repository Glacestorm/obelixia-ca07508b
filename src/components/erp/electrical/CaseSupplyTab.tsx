import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Save, RefreshCw } from 'lucide-react';
import { useEnergySupply } from '@/hooks/erp/useEnergySupply';
import { cn } from '@/lib/utils';

interface Props {
  caseId: string;
}

const VOLTAGE_TYPES = [
  { value: 'baja_tension', label: 'Baja Tensión (BT)' },
  { value: 'alta_tension', label: 'Alta Tensión (AT)' },
];

const TARIFF_ACCESS_OPTIONS = [
  '2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD',
];

export function CaseSupplyTab({ caseId }: Props) {
  const { supply, loading, saveSupply, fetchSupply } = useEnergySupply(caseId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tariff_access: '',
    distributor: '',
    voltage_type: '',
    contracted_power_p1: '',
    contracted_power_p2: '',
    max_demand_p1: '',
    max_demand_p2: '',
    notes: '',
  });

  // Sync form with fetched data
  useEffect(() => {
    if (supply) {
      setForm({
        tariff_access: supply.tariff_access || '',
        distributor: supply.distributor || '',
        voltage_type: supply.voltage_type || '',
        contracted_power_p1: supply.contracted_power_p1?.toString() || '',
        contracted_power_p2: supply.contracted_power_p2?.toString() || '',
        max_demand_p1: supply.max_demand_p1?.toString() || '',
        max_demand_p2: supply.max_demand_p2?.toString() || '',
        notes: supply.notes || '',
      });
    }
  }, [supply]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveSupply({
      tariff_access: form.tariff_access || null,
      distributor: form.distributor || null,
      voltage_type: form.voltage_type || null,
      contracted_power_p1: form.contracted_power_p1 ? parseFloat(form.contracted_power_p1) : null,
      contracted_power_p2: form.contracted_power_p2 ? parseFloat(form.contracted_power_p2) : null,
      max_demand_p1: form.max_demand_p1 ? parseFloat(form.max_demand_p1) : null,
      max_demand_p2: form.max_demand_p2 ? parseFloat(form.max_demand_p2) : null,
      notes: form.notes || null,
    });
    setSaving(false);
  }, [form, saveSupply]);

  const updateField = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Cargando datos del suministro...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              Datos del suministro eléctrico
            </CardTitle>
            <CardDescription>Tarifa de acceso, potencia contratada y demandada.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchSupply()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recargar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Row 1: Tariff + Distributor + Voltage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Tarifa de acceso</Label>
            <Select value={form.tariff_access} onValueChange={v => updateField('tariff_access', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tarifa" /></SelectTrigger>
              <SelectContent>
                {TARIFF_ACCESS_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Distribuidora</Label>
            <Input value={form.distributor} onChange={e => updateField('distributor', e.target.value)}
              placeholder="Ej: e-distribución, UFD, i-DE..." />
          </div>
          <div className="grid gap-2">
            <Label>Tipo de tensión</Label>
            <Select value={form.voltage_type} onValueChange={v => updateField('voltage_type', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {VOLTAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Contracted Power */}
        <div>
          <h3 className="text-sm font-medium mb-3">Potencia contratada (kW)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>P1 (Punta)</Label>
              <Input type="number" step="0.01" min="0" value={form.contracted_power_p1}
                onChange={e => updateField('contracted_power_p1', e.target.value)} placeholder="kW" />
            </div>
            <div className="grid gap-2">
              <Label>P2 (Valle)</Label>
              <Input type="number" step="0.01" min="0" value={form.contracted_power_p2}
                onChange={e => updateField('contracted_power_p2', e.target.value)} placeholder="kW" />
            </div>
          </div>
        </div>

        {/* Row 3: Max Demand */}
        <div>
          <h3 className="text-sm font-medium mb-3">Potencia máxima demandada (kW)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>P1 (Punta)</Label>
              <Input type="number" step="0.01" min="0" value={form.max_demand_p1}
                onChange={e => updateField('max_demand_p1', e.target.value)} placeholder="kW" />
            </div>
            <div className="grid gap-2">
              <Label>P2 (Valle)</Label>
              <Input type="number" step="0.01" min="0" value={form.max_demand_p2}
                onChange={e => updateField('max_demand_p2', e.target.value)} placeholder="kW" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="grid gap-2">
          <Label>Notas técnicas</Label>
          <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)}
            placeholder="Observaciones sobre el suministro, maxímetro, autoconsumo, etc." rows={3} />
        </div>
      </CardContent>
    </Card>
  );
}

export default CaseSupplyTab;
