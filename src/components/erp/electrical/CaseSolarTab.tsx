/**
 * CaseSolarTab - Solar/self-consumption management within a case
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sun, Plus, Trash2, Battery, Zap, TrendingDown, Edit, Save, X, Loader2
} from 'lucide-react';
import { useEnergySolarInstallations, SolarInstallation } from '@/hooks/erp/useEnergySolarInstallations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface Props {
  caseId: string;
  companyId: string;
}

const CHART_COLORS = ['hsl(45,93%,47%)', 'hsl(142,71%,45%)', 'hsl(217,91%,60%)', 'hsl(0,84%,60%)'];

export function CaseSolarTab({ caseId, companyId }: Props) {
  const { installations, loading, createInstallation, updateInstallation, deleteInstallation } = useEnergySolarInstallations(caseId, companyId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    installed_power_kwp: '',
    modality: 'with_surplus',
    has_battery: false,
    battery_capacity_kwh: '',
    inverter_brand: '',
    inverter_power_kw: '',
    installer_company: '',
    financing_type: 'purchase',
    monthly_estimated_savings: '',
    annual_self_consumption_kwh: '',
    annual_surplus_kwh: '',
    annual_compensation_eur: '',
    grid_dependency_pct: '100',
  });

  const handleCreate = async () => {
    await createInstallation({
      installed_power_kwp: parseFloat(form.installed_power_kwp) || 0,
      modality: form.modality,
      has_battery: form.has_battery,
      battery_capacity_kwh: form.battery_capacity_kwh ? parseFloat(form.battery_capacity_kwh) : null,
      inverter_brand: form.inverter_brand || null,
      inverter_power_kw: form.inverter_power_kw ? parseFloat(form.inverter_power_kw) : null,
      installer_company: form.installer_company || null,
      financing_type: form.financing_type,
      monthly_estimated_savings: parseFloat(form.monthly_estimated_savings) || 0,
      annual_self_consumption_kwh: parseFloat(form.annual_self_consumption_kwh) || 0,
      annual_surplus_kwh: parseFloat(form.annual_surplus_kwh) || 0,
      annual_compensation_eur: parseFloat(form.annual_compensation_eur) || 0,
      grid_dependency_pct: parseFloat(form.grid_dependency_pct) || 100,
    });
    setShowForm(false);
  };

  // Aggregate KPIs
  const totalPower = installations.reduce((s, i) => s + i.installed_power_kwp, 0);
  const totalEstSavings = installations.reduce((s, i) => s + i.monthly_estimated_savings, 0);
  const totalRealSavings = installations.reduce((s, i) => s + i.monthly_real_savings, 0);
  const totalSelfConsumption = installations.reduce((s, i) => s + i.annual_self_consumption_kwh, 0);
  const totalSurplus = installations.reduce((s, i) => s + i.annual_surplus_kwh, 0);
  const totalCompensation = installations.reduce((s, i) => s + i.annual_compensation_eur, 0);

  const energyMix = [
    { name: 'Autoconsumo', value: totalSelfConsumption },
    { name: 'Excedentes', value: totalSurplus },
  ].filter(d => d.value > 0);

  const savingsComparison = installations.map(i => ({
    name: `${i.installed_power_kwp} kWp`,
    estimado: i.monthly_estimated_savings,
    real: i.monthly_real_savings,
  }));

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Potencia instalada', value: `${totalPower} kWp`, icon: Sun, color: 'text-orange-400' },
          { label: 'Ahorro est./mes', value: `${totalEstSavings.toFixed(0)} €`, icon: TrendingDown, color: 'text-emerald-500' },
          { label: 'Ahorro real/mes', value: `${totalRealSavings.toFixed(0)} €`, icon: TrendingDown, color: 'text-green-600' },
          { label: 'Autoconsumo', value: `${totalSelfConsumption.toFixed(0)} kWh/año`, icon: Zap, color: 'text-amber-500' },
          { label: 'Excedentes', value: `${totalSurplus.toFixed(0)} kWh/año`, icon: Zap, color: 'text-blue-500' },
          { label: 'Compensación', value: `${totalCompensation.toFixed(0)} €/año`, icon: Battery, color: 'text-purple-500' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${kpi.color}`} />
                <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-sm font-bold">{kpi.value}</p></div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      {/* Charts */}
      {installations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {energyMix.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mix energético solar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={energyMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value.toFixed(0)}`}>
                      {energyMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {savingsComparison.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro estimado vs real</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={savingsComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="estimado" fill="hsl(45,93%,47%)" name="Estimado €/mes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" fill="hsl(142,71%,45%)" name="Real €/mes" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Installations list */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Instalaciones solares</h3>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Nueva instalación</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">Potencia (kWp) *</Label><Input type="number" value={form.installed_power_kwp} onChange={e => setForm(f => ({ ...f, installed_power_kwp: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Modalidad</Label>
                <Select value={form.modality} onValueChange={v => setForm(f => ({ ...f, modality: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with_surplus">Con excedentes</SelectItem>
                    <SelectItem value="without_surplus">Sin excedentes</SelectItem>
                    <SelectItem value="collective">Colectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Financiación</Label>
                <Select value={form.financing_type} onValueChange={v => setForm(f => ({ ...f, financing_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Compra</SelectItem>
                    <SelectItem value="renting">Renting</SelectItem>
                    <SelectItem value="leasing">Leasing</SelectItem>
                    <SelectItem value="ppa">PPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Instaladora</Label><Input value={form.installer_company} onChange={e => setForm(f => ({ ...f, installer_company: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2"><Switch checked={form.has_battery} onCheckedChange={v => setForm(f => ({ ...f, has_battery: v }))} /><Label className="text-xs">Batería</Label></div>
              {form.has_battery && <div><Label className="text-xs">Capacidad (kWh)</Label><Input type="number" value={form.battery_capacity_kwh} onChange={e => setForm(f => ({ ...f, battery_capacity_kwh: e.target.value }))} className="h-8 text-sm" /></div>}
              <div><Label className="text-xs">Ahorro est. €/mes</Label><Input type="number" value={form.monthly_estimated_savings} onChange={e => setForm(f => ({ ...f, monthly_estimated_savings: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Dependencia red %</Label><Input type="number" value={form.grid_dependency_pct} onChange={e => setForm(f => ({ ...f, grid_dependency_pct: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleCreate}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {installations.length === 0 && !showForm ? (
        <Card className="border-dashed"><CardContent className="py-8 text-center">
          <Sun className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No hay instalaciones solares registradas</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>Añadir instalación</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {installations.map(inst => (
            <Card key={inst.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-orange-400" />
                      <span className="font-semibold text-sm">{inst.installed_power_kwp} kWp</span>
                      <Badge variant="outline" className="text-xs">{inst.modality === 'with_surplus' ? 'Con excedentes' : inst.modality === 'without_surplus' ? 'Sin excedentes' : 'Colectivo'}</Badge>
                      {inst.has_battery && <Badge variant="secondary" className="text-xs"><Battery className="h-3 w-3 mr-0.5" />{inst.battery_capacity_kwh} kWh</Badge>}
                      <Badge variant="outline" className="text-xs capitalize">{inst.financing_type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {inst.installer_company && <span>Instalador: {inst.installer_company}</span>}
                      <span>Autoconsumo: {inst.annual_self_consumption_kwh.toFixed(0)} kWh/año</span>
                      <span>Excedentes: {inst.annual_surplus_kwh.toFixed(0)} kWh/año</span>
                      <span>Compensación: {inst.annual_compensation_eur.toFixed(0)} €/año</span>
                      <span>Dep. red: {inst.grid_dependency_pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInstallation(inst.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default CaseSolarTab;
