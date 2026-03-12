/**
 * HRPayrollSimulator — Simulaciones what-if sin impacto en nóminas reales
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Plus, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PayrollSimulation, SimulationType } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  companyId: string;
  simulations: PayrollSimulation[];
  onFetch: () => void;
  onCreate: (sim: Partial<PayrollSimulation>) => Promise<PayrollSimulation | null>;
}

const SIM_TYPES: { value: SimulationType; label: string }[] = [
  { value: 'what_if', label: 'What-If' },
  { value: 'salary_change', label: 'Cambio salarial' },
  { value: 'new_hire', label: 'Nueva alta' },
  { value: 'promotion', label: 'Promoción' },
];

export function HRPayrollSimulator({ companyId, simulations, onFetch, onCreate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [simType, setSimType] = useState<SimulationType>('what_if');
  const [grossSalary, setGrossSalary] = useState(30000);

  useEffect(() => { onFetch(); }, []);

  const handleCreate = async () => {
    // Simplified simulation — engine calculates based on params
    const monthlyGross = grossSalary / 12;
    const estimatedDeductions = monthlyGross * 0.25; // placeholder
    await onCreate({
      simulation_type: simType,
      period_year: new Date().getFullYear(),
      period_month: new Date().getMonth() + 1,
      input_params: { annual_gross: grossSalary, simulation_type: simType },
      result_lines: [
        { concept: 'Salario base', type: 'earning', amount: monthlyGross },
        { concept: 'Retenciones estimadas', type: 'deduction', amount: estimatedDeductions },
      ],
      result_summary: {
        gross: monthlyGross,
        deductions: estimatedDeductions,
        net: monthlyGross - estimatedDeductions,
        employer_cost: monthlyGross * 1.32,
      },
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" /> Simulador de Nómina
        </h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nueva simulación
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo de simulación</Label>
                <Select value={simType} onValueChange={v => setSimType(v as SimulationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SIM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salario bruto anual (€)</Label>
                <Input type="number" value={grossSalary} onChange={e => setGrossSalary(Number(e.target.value))} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreate} className="gap-1.5"><TrendingUp className="h-4 w-4" />Simular</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {simulations.map(s => {
          const summary = s.result_summary as Record<string, number>;
          return (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.employee_name || 'Empleado'} — {SIM_TYPES.find(t => t.value === s.simulation_type)?.label}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(s.created_at), { locale: es, addSuffix: true })}
                      {' · '}{s.period_month}/{s.period_year}
                    </p>
                  </div>
                  <div className="flex gap-3 text-right">
                    {summary?.gross && <div><p className="text-xs text-muted-foreground">Bruto</p><p className="text-sm font-mono">{Number(summary.gross).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p></div>}
                    {summary?.net && <div><p className="text-xs text-muted-foreground">Neto</p><p className="text-sm font-mono font-bold">{Number(summary.net).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p></div>}
                    <Badge variant="outline" className="text-xs self-center">{s.simulation_type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {simulations.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground"><FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>No hay simulaciones. Crea la primera.</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
