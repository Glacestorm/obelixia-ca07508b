import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Activity, Save, RefreshCw } from 'lucide-react';
import { useEnergyConsumptionProfile } from '@/hooks/erp/useEnergyConsumptionProfile';

interface Props { caseId: string; }

export function CaseConsumptionTab({ caseId }: Props) {
  const { profile, loading, saveProfile, fetchProfile } = useEnergyConsumptionProfile(caseId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    household_size: '',
    has_heat_pump: false,
    has_acs_aerothermal: false,
    has_ac_inverter: false,
    has_ev: false,
    has_induction: false,
    has_freezer: false,
    work_from_home: false,
    shiftable_load_pct: 20,
    showers_start_time: '07:00',
    showers_end_time: '09:00',
    notes: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        household_size: profile.household_size?.toString() || '',
        has_heat_pump: profile.has_heat_pump ?? false,
        has_acs_aerothermal: profile.has_acs_aerothermal ?? false,
        has_ac_inverter: profile.has_ac_inverter ?? false,
        has_ev: profile.has_ev ?? false,
        has_induction: profile.has_induction ?? false,
        has_freezer: profile.has_freezer ?? false,
        work_from_home: profile.work_from_home ?? false,
        shiftable_load_pct: profile.shiftable_load_pct ?? 20,
        showers_start_time: profile.showers_start_time || '07:00',
        showers_end_time: profile.showers_end_time || '09:00',
        notes: profile.notes || '',
      });
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveProfile({
      household_size: form.household_size ? parseInt(form.household_size) : null,
      has_heat_pump: form.has_heat_pump,
      has_acs_aerothermal: form.has_acs_aerothermal,
      has_ac_inverter: form.has_ac_inverter,
      has_ev: form.has_ev,
      has_induction: form.has_induction,
      has_freezer: form.has_freezer,
      work_from_home: form.work_from_home,
      shiftable_load_pct: form.shiftable_load_pct,
      showers_start_time: form.showers_start_time || null,
      showers_end_time: form.showers_end_time || null,
      notes: form.notes || null,
    });
    setSaving(false);
  }, [form, saveProfile]);

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Cargando perfil de consumo...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Perfil de consumo
            </CardTitle>
            <CardDescription>Información sobre hábitos y equipamiento del hogar/local.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchProfile()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recargar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Household size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Nº de personas en el hogar</Label>
            <Input type="number" min="1" max="20" value={form.household_size}
              onChange={e => setForm(f => ({ ...f, household_size: e.target.value }))} placeholder="Ej: 4" />
          </div>
          <div className="grid gap-2">
            <Label>Hora duchas — inicio</Label>
            <Input type="time" value={form.showers_start_time}
              onChange={e => setForm(f => ({ ...f, showers_start_time: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Hora duchas — fin</Label>
            <Input type="time" value={form.showers_end_time}
              onChange={e => setForm(f => ({ ...f, showers_end_time: e.target.value }))} />
          </div>
        </div>

        {/* Appliances toggles */}
        <div>
          <h3 className="text-sm font-medium mb-3">Equipamiento eléctrico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['has_heat_pump', 'Bomba de calor'],
              ['has_acs_aerothermal', 'Aerotermia ACS'],
              ['has_ac_inverter', 'Aire acondicionado inverter'],
              ['has_ev', 'Coche eléctrico'],
              ['has_induction', 'Cocina de inducción'],
              ['has_freezer', 'Arcón congelador'],
              ['work_from_home', 'Teletrabajo'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <Label className="cursor-pointer">{label}</Label>
                <Switch checked={(form as any)[key]}
                  onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {/* Shiftable load */}
        <div className="grid gap-3">
          <Label>Porcentaje estimado de carga desplazable: {form.shiftable_load_pct}%</Label>
          <Slider value={[form.shiftable_load_pct]} onValueChange={([v]) => setForm(f => ({ ...f, shiftable_load_pct: v }))}
            min={0} max={100} step={5} className="max-w-md" />
          <p className="text-xs text-muted-foreground">Porcentaje de consumo que puede desplazarse a horas valle (lavadoras, coche eléctrico, etc.).</p>
        </div>

        {/* Notes */}
        <div className="grid gap-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Observaciones sobre hábitos de consumo, horarios especiales, etc." rows={3} />
        </div>
      </CardContent>
    </Card>
  );
}

export default CaseConsumptionTab;
