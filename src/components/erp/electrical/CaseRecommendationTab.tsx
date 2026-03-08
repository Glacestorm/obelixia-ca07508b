import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Save, Zap, AlertTriangle, ShieldCheck, Loader2, Info, BrainCircuit, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { PermissionGate } from './PermissionGate';
import { useEnergyRecommendation } from '@/hooks/erp/useEnergyRecommendation';
import { useEnergySupply } from '@/hooks/erp/useEnergySupply';
import { useEnergyInvoices } from '@/hooks/erp/useEnergyInvoices';
import { useEnergyContracts } from '@/hooks/erp/useEnergyContracts';
import { useEnergyConsumptionProfile } from '@/hooks/erp/useEnergyConsumptionProfile';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { useEnergyTariffCatalog } from '@/hooks/erp/useEnergyTariffCatalog';
import { generateEnhancedRecommendation, TariffSimResult } from '@/hooks/erp/useEnhancedRecommendation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { caseId: string; onOpenSimulator?: (caseId: string) => void; }

const RISK_MAP: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  low: { label: 'Bajo', color: 'text-emerald-600', icon: ShieldCheck },
  medium: { label: 'Medio', color: 'text-amber-600', icon: AlertTriangle },
  high: { label: 'Alto', color: 'text-destructive', icon: AlertTriangle },
};

