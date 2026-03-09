/**
 * EnergyMultiVectorComparator - Advanced multi-energy recommendation engine
 * Supports electricity + gas + solar scenarios with combined savings analysis
 */
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Zap, Flame, Sun, TrendingDown, TrendingUp, Play, Loader2,
  Award, AlertTriangle, Layers, Battery, Target, Shield,
  ArrowRight, CheckCircle2, Info, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEnergyMibgas } from '@/hooks/erp/useEnergyMibgas';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props { companyId: string; caseId?: string; }

interface ScenarioConfig {
  name: string;
  // Electricity
  elec_consumption_kwh: number;
  elec_power_kw: number;
  elec_current_cost: number;
  elec_tariff: string;
  // Gas
  include_gas: boolean;
  gas_consumption_kwh: number;
  gas_current_cost: number;
  gas_tariff: string;
  // Solar
  include_solar: boolean;
  solar_power_kwp: number;
  solar_with_battery: boolean;
  solar_battery_kwh: number;
  solar_self_consumption_pct: number;
  solar_surplus_compensation: number;
  // Options
  tariff_type: 'fixed' | 'indexed' | 'both';
}

interface ScenarioResult {
  id: string;
  scenario: string;
  elec_savings: number;
  gas_savings: number;
  solar_savings: number;
  total_savings: number;
  total_current_cost: number;
  total_recommended_cost: number;
  confidence: number;
  recommendations: RecommendationItem[];
  alerts: AlertItem[];
  breakdown: BreakdownItem[];
}

