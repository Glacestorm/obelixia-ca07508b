/**
 * MobilityCostProjectionPanel — Yearly cost breakdown for expatriate assignments
 * H1.0: Edit existing projections
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Plus, TrendingUp, Pencil } from 'lucide-react';
import type { MobilityCostProjection } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  assignmentId: string;
  projections: MobilityCostProjection[];
  currency: string;
  onUpsert: (p: Partial<MobilityCostProjection>) => void;
}

const COST_FIELDS = [
  { key: 'base_salary_home', label: 'Salario base origen' },
  { key: 'base_salary_host', label: 'Salario base destino' },
  { key: 'housing_allowance', label: 'Housing' },
  { key: 'cola_allowance', label: 'COLA' },
  { key: 'hardship_allowance', label: 'Hardship' },
  { key: 'education_allowance', label: 'Educación' },
  { key: 'relocation_cost', label: 'Relocation' },
  { key: 'home_leave_flights', label: 'Home leave' },
  { key: 'tax_equalization_cost', label: 'Tax equalization' },
  { key: 'ss_cost_home', label: 'SS origen' },
  { key: 'ss_cost_host', label: 'SS destino' },
  { key: 'medical_insurance', label: 'Seguro médico' },
  { key: 'other_benefits', label: 'Otros beneficios' },
];

export function MobilityCostProjectionPanel({ assignmentId, projections, currency, onUpsert }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<Record<string, number>>({
    projection_year: currentYear,
    ...Object.fromEntries(COST_FIELDS.map(f => [f.key, 0])),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      projection_year: currentYear,
      ...Object.fromEntries(COST_FIELDS.map(f => [f.key, 0])),
    });
    setShowForm(true);
  };

  const openEdit = (p: MobilityCostProjection) => {
    setEditingId(p.id);
    setForm({
      projection_year: p.projection_year,
      ...Object.fromEntries(COST_FIELDS.map(f => [f.key, (p as any)[f.key] || 0])),
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const total = COST_FIELDS.reduce((sum, f) => sum + (form[f.key] || 0), 0);
    onUpsert({
      assignment_id: assignmentId,
      projection_year: form.projection_year,
      ...Object.fromEntries(COST_FIELDS.map(f => [f.key, form[f.key] || 0])),
      total_annual_cost: total,
      currency_code: currency,
      exchange_rate: 1,
    } as any);
    setShowForm(false);
    setEditingId(null);
  };

  const fmt = (n: number) => `${currency === 'EUR' ? '€' : currency}${n.toLocaleString()}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Proyecciones de coste</CardTitle>
          <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditingId(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={openNew}><Plus className="h-3 w-3 mr-1" />Añadir año</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="text-sm">{editingId ? 'Editar proyección' : 'Proyección de coste anual'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Año</Label>
                  <Input type="number" value={form.projection_year} onChange={e => setForm(p => ({ ...p, projection_year: Number(e.target.value) }))} className="h-8 text-sm" disabled={!!editingId} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COST_FIELDS.map(f => (
                    <div key={f.key}>
                      <Label className="text-[11px]">{f.label}</Label>
                      <Input type="number" value={form[f.key] || 0} onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))} className="h-7 text-xs" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <p className="text-xs font-medium">Total anual: {fmt(COST_FIELDS.reduce((s, f) => s + (form[f.key] || 0), 0))}</p>
                  <Button size="sm" onClick={handleSave}>Guardar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {projections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin proyecciones de coste</p>
        ) : (
          <div className="space-y-3">
            {projections.map(p => {
              const multiplier = p.base_salary_home > 0 ? (p.total_annual_cost / p.base_salary_home).toFixed(1) : '—';
              return (
                <div key={p.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{p.projection_year}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Multiplicador: {multiplier}x
                      </span>
                      <p className="text-sm font-bold">{fmt(p.total_annual_cost)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    {COST_FIELDS.filter(f => (p as any)[f.key] > 0).map(f => (
                      <div key={f.key} className="flex justify-between bg-muted/30 px-2 py-1 rounded">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span>{fmt((p as any)[f.key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
