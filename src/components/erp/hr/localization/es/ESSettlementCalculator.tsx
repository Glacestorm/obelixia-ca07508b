/**
 * ESSettlementCalculator — Calculadora de finiquito español
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { useESLocalization, type SettlementResult } from '@/hooks/erp/hr/useESLocalization';

interface Props { companyId: string; }

const EXTINCION_TYPES = [
  { value: 'despido_improcedente', label: 'Despido improcedente' },
  { value: 'despido_objetivo', label: 'Despido objetivo (causas ETOP)' },
  { value: 'fin_temporal', label: 'Fin de contrato temporal' },
  { value: 'voluntaria', label: 'Baja voluntaria' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
  { value: 'ere', label: 'ERE / ERTE extinción' },
];

export function ESSettlementCalculator({ companyId }: Props) {
  const es = useESLocalization(companyId);
  const [form, setForm] = useState({
    salarioBase: 1800,
    salarioBrutoAnual: 28000,
    fechaInicio: '2020-01-15',
    fechaBaja: new Date().toISOString().split('T')[0],
    tipoExtincion: 'despido_improcedente' as const,
    diasVacacionesPendientes: 5,
    pagasExtrasAnuales: 2,
    indemnizacionDiasAnyo: 33,
  });
  const [result, setResult] = useState<SettlementResult | null>(null);

  const handleCalculate = () => {
    setResult(es.calculateSettlement(form));
  };

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" /> Calculadora de Finiquito
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Salario Base Mensual (€)</Label>
            <Input type="number" value={form.salarioBase} onChange={e => setForm(p => ({ ...p, salarioBase: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Salario Bruto Anual (€)</Label>
            <Input type="number" value={form.salarioBrutoAnual} onChange={e => setForm(p => ({ ...p, salarioBrutoAnual: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo de Extinción</Label>
            <Select value={form.tipoExtincion} onValueChange={v => setForm(p => ({ ...p, tipoExtincion: v as any }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXTINCION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fecha Inicio</Label>
            <Input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fecha Baja</Label>
            <Input type="date" value={form.fechaBaja} onChange={e => setForm(p => ({ ...p, fechaBaja: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Días Vacaciones Pendientes</Label>
            <Input type="number" min="0" value={form.diasVacacionesPendientes} onChange={e => setForm(p => ({ ...p, diasVacacionesPendientes: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pagas Extras / Año</Label>
            <Input type="number" min="0" max="4" value={form.pagasExtrasAnuales} onChange={e => setForm(p => ({ ...p, pagasExtrasAnuales: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Indemnización (días/año)</Label>
            <Input type="number" min="0" value={form.indemnizacionDiasAnyo} onChange={e => setForm(p => ({ ...p, indemnizacionDiasAnyo: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
          </div>
        </div>

        <Button onClick={handleCalculate} className="gap-1">
          <Calculator className="h-3.5 w-3.5" /> Calcular Finiquito
        </Button>

        {result && (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">Antigüedad</p>
                <p className="text-lg font-bold">{result.antiguedadAnios} años</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">Días Indemnización</p>
                <p className="text-lg font-bold">{result.diasIndemnizacion}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">Indemnización</p>
                <p className="text-lg font-bold text-primary">{fmt(result.indemnizacion)}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
                <p className="text-xs text-muted-foreground">Total Bruto Finiquito</p>
                <p className="text-xl font-bold text-primary">{fmt(result.totalBruto)}</p>
              </div>
            </div>
            <Card>
              <CardContent className="py-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Salario pendiente del mes</span><Badge variant="secondary">{fmt(result.salarioPendiente)}</Badge></div>
                <div className="flex justify-between"><span>Vacaciones no disfrutadas</span><Badge variant="secondary">{fmt(result.vacacionesPendientes)}</Badge></div>
                <div className="flex justify-between"><span>Pagas extras prorrateadas</span><Badge variant="secondary">{fmt(result.pagasExtrasProrrata)}</Badge></div>
                <div className="flex justify-between"><span>Indemnización</span><Badge variant="secondary">{fmt(result.indemnizacion)}</Badge></div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Bruto</span><Badge>{fmt(result.totalBruto)}</Badge></div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground italic">
              Cálculo orientativo. No incluye retenciones IRPF ni cotizaciones SS sobre el finiquito. Consultar con asesoría laboral.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