interface RecommendationItem {
  type: 'electricity' | 'gas' | 'solar';
  title: string;
  detail: string;
  savings: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

interface AlertItem {
  type: 'warning' | 'info' | 'success';
  message: string;
}

interface BreakdownItem {
  component: string;
  current: number;
  recommended: number;
  savings: number;
}

const DEFAULT_SCENARIO: ScenarioConfig = {
  name: 'Escenario base',
  elec_consumption_kwh: 300,
  elec_power_kw: 4.6,
  elec_current_cost: 120,
  elec_tariff: '2.0TD',
  include_gas: false,
  gas_consumption_kwh: 500,
  gas_current_cost: 60,
  gas_tariff: 'RL.1',
  include_solar: false,
  solar_power_kwp: 4,
  solar_with_battery: false,
  solar_battery_kwh: 5,
  solar_self_consumption_pct: 30,
  solar_surplus_compensation: 0.05,
  tariff_type: 'both',
};

const CHART_COLORS = ['hsl(45, 93%, 47%)', 'hsl(217, 91%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)'];

export function EnergyMultiVectorComparator({ companyId, caseId }: Props) {
  const [scenario, setScenario] = useState<ScenarioConfig>(DEFAULT_SCENARIO);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      // Primary: call backend multi-vector comparator
      const { data, error } = await supabase.functions.invoke('energy-multi-vector-comparator', {
        body: {
          case_id: caseId || `scenario-${Date.now()}`,
          energy_type: scenario.include_solar && scenario.include_gas ? 'mixed'
            : scenario.include_solar ? 'solar'
            : scenario.include_gas ? 'gas'
            : 'electricity',
          consumption: {
            p1_kwh: scenario.elec_consumption_kwh,
            p2_kwh: Math.round(scenario.elec_consumption_kwh * 0.7),
            p3_kwh: Math.round(scenario.elec_consumption_kwh * 0.4),
          },
          power: {
            p1_kw: scenario.elec_power_kw,
            p2_kw: scenario.elec_power_kw,
          },
          current_cost: scenario.elec_current_cost,
          billing_days: 30,
          access_tariff: scenario.elec_tariff,
          solar_kw_peak: scenario.include_solar ? scenario.solar_power_kwp : undefined,
          solar_self_consumption_pct: scenario.include_solar ? scenario.solar_self_consumption_pct : undefined,
          battery_kwh: scenario.solar_with_battery ? scenario.solar_battery_kwh : undefined,
          gas_consumption_kwh: scenario.include_gas ? scenario.gas_consumption_kwh : undefined,
          gas_current_cost: scenario.include_gas ? scenario.gas_current_cost : undefined,
        },
      });

      if (!error && data?.success) {
        // Transform backend result to UI format
        const backendResult = data;
        const recommendations: RecommendationItem[] = [];
        const alerts: AlertItem[] = [];
        const breakdown: BreakdownItem[] = [];

        // Electricity breakdown from tariff results
        const bestTariff = backendResult.best_tariff;
        const elecSavings = bestTariff ? Math.round(bestTariff.savings * 12) : 0;
        breakdown.push({
          component: 'Energía eléctrica',
          current: scenario.elec_current_cost * 12,
          recommended: bestTariff ? Math.round(bestTariff.total_cost * 12) : scenario.elec_current_cost * 12,
          savings: elecSavings,
        });

        if (bestTariff) {
          recommendations.push({
            type: 'electricity',
            title: `Cambiar a ${bestTariff.tariff_name} (${bestTariff.supplier})`,
            detail: `Ahorro ${bestTariff.savings_pct.toFixed(1)}%. ${bestTariff.notes || ''}`,
            savings: elecSavings,
            confidence: backendResult.confidence_score || 70,
            priority: bestTariff.savings_pct > 10 ? 'high' : 'medium',
          });
        }

        // Power recommendation
        if (backendResult.recommended_power?.notes?.length > 0) {
          backendResult.recommended_power.notes.forEach((note: string) => {
            alerts.push({ type: 'warning', message: note });
          });
        }

        // Solar scenario
        let solarSavings = 0;
        if (backendResult.solar_scenario) {
          solarSavings = backendResult.solar_scenario.savings_estimate;
          breakdown.push({
            component: 'Autoconsumo solar',
            current: 0,
            recommended: -solarSavings,
            savings: solarSavings,
          });
          recommendations.push({
            type: 'solar',
            title: 'Autoconsumo fotovoltaico',
            detail: `Producción: ${backendResult.solar_scenario.annual_production_kwh} kWh/año. Payback: ${backendResult.solar_scenario.payback_years} años`,
            savings: solarSavings,
            confidence: 80,
            priority: 'high',
          });
        }

        // Gas scenario
        let gasSavings = 0;
        if (backendResult.gas_scenario?.best_gas) {
          gasSavings = Math.round(backendResult.gas_scenario.best_gas.savings * 12);
          breakdown.push({
            component: 'Gas natural',
            current: (scenario.gas_current_cost || 0) * 12,
            recommended: Math.round(backendResult.gas_scenario.best_gas.cost * 12),
            savings: gasSavings,
          });
          recommendations.push({
            type: 'gas',
            title: `Gas: ${backendResult.gas_scenario.best_gas.supplier}`,
            detail: `Ahorro estimado ${gasSavings}€/año`,
            savings: gasSavings,
            confidence: 65,
            priority: 'medium',
          });
        }

        // Data quality alerts
        if (!backendResult.data_quality?.has_real_market_data) {
          alerts.push({ type: 'info', message: 'Precios de mercado: usando último dato disponible' });
        }
        if (backendResult.data_quality?.limitations?.length > 0) {
          backendResult.data_quality.limitations.forEach((l: string) => {
            alerts.push({ type: 'info', message: l });
          });
        }

        const totalSavings = elecSavings + solarSavings + gasSavings;
        const totalCurrent = scenario.elec_current_cost * 12 + (scenario.include_gas ? scenario.gas_current_cost * 12 : 0);

        if (totalSavings > 0) {
          alerts.push({ type: 'success', message: `Ahorro potencial total: ${totalSavings.toLocaleString()} €/año` });
        }

        setResult({
          id: crypto.randomUUID(),
          scenario: scenario.name,
          elec_savings: elecSavings,
          gas_savings: gasSavings,
          solar_savings: solarSavings,
          total_savings: totalSavings,
          total_current_cost: totalCurrent,
          total_recommended_cost: totalCurrent - totalSavings,
          confidence: backendResult.confidence_score || 70,
          recommendations: recommendations.sort((a, b) => b.savings - a.savings),
          alerts,
          breakdown,
        });
        setActiveTab('results');
        toast.success(`Análisis backend completado: ${backendResult.tariff_results?.length || 0} tarifas reales comparadas`);
      } else {
        throw new Error('Backend error');
      }
    } catch (err) {
      console.warn('[MultiVectorComparator] Backend analysis failed, using local calc:', err);
      const localResult = computeLocalAnalysis(scenario);
      setResult(localResult);
      setActiveTab('results');
      toast.info('Análisis completado (cálculo local — backend no disponible)');
    } finally {
      setAnalyzing(false);
    }
  }, [scenario, companyId, caseId]);

  const computeLocalAnalysis = (s: ScenarioConfig): ScenarioResult => {
    const recommendations: RecommendationItem[] = [];
    const alerts: AlertItem[] = [];
    const breakdown: BreakdownItem[] = [];

    // Electricity analysis
    const elecSavingsRate = s.tariff_type === 'indexed' ? 0.18 : s.tariff_type === 'fixed' ? 0.10 : 0.14;
    const elecSavings = Math.round(s.elec_current_cost * elecSavingsRate * 12);
    breakdown.push({ component: 'Energía eléctrica', current: s.elec_current_cost * 12, recommended: Math.round(s.elec_current_cost * (1 - elecSavingsRate) * 12), savings: elecSavings });

    if (s.elec_power_kw > 5 && s.elec_consumption_kwh < 200) {
      recommendations.push({ type: 'electricity', title: 'Reducir potencia contratada', detail: `Potencia actual ${s.elec_power_kw} kW parece sobredimensionada para ${s.elec_consumption_kwh} kWh/mes`, savings: Math.round(s.elec_power_kw * 2 * 12), confidence: 85, priority: 'high' });
      alerts.push({ type: 'warning', message: 'Potencia sobredimensionada detectada' });
    }
    recommendations.push({ type: 'electricity', title: 'Optimizar tarifa eléctrica', detail: `Cambio a tarifa ${s.tariff_type === 'indexed' ? 'indexada' : 'optimizada'} con ahorro estimado del ${Math.round(elecSavingsRate * 100)}%`, savings: elecSavings, confidence: 75, priority: 'medium' });

    // Gas analysis
    let gasSavings = 0;
    if (s.include_gas) {
      const gasSavingsRate = 0.12;
      gasSavings = Math.round(s.gas_current_cost * gasSavingsRate * 12);
      breakdown.push({ component: 'Gas natural', current: s.gas_current_cost * 12, recommended: Math.round(s.gas_current_cost * (1 - gasSavingsRate) * 12), savings: gasSavings });
      recommendations.push({ type: 'gas', title: 'Optimizar tarifa de gas', detail: `Tarifa actual ${s.gas_tariff}. Posible ahorro del ${Math.round(gasSavingsRate * 100)}%`, savings: gasSavings, confidence: 70, priority: 'medium' });

      if (s.gas_consumption_kwh > 8000) {
        recommendations.push({ type: 'gas', title: 'Revisar eficiencia caldera', detail: 'Alto consumo de gas. Evaluar sustitución por caldera de condensación', savings: Math.round(s.gas_current_cost * 0.08 * 12), confidence: 60, priority: 'low' });
      }
    }

    // Solar analysis
    let solarSavings = 0;
    if (s.include_solar) {
      const annualGeneration = s.solar_power_kwp * 1500; // kWh/year average Spain
      const selfConsumed = annualGeneration * (s.solar_self_consumption_pct / 100);
      const surplus = annualGeneration - selfConsumed;
      const savingsFromSelf = selfConsumed * 0.15; // €/kWh avoided
      const compensationIncome = surplus * s.solar_surplus_compensation;
      solarSavings = Math.round(savingsFromSelf + compensationIncome);

      breakdown.push({ component: 'Autoconsumo solar', current: 0, recommended: -solarSavings, savings: solarSavings });

      recommendations.push({ type: 'solar', title: 'Aprovechamiento del autoconsumo', detail: `${s.solar_power_kwp} kWp generará ~${annualGeneration.toFixed(0)} kWh/año. Autoconsumo ${s.solar_self_consumption_pct}%, excedentes ${(100 - s.solar_self_consumption_pct)}%`, savings: solarSavings, confidence: 80, priority: 'high' });

      if (s.solar_self_consumption_pct < 25) {
        alerts.push({ type: 'warning', message: 'Autoconsumo bajo. Considerar batería o ajuste de hábitos' });
        if (!s.solar_with_battery) {
          recommendations.push({ type: 'solar', title: 'Instalar batería', detail: `Con batería de ${s.solar_battery_kwh || 5} kWh se podría aumentar autoconsumo al 50-60%`, savings: Math.round(solarSavings * 0.4), confidence: 65, priority: 'medium' });
        }
      }

      if (s.solar_surplus_compensation < 0.04) {
        alerts.push({ type: 'warning', message: 'Compensación de excedentes baja. Revisar comercializadora' });
      }

      if (s.solar_with_battery) {
        recommendations.push({ type: 'solar', title: 'Batería instalada', detail: `${s.solar_battery_kwh} kWh de almacenamiento. Maximiza autoconsumo nocturno`, savings: Math.round(solarSavings * 0.3), confidence: 70, priority: 'medium' });
      }
    }

    // Combined recommendations
    if (s.include_gas && s.include_solar) {
      recommendations.push({ type: 'electricity', title: 'Paquete energético integral', detail: 'Negociar con comercializadora oferta combinada elec+gas con autoconsumo. Mayor poder de negociación', savings: Math.round((elecSavings + gasSavings) * 0.05), confidence: 55, priority: 'low' });
    }

    const totalSavings = elecSavings + gasSavings + solarSavings;
    const totalCurrent = s.elec_current_cost * 12 + (s.include_gas ? s.gas_current_cost * 12 : 0);
    const confidence = recommendations.length > 0 ? Math.round(recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length) : 0;

    if (totalSavings > 0) {
      alerts.push({ type: 'success', message: `Ahorro potencial total: ${totalSavings.toLocaleString()} €/año` });
    }

    return {
      id: crypto.randomUUID(),
      scenario: s.name,
      elec_savings: elecSavings,
      gas_savings: gasSavings,
      solar_savings: solarSavings,
      total_savings: totalSavings,
      total_current_cost: totalCurrent,
      total_recommended_cost: totalCurrent - totalSavings,
      confidence,
      recommendations: recommendations.sort((a, b) => b.savings - a.savings),
      alerts,
      breakdown,
    };
  };

  const savingsChart = useMemo(() => {
    if (!result) return [];
    return [
      { name: 'Electricidad', ahorro: result.elec_savings },
      ...(scenario.include_gas ? [{ name: 'Gas', ahorro: result.gas_savings }] : []),
      ...(scenario.include_solar ? [{ name: 'Solar', ahorro: result.solar_savings }] : []),
    ];
  }, [result, scenario]);

  const breakdownChart = useMemo(() => {
    if (!result) return [];
    return result.breakdown.map(b => ({
      name: b.component,
      actual: b.current,
      recomendado: b.recommended < 0 ? 0 : b.recommended,
      ahorro: b.savings,
    }));
  }, [result]);

  const confidenceData = useMemo(() => {
    if (!result) return [];
    return result.recommendations.slice(0, 5).map(r => ({
      subject: r.title.substring(0, 20),
      confianza: r.confidence,
      ahorro: Math.min(100, (r.savings / (result.total_savings || 1)) * 100),
    }));
  }, [result]);

  const updateScenario = (key: keyof ScenarioConfig, value: any) =>
    setScenario(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Motor de Recomendación Multi-Vector
          </h2>
          <p className="text-sm text-muted-foreground">Análisis combinado electricidad + gas + solar con escenarios</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure" className="text-xs">Configurar escenario</TabsTrigger>
          <TabsTrigger value="results" className="text-xs" disabled={!result}>Resultados</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs" disabled={!result}>Recomendaciones</TabsTrigger>
        </TabsList>

        {/* CONFIGURE */}
        <TabsContent value="configure" className="mt-3">
          <div className="space-y-4">
            {/* Electricity - always on */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Electricidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Consumo mensual (kWh)</Label><Input type="number" value={scenario.elec_consumption_kwh} onChange={e => updateScenario('elec_consumption_kwh', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Potencia (kW)</Label><Input type="number" value={scenario.elec_power_kw} onChange={e => updateScenario('elec_power_kw', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Coste mensual actual (€)</Label><Input type="number" value={scenario.elec_current_cost} onChange={e => updateScenario('elec_current_cost', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Tipo tarifa preferida</Label>
                    <Select value={scenario.tariff_type} onValueChange={v => updateScenario('tariff_type', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fija</SelectItem>
                        <SelectItem value="indexed">Indexada</SelectItem>
                        <SelectItem value="both">Ambas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gas - toggle */}
            <Card className={cn(!scenario.include_gas && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-blue-500" /> Gas natural</CardTitle>
                  <Switch checked={scenario.include_gas} onCheckedChange={v => updateScenario('include_gas', v)} />
                </div>
              </CardHeader>
              {scenario.include_gas && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><Label className="text-xs">Consumo mensual (kWh)</Label><Input type="number" value={scenario.gas_consumption_kwh} onChange={e => updateScenario('gas_consumption_kwh', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Coste mensual actual (€)</Label><Input type="number" value={scenario.gas_current_cost} onChange={e => updateScenario('gas_current_cost', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Tarifa gas</Label><Input value={scenario.gas_tariff} onChange={e => updateScenario('gas_tariff', e.target.value)} placeholder="RL.1, RL.2..." className="h-8 text-sm" /></div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Solar - toggle */}
            <Card className={cn(!scenario.include_solar && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Sun className="h-4 w-4 text-orange-400" /> Autoconsumo solar</CardTitle>
                  <Switch checked={scenario.include_solar} onCheckedChange={v => updateScenario('include_solar', v)} />
                </div>
              </CardHeader>
              {scenario.include_solar && (
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label className="text-xs">Potencia (kWp)</Label><Input type="number" value={scenario.solar_power_kwp} onChange={e => updateScenario('solar_power_kwp', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">% Autoconsumo</Label><Input type="number" value={scenario.solar_self_consumption_pct} onChange={e => updateScenario('solar_self_consumption_pct', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Compensación exc. (€/kWh)</Label><Input type="number" step="0.01" value={scenario.solar_surplus_compensation} onChange={e => updateScenario('solar_surplus_compensation', parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={scenario.solar_with_battery} onCheckedChange={v => updateScenario('solar_with_battery', v)} />
                      <Label className="text-xs">Batería</Label>
                      {scenario.solar_with_battery && (
                        <Input type="number" value={scenario.solar_battery_kwh} onChange={e => updateScenario('solar_battery_kwh', parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20" placeholder="kWh" />
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex justify-end">
              <Button onClick={runAnalysis} disabled={analyzing} className="gap-2" size="lg">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Analizar escenario
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* RESULTS */}
        <TabsContent value="results" className="mt-3">
          {result && (
            <div className="space-y-4">
              {/* Alerts */}
              {result.alerts.length > 0 && (
                <div className="space-y-2">
                  {result.alerts.map((alert, i) => (
                    <Card key={i} className={cn("border-l-4", alert.type === 'warning' ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' : alert.type === 'success' ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20')}>
                      <CardContent className="p-3 flex items-center gap-2">
                        {alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-orange-500" /> : alert.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Info className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm">{alert.message}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Ahorro total', value: `${result.total_savings.toLocaleString()} €/año`, icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Ahorro elec.', value: `${result.elec_savings.toLocaleString()} €`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  ...(scenario.include_gas ? [{ label: 'Ahorro gas', value: `${result.gas_savings.toLocaleString()} €`, icon: Flame, color: 'text-blue-500', bg: 'bg-blue-500/10' }] : []),
                  ...(scenario.include_solar ? [{ label: 'Ahorro solar', value: `${result.solar_savings.toLocaleString()} €`, icon: Sun, color: 'text-orange-400', bg: 'bg-orange-500/10' }] : []),
                  { label: 'Confianza', value: `${result.confidence}%`, icon: Shield, color: result.confidence >= 70 ? 'text-emerald-500' : 'text-yellow-500', bg: result.confidence >= 70 ? 'bg-emerald-500/10' : 'bg-yellow-500/10' },
                ].map(kpi => {
                  const Icon = kpi.icon;
                  return (
                    <Card key={kpi.label}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                          <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-sm font-bold">{kpi.value}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Savings by vector */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro por vector energético</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={savingsChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => [`${v.toLocaleString()} €/año`]} />
                        <Bar dataKey="ahorro" name="Ahorro €/año" radius={[4, 4, 0, 0]}>
                          {savingsChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Before vs After */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Coste actual vs recomendado</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={breakdownChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => [`${v.toLocaleString()} €/año`]} />
                        <Bar dataKey="actual" fill="hsl(0, 84%, 60%)" name="Coste actual" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="recomendado" fill="hsl(142, 71%, 45%)" name="Recomendado" radius={[4, 4, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Confidence radar */}
              {confidenceData.length > 2 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Perfil de confianza</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={confidenceData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <PolarRadiusAxis domain={[0, 100]} fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Radar name="Confianza" dataKey="confianza" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                        <Radar name="Peso ahorro" dataKey="ahorro" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} />
                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="mt-3">
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">{result.recommendations.length} recomendaciones</Badge>
                <Badge variant={result.confidence >= 70 ? 'default' : 'secondary'} className="text-xs">
                  <Shield className="h-3 w-3 mr-1" /> Confianza: {result.confidence}%
                </Badge>
              </div>

              {result.recommendations.map((rec, i) => (
                <Card key={i} className={cn("hover:shadow-sm transition-shadow border-l-4", rec.type === 'electricity' ? 'border-l-amber-500' : rec.type === 'gas' ? 'border-l-blue-500' : 'border-l-orange-400')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {rec.type === 'electricity' ? <Zap className="h-4 w-4 text-amber-500" /> : rec.type === 'gas' ? <Flame className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-orange-400" />}
                          <span className="font-semibold text-sm">{rec.title}</span>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px]">
                            {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.detail}</p>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Confianza: {rec.confidence}%</span>
                          <Progress value={rec.confidence} className="w-20 h-1.5" />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{rec.savings.toLocaleString()} €</p>
                        <p className="text-[10px] text-muted-foreground">ahorro/año</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {result.recommendations.length === 0 && (
                <Card className="border-dashed"><CardContent className="py-8 text-center">
                  <Info className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No se generaron recomendaciones para este escenario</p>
                </CardContent></Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnergyMultiVectorComparator;
