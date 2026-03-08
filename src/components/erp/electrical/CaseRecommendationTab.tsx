import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Save, RefreshCw, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { useEnergyRecommendation, generateRecommendation, RecommendationInput } from '@/hooks/erp/useEnergyRecommendation';
import { useEnergySupply } from '@/hooks/erp/useEnergySupply';
import { useEnergyInvoices } from '@/hooks/erp/useEnergyInvoices';
import { useEnergyContracts } from '@/hooks/erp/useEnergyContracts';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { cn } from '@/lib/utils';

interface Props { caseId: string; }

const RISK_MAP: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  low: { label: 'Bajo', color: 'text-emerald-600', icon: ShieldCheck },
  medium: { label: 'Medio', color: 'text-yellow-600', icon: AlertTriangle },
  high: { label: 'Alto', color: 'text-destructive', icon: AlertTriangle },
};

export function CaseRecommendationTab({ caseId }: Props) {
  const { recommendation, loading, saveRecommendation, fetchRecommendation } = useEnergyRecommendation(caseId);
  const { supply } = useEnergySupply(caseId);
  const { invoices } = useEnergyInvoices(caseId);
  const { contracts } = useEnergyContracts(caseId);
  const { energyCase } = useEnergyCase(caseId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    recommended_supplier: '',
    recommended_tariff: '',
    recommended_power_p1: '',
    recommended_power_p2: '',
    monthly_savings_estimate: '',
    annual_savings_estimate: '',
    risk_level: 'low',
    confidence_score: 70,
    implementation_notes: '',
  });

  useEffect(() => {
    if (recommendation) {
      setForm({
        recommended_supplier: recommendation.recommended_supplier || '',
        recommended_tariff: recommendation.recommended_tariff || '',
        recommended_power_p1: recommendation.recommended_power_p1?.toString() || '',
        recommended_power_p2: recommendation.recommended_power_p2?.toString() || '',
        monthly_savings_estimate: recommendation.monthly_savings_estimate?.toString() || '',
        annual_savings_estimate: recommendation.annual_savings_estimate?.toString() || '',
        risk_level: recommendation.risk_level || 'low',
        confidence_score: recommendation.confidence_score ?? 70,
        implementation_notes: recommendation.implementation_notes || '',
      });
    }
  }, [recommendation]);

  const handleAutoGenerate = useCallback(() => {
    // Aggregate invoice data
    const totalP1 = invoices.reduce((s, i) => s + (i.consumption_p1_kwh || 0), 0);
    const totalP2 = invoices.reduce((s, i) => s + (i.consumption_p2_kwh || 0), 0);
    const totalP3 = invoices.reduce((s, i) => s + (i.consumption_p3_kwh || 0), 0);
    const hasPermanence = contracts.some(c => c.has_permanence);

    const input: RecommendationInput = {
      consumptionP1: totalP1,
      consumptionP2: totalP2,
      consumptionP3: totalP3,
      contractedPowerP1: supply?.contracted_power_p1 || 0,
      contractedPowerP2: supply?.contracted_power_p2 || 0,
      maxDemandP1: supply?.max_demand_p1 || 0,
      maxDemandP2: supply?.max_demand_p2 || 0,
      currentSupplier: energyCase?.current_supplier || '',
      currentTariff: energyCase?.current_tariff || '',
      hasPermanence,
    };

    const result = generateRecommendation(input);
    setForm({
      recommended_supplier: result.recommended_supplier,
      recommended_tariff: result.recommended_tariff,
      recommended_power_p1: result.recommended_power_p1.toString(),
      recommended_power_p2: result.recommended_power_p2.toString(),
      monthly_savings_estimate: result.monthly_savings_estimate.toString(),
      annual_savings_estimate: result.annual_savings_estimate.toString(),
      risk_level: result.risk_level,
      confidence_score: result.confidence_score,
      implementation_notes: result.implementation_notes,
    });
  }, [invoices, supply, contracts, energyCase]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveRecommendation({
      recommended_supplier: form.recommended_supplier || null,
      recommended_tariff: form.recommended_tariff || null,
      recommended_power_p1: form.recommended_power_p1 ? parseFloat(form.recommended_power_p1) : null,
      recommended_power_p2: form.recommended_power_p2 ? parseFloat(form.recommended_power_p2) : null,
      monthly_savings_estimate: form.monthly_savings_estimate ? parseFloat(form.monthly_savings_estimate) : null,
      annual_savings_estimate: form.annual_savings_estimate ? parseFloat(form.annual_savings_estimate) : null,
      risk_level: form.risk_level,
      confidence_score: form.confidence_score,
      implementation_notes: form.implementation_notes || null,
    });
    setSaving(false);
  }, [form, saveRecommendation]);

  const risk = RISK_MAP[form.risk_level] || RISK_MAP.low;
  const num = (v: string) => v ? parseFloat(v) : 0;

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Cargando recomendación...</div>;

  return (
    <div className="space-y-4">
      {/* Executive summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ahorro mensual</p>
            <p className="text-xl font-bold text-emerald-600">{num(form.monthly_savings_estimate).toLocaleString('es-ES')} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ahorro anual</p>
            <p className="text-xl font-bold text-emerald-600">{num(form.annual_savings_estimate).toLocaleString('es-ES')} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Riesgo</p>
            <p className={cn("text-lg font-bold", risk.color)}>{risk.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Confianza</p>
            <p className="text-lg font-bold">{form.confidence_score}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Recomendación de optimización
              </CardTitle>
              <CardDescription>Editable manualmente o generada automáticamente a partir de los datos del expediente.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoGenerate}>
                <Zap className="h-3.5 w-3.5 mr-1" /> Auto-generar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier & tariff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Comercializadora recomendada</Label>
              <Input value={form.recommended_supplier} onChange={e => setForm(f => ({ ...f, recommended_supplier: e.target.value }))}
                placeholder="Ej: Naturgy, Repsol, Octopus..." />
            </div>
            <div className="grid gap-2">
              <Label>Tarifa recomendada</Label>
              <Input value={form.recommended_tariff} onChange={e => setForm(f => ({ ...f, recommended_tariff: e.target.value }))}
                placeholder="Ej: 2.0TD Precio Fijo" />
            </div>
          </div>

          {/* Power */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Potencia recomendada P1 (kW)</Label>
              <Input type="number" step="0.01" value={form.recommended_power_p1}
                onChange={e => setForm(f => ({ ...f, recommended_power_p1: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Potencia recomendada P2 (kW)</Label>
              <Input type="number" step="0.01" value={form.recommended_power_p2}
                onChange={e => setForm(f => ({ ...f, recommended_power_p2: e.target.value }))} />
            </div>
          </div>

          <Separator />

          {/* Savings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Ahorro mensual estimado (€)</Label>
              <Input type="number" step="0.01" value={form.monthly_savings_estimate}
                onChange={e => setForm(f => ({ ...f, monthly_savings_estimate: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Ahorro anual estimado (€)</Label>
              <Input type="number" step="0.01" value={form.annual_savings_estimate}
                onChange={e => setForm(f => ({ ...f, annual_savings_estimate: e.target.value }))} />
            </div>
          </div>

          {/* Risk & confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Nivel de riesgo</Label>
              <Select value={form.risk_level} onValueChange={v => setForm(f => ({ ...f, risk_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label>Confianza de la recomendación: {form.confidence_score}%</Label>
              <Slider value={[form.confidence_score]} onValueChange={([v]) => setForm(f => ({ ...f, confidence_score: v }))}
                min={0} max={100} step={5} />
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Observaciones de implementación</Label>
            <Textarea value={form.implementation_notes} onChange={e => setForm(f => ({ ...f, implementation_notes: e.target.value }))}
              placeholder="Notas sobre permanencia, riesgos, plazos de cambio, etc." rows={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CaseRecommendationTab;