export function CaseRecommendationTab({ caseId, onOpenSimulator }: Props) {
  const { recommendation, loading, saveRecommendation } = useEnergyRecommendation(caseId);
  const { supply } = useEnergySupply(caseId);
  const { invoices } = useEnergyInvoices(caseId);
  const { contracts } = useEnergyContracts(caseId);
  const { profile: consumptionProfile } = useEnergyConsumptionProfile(caseId);
  const { energyCase } = useEnergyCase(caseId);
  const { tariffs } = useEnergyTariffCatalog();
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<TariffSimResult[]>([]);

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

  // Contract expiry alerts
  const contractAlerts = useMemo(() => {
    const alerts: { type: 'expired' | 'expiring_soon' | 'active'; message: string; daysLeft: number }[] = [];

    // Check from energy_case contract_end_date
    if (energyCase?.contract_end_date) {
      const endDate = new Date(energyCase.contract_end_date);
      const daysLeft = differenceInDays(endDate, new Date());
      if (isPast(endDate)) {
        alerts.push({ type: 'expired', message: `Contrato vencido desde ${format(endDate, 'dd/MM/yyyy', { locale: es })}`, daysLeft });
      } else if (daysLeft <= 90) {
        alerts.push({ type: 'expiring_soon', message: `Contrato vence en ${daysLeft} días (${format(endDate, 'dd/MM/yyyy', { locale: es })})`, daysLeft });
      }
    }

    // Check from contracts table
    contracts.forEach(c => {
      if (c.end_date) {
        const endDate = new Date(c.end_date);
        const daysLeft = differenceInDays(endDate, new Date());
        if (isPast(endDate)) {
          alerts.push({ type: 'expired', message: `Contrato ${c.supplier || 'sin comercializadora'} vencido (${format(endDate, 'dd/MM/yyyy', { locale: es })})`, daysLeft });
        } else if (daysLeft <= 60) {
          alerts.push({ type: 'expiring_soon', message: `Contrato ${c.supplier || ''} vence en ${daysLeft} días. ${c.has_renewal ? 'Tiene renovación automática.' : 'Sin renovación automática.'}`, daysLeft });
        }
      }
    });

    return alerts;
  }, [energyCase, contracts]);

  // Savings verification: estimated vs real (from tracking)
  const savingsVerification = useMemo(() => {
    if (!recommendation) return null;

    // Get post-recommendation invoices (after recommendation created)
    const recDate = new Date(recommendation.created_at);
    const preInvoices = invoices.filter(i => i.billing_start && new Date(i.billing_start) < recDate);
    const postInvoices = invoices.filter(i => i.billing_start && new Date(i.billing_start) >= recDate);

    if (preInvoices.length === 0 || postInvoices.length === 0) return null;

    const avgPreCost = preInvoices.reduce((s, i) => s + (i.total_amount || 0), 0) / preInvoices.length;
    const avgPostCost = postInvoices.reduce((s, i) => s + (i.total_amount || 0), 0) / postInvoices.length;
    const realMonthlySavings = Math.round((avgPreCost - avgPostCost) * 100) / 100;
    const estimatedMonthlySavings = recommendation.monthly_savings_estimate || 0;

    const deviation = estimatedMonthlySavings > 0
      ? Math.round(((realMonthlySavings - estimatedMonthlySavings) / estimatedMonthlySavings) * 100)
      : 0;

    return {
      preAvg: Math.round(avgPreCost * 100) / 100,
      postAvg: Math.round(avgPostCost * 100) / 100,
      realMonthlySavings,
      estimatedMonthlySavings,
      deviation,
      preCount: preInvoices.length,
      postCount: postInvoices.length,
    };
  }, [recommendation, invoices]);

  const handleAutoGenerate = useCallback(() => {
    const totalP1 = invoices.reduce((s, i) => s + (i.consumption_p1_kwh || 0), 0);
    const totalP2 = invoices.reduce((s, i) => s + (i.consumption_p2_kwh || 0), 0);
    const totalP3 = invoices.reduce((s, i) => s + (i.consumption_p3_kwh || 0), 0);
    const totalCost = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalDays = invoices.reduce((s, i) => s + (i.days || 30), 0);
    const hasPermanence = contracts.some(c => c.has_permanence);

    const result = generateEnhancedRecommendation({
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
      billingDays: totalDays || 365,
      currentTotalCost: totalCost,
      tariffCatalog: tariffs,
    });

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
    setSimResults(result.simulation_results);
    setAiReasoning(null);
    toast.success(`Motor de reglas: ${result.simulation_results.length} tarifas evaluadas del catálogo`);
  }, [invoices, supply, contracts, energyCase, tariffs]);

  const handleAiGenerate = useCallback(async () => {
    setAiGenerating(true);
    setAiReasoning(null);
    try {
      const activeTariffs = tariffs.filter(t => t.is_active);

      const { data, error } = await supabase.functions.invoke('energy-ai-recommendation', {
        body: {
          caseData: energyCase,
          supply,
          invoices,
          contracts,
          consumptionProfile,
          tariffCatalog: activeTariffs,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data && !data.data.parseError) {
        const r = data.data;
        setForm({
          recommended_supplier: r.recommended_supplier || '',
          recommended_tariff: r.recommended_tariff || '',
          recommended_power_p1: r.recommended_power_p1?.toString() || '',
          recommended_power_p2: r.recommended_power_p2?.toString() || '',
          monthly_savings_estimate: r.monthly_savings_estimate?.toString() || '',
          annual_savings_estimate: r.annual_savings_estimate?.toString() || '',
          risk_level: r.risk_level || 'low',
          confidence_score: r.confidence_score ?? 70,
          implementation_notes: r.implementation_notes || '',
        });
        setAiReasoning(r.reasoning_summary || null);
        toast.success('Borrador IA generado — revisa y edita antes de guardar');
      } else {
        throw new Error(data?.error || 'Respuesta IA no válida');
      }
    } catch (err: any) {
      console.error('[AI Recommendation] error:', err);
      toast.error('Error generando borrador IA: ' + (err.message || 'Error desconocido'));
    } finally {
      setAiGenerating(false);
    }
  }, [energyCase, supply, invoices, contracts, consumptionProfile, tariffs]);

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
      {/* Contract expiry alerts */}
      {contractAlerts.length > 0 && (
        <div className="space-y-2">
          {contractAlerts.map((alert, i) => (
            <div key={i} className={cn("p-3 rounded-lg border flex items-start gap-2",
              alert.type === 'expired' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-500/30 bg-amber-500/5')}>
              <Clock className={cn("h-4 w-4 mt-0.5 shrink-0",
                alert.type === 'expired' ? 'text-destructive' : 'text-amber-600')} />
              <div>
                <p className="text-sm font-medium">
                  {alert.type === 'expired' ? '🔴 Contrato vencido' : '🟡 Vencimiento próximo'}
                </p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Savings verification */}
      {savingsVerification && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Verificación de ahorro: estimado vs real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Coste medio pre</p>
                <p className="text-base font-semibold">{savingsVerification.preAvg.toLocaleString('es-ES')} €</p>
                <p className="text-[10px] text-muted-foreground">{savingsVerification.preCount} facturas</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Coste medio post</p>
                <p className="text-base font-semibold">{savingsVerification.postAvg.toLocaleString('es-ES')} €</p>
                <p className="text-[10px] text-muted-foreground">{savingsVerification.postCount} facturas</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Ahorro real/mes</p>
                <p className={cn("text-base font-bold", savingsVerification.realMonthlySavings >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                  {savingsVerification.realMonthlySavings >= 0 ? '+' : ''}{savingsVerification.realMonthlySavings.toLocaleString('es-ES')} €
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Desviación vs estimado</p>
                <p className={cn("text-base font-bold",
                  Math.abs(savingsVerification.deviation) <= 15 ? 'text-emerald-600' : 'text-amber-600')}>
                  {savingsVerification.deviation > 0 ? '+' : ''}{savingsVerification.deviation}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* AI reasoning banner */}
      {aiReasoning && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
          <BrainCircuit className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary mb-1">Resumen del análisis IA (borrador)</p>
            <p className="text-sm text-muted-foreground">{aiReasoning}</p>
          </div>
        </div>
      )}

      {/* Tariff comparison results */}
      {simResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Comparativa de tarifas ({simResults.length} evaluadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full max-h-[200px]">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.5fr] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <span>Comercializadora</span><span>Tarifa</span><span>Energía €</span><span>Potencia €</span><span>Total €</span><span>Ahorro</span>
                </div>
                {simResults.slice(0, 10).map((r, i) => (
                  <div key={r.tariff_id} className={cn("grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.5fr] gap-2 px-4 py-2 border-b text-sm items-center",
                    i === 0 ? 'bg-emerald-500/5' : 'hover:bg-muted/30')}>
                    <span className="font-medium truncate">{r.supplier}</span>
                    <span className="text-xs truncate">{r.tariff_name}{r.has_permanence ? ' 🔒' : ''}</span>
                    <span className="font-mono text-xs">{r.energy_cost.toLocaleString('es-ES')}</span>
                    <span className="font-mono text-xs">{r.power_cost.toLocaleString('es-ES')}</span>
                    <span className="font-mono text-xs font-semibold">{r.total_cost.toLocaleString('es-ES')}</span>
                    <span className={cn("font-mono text-xs font-semibold",
                      r.savings > 0 ? 'text-emerald-600' : r.savings < 0 ? 'text-destructive' : '')}>
                      {r.savings > 0 ? '+' : ''}{r.savings.toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Recomendación de optimización
              </CardTitle>
              <CardDescription>Editable manualmente, generada por reglas o con asistencia de IA.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <PermissionGate action="approve_recommendation">
                <Button variant="outline" size="sm" onClick={handleAutoGenerate}>
                  <Zap className="h-3.5 w-3.5 mr-1" /> Reglas + Catálogo
                </Button>
              </PermissionGate>
              <PermissionGate action="ai_analysis">
                <Button variant="outline" size="sm" onClick={handleAiGenerate} disabled={aiGenerating}
                  className="border-primary/30 text-primary hover:bg-primary/5">
                  {aiGenerating
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generando...</>
                    : <><BrainCircuit className="h-3.5 w-3.5 mr-1" /> IA Borrador</>}
                </Button>
              </PermissionGate>
              {onOpenSimulator && (
                <Button variant="outline" size="sm" onClick={() => onOpenSimulator(caseId)}>
                  <ArrowRight className="h-3.5 w-3.5 mr-1" /> Simulador
                </Button>
              )}
              <PermissionGate action="approve_recommendation">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {aiGenerating && (
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Analizando expediente con IA...</p>
                <p className="text-xs text-muted-foreground">Evaluando facturas, consumo, contratos y catálogo de tarifas</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Esta recomendación es un <strong>borrador editable</strong>. El analista debe revisar y validar antes de incluirla en el informe.
            </p>
          </div>

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
              placeholder="Notas sobre permanencia, riesgos, plazos de cambio, etc." rows={6} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CaseRecommendationTab;
