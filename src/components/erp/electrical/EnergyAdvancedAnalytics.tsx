/**
 * EnergyAdvancedAnalytics - Premium multi-energy analytics with professional charts
 * Consumption trends, cost evolution, power vs demand, savings tracking, energy mix
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Zap, Flame, Sun, BarChart3, TrendingDown, TrendingUp, Loader2,
  Activity, Target, Gauge, Download
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props { companyId: string; }

const COLORS = {
  electricity: 'hsl(45, 93%, 47%)',
  gas: 'hsl(217, 91%, 60%)',
  solar: 'hsl(25, 95%, 53%)',
  validated: 'hsl(142, 71%, 45%)',
  estimated: 'hsl(45, 93%, 47%)',
  current: 'hsl(0, 84%, 60%)',
  recommended: 'hsl(142, 71%, 45%)',
};

export function EnergyAdvancedAnalytics({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('savings');
  const [data, setData] = useState({
    savingsByType: [] as { type: string; estimated: number; validated: number }[],
    costBreakdown: [] as { name: string; value: number; color: string }[],
    consumptionByMonth: [] as { month: string; electricity: number; gas: number }[],
    casesByEnergy: [] as { type: string; count: number; color: string }[],
    savingsEvolution: [] as { month: string; cumEstimated: number; cumValidated: number }[],
    powerAnalysis: [] as { case: string; contracted: number; demand: number; optimal: number }[],
    costComparison: [] as { case: string; current: number; recommended: number; savings: number }[],
    statusFunnel: [] as { stage: string; count: number }[],
    totalEstimated: number;
    totalValidated: number;
    validationRate: number;
    totalCases: number;
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, invoicesRes, suppliesRes, recsRes] = await Promise.all([
        supabase.from('energy_cases')
          .select('id, title, status, energy_type, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings, created_at')
          .eq('company_id', companyId),
        supabase.from('energy_invoices')
          .select('case_id, energy_type, total_amount, consumption_total_kwh, gas_consumption_kwh, billing_start')
          .eq('company_id', companyId).order('billing_start', { ascending: true }),
        supabase.from('energy_supplies')
          .select('case_id, contracted_power_p1, contracted_power_p2, max_demand_p1, max_demand_p2')
          .eq('company_id', companyId),
        supabase.from('energy_recommendations')
          .select('case_id, recommended_power_p1, recommended_power_p2, monthly_savings_estimate')
          .eq('company_id', companyId),
      ]);

      const cases = (casesRes.data || []) as any[];
      const invoices = (invoicesRes.data || []) as any[];
      const supplies = (suppliesRes.data || []) as any[];
      const recs = (recsRes.data || []) as any[];

      // Savings by type
      let elecEst = 0, gasEst = 0, solarEst = 0, elecVal = 0, gasVal = 0, solarVal = 0;
      const typeCount: Record<string, number> = {};
      const statusCount: Record<string, number> = {};
      cases.forEach(c => {
        elecEst += c.estimated_annual_savings || 0;
        gasEst += c.estimated_gas_savings || 0;
        solarEst += c.estimated_solar_savings || 0;
        elecVal += c.validated_annual_savings || 0;
        gasVal += c.validated_gas_savings || 0;
        solarVal += c.validated_solar_savings || 0;
        typeCount[c.energy_type || 'electricity'] = (typeCount[c.energy_type || 'electricity'] || 0) + 1;
        const statusLabel = c.status === 'draft' ? 'Borrador' : c.status === 'analysis' ? 'Análisis' :
          c.status === 'proposal' ? 'Propuesta' : c.status === 'implementation' ? 'Implementación' :
          c.status === 'completed' ? 'Completado' : c.status;
        statusCount[statusLabel] = (statusCount[statusLabel] || 0) + 1;
      });

      const totalEst = elecEst + gasEst + solarEst;
      const totalVal = elecVal + gasVal + solarVal;

      // Consumption by month
      const monthlyConsumption: Record<string, { electricity: number; gas: number }> = {};
      invoices.forEach(inv => {
        if (!inv.billing_start) return;
        const m = format(new Date(inv.billing_start), 'MMM yy', { locale: es });
        if (!monthlyConsumption[m]) monthlyConsumption[m] = { electricity: 0, gas: 0 };
        if (inv.energy_type === 'gas') {
          monthlyConsumption[m].gas += inv.gas_consumption_kwh || 0;
        } else {
          monthlyConsumption[m].electricity += inv.consumption_total_kwh || 0;
        }
      });

      // Savings evolution (cumulative by month of case creation)
      const savingsEvo: { month: string; cumEstimated: number; cumValidated: number }[] = [];
      let cumEst = 0, cumVal = 0;
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const mStr = format(d, 'MMM yy', { locale: es });
        const monthCases = cases.filter(c => {
          const cd = new Date(c.created_at);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        });
        cumEst += monthCases.reduce((s, c) => s + (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0), 0);
        cumVal += monthCases.reduce((s, c) => s + (c.validated_annual_savings || 0) + (c.validated_gas_savings || 0) + (c.validated_solar_savings || 0), 0);
        savingsEvo.push({ month: mStr, cumEstimated: cumEst, cumValidated: cumVal });
      }

      // Power analysis (top 5 supplies with power data)
      const powerData = supplies
        .filter(s => s.contracted_power_p1 > 0)
        .slice(0, 5)
        .map(s => {
          const rec = recs.find(r => r.case_id === s.case_id);
          const c = cases.find(cs => cs.id === s.case_id);
          return {
            case: c?.title?.substring(0, 20) || s.case_id.substring(0, 8),
            contracted: s.contracted_power_p1 || 0,
            demand: s.max_demand_p1 || 0,
            optimal: rec?.recommended_power_p1 || s.max_demand_p1 * 1.1 || 0,
          };
        });

      // Cost comparison
      const costComp = invoices
        .filter(inv => inv.total_amount > 0)
        .reduce((acc: Record<string, { current: number; count: number }>, inv: any) => {
          const c = cases.find(cs => cs.id === inv.case_id);
          const key = c?.title?.substring(0, 20) || inv.case_id?.substring(0, 8) || 'N/A';
          if (!acc[key]) acc[key] = { current: 0, count: 0 };
          acc[key].current += inv.total_amount || 0;
          acc[key].count++;
          return acc;
        }, {});

      const costCompData = Object.entries(costComp).slice(0, 6).map(([caseName, d]) => {
        const savings = recs.find(r => cases.find(c => c.title?.startsWith(caseName) && c.id === r.case_id))?.monthly_savings_estimate || d.current * 0.15;
        return {
          case: caseName,
          current: Math.round(d.current),
          recommended: Math.round(d.current - savings * d.count),
          savings: Math.round(savings * d.count),
        };
      });

      const typeLabels: Record<string, string> = { electricity: 'Electricidad', gas: 'Gas', solar: 'Solar', mixed: 'Mixto' };
      const typeColors: Record<string, string> = { electricity: COLORS.electricity, gas: COLORS.gas, solar: COLORS.solar, mixed: 'hsl(271, 91%, 65%)' };

      setData({
        savingsByType: [
          { type: 'Electricidad', estimated: elecEst, validated: elecVal },
          { type: 'Gas', estimated: gasEst, validated: gasVal },
          { type: 'Solar', estimated: solarEst, validated: solarVal },
        ].filter(d => d.estimated > 0 || d.validated > 0),
        costBreakdown: [
          { name: 'Electricidad', value: elecEst, color: COLORS.electricity },
          { name: 'Gas', value: gasEst, color: COLORS.gas },
          { name: 'Solar', value: solarEst, color: COLORS.solar },
        ].filter(d => d.value > 0),
        consumptionByMonth: Object.entries(monthlyConsumption).map(([month, v]) => ({ month, ...v })),
        casesByEnergy: Object.entries(typeCount).map(([type, count]) => ({
          type: typeLabels[type] || type, count, color: typeColors[type] || 'hsl(var(--primary))',
        })),
        savingsEvolution: savingsEvo,
        powerAnalysis: powerData,
        costComparison: costCompData,
        statusFunnel: Object.entries(statusCount).map(([stage, count]) => ({ stage, count })),
        totalEstimated: totalEst,
        totalValidated: totalVal,
        validationRate: totalEst > 0 ? Math.round((totalVal / totalEst) * 100) : 0,
        totalCases: cases.length,
      });
    } catch (err) {
      console.error('[EnergyAdvancedAnalytics] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const exportAnalyticsPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text('ANALÍTICA ENERGÉTICA AVANZADA', 105, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 105, 22, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total expedientes', String(data.totalCases)],
        ['Ahorro estimado total', `${data.totalEstimated.toLocaleString('es-ES')} €`],
        ['Ahorro validado total', `${data.totalValidated.toLocaleString('es-ES')} €`],
        ['Tasa de validación', `${data.validationRate}%`],
      ],
      headStyles: { fillColor: [30, 58, 95] },
    });

    if (data.savingsByType.length > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 80;
      autoTable(doc, {
        startY: y + 8,
        head: [['Vector', 'Estimado €/año', 'Validado €/año']],
        body: data.savingsByType.map(d => [d.type, d.estimated.toLocaleString('es-ES'), d.validated.toLocaleString('es-ES')]),
        headStyles: { fillColor: [30, 58, 95] },
      });
    }

    doc.save(`analitica-energetica-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }, [data]);

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Cargando analítica...</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Analítica Energética Avanzada</h2>
          <Badge variant="secondary" className="text-xs">{data.totalCases} expedientes</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={exportAnalyticsPDF}>
          <Download className="h-3.5 w-3.5 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ahorro estimado', value: `${(data.totalEstimated / 1000).toFixed(1)}k €`, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: TrendingDown },
          { label: 'Ahorro validado', value: `${(data.totalValidated / 1000).toFixed(1)}k €`, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Target },
          { label: 'Tasa validación', value: `${data.validationRate}%`, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Activity },
          { label: 'Gap pendiente', value: `${((data.totalEstimated - data.totalValidated) / 1000).toFixed(1)}k €`, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Gauge },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-lg font-bold">{kpi.value}</p></div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <TabsList className="flex flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="savings" className="text-xs">Ahorro</TabsTrigger>
          <TabsTrigger value="evolution" className="text-xs">Evolución</TabsTrigger>
          <TabsTrigger value="consumption" className="text-xs">Consumo</TabsTrigger>
          <TabsTrigger value="power" className="text-xs">Potencia</TabsTrigger>
          <TabsTrigger value="cost" className="text-xs">Coste actual vs recomendado</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro estimado vs validado por vector</CardTitle></CardHeader>
              <CardContent>
                {data.savingsByType.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.savingsByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                      <Legend />
                      <Bar dataKey="estimated" fill={COLORS.estimated} name="Estimado €/año" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="validated" fill={COLORS.validated} name="Validado €/año" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mix de ahorro energético</CardTitle></CardHeader>
              <CardContent>
                {data.costBreakdown.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data.costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3}
                        label={({ name, value }) => `${name}: ${(value / 1000).toFixed(1)}k€`}>
                        {data.costBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución acumulada del ahorro (12 meses)</CardTitle></CardHeader>
            <CardContent>
              {data.savingsEvolution.every(d => d.cumEstimated === 0) ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de evolución</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.savingsEvolution}>
                    <defs>
                      <linearGradient id="cumEstGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.estimated} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.estimated} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cumValGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.validated} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.validated} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    <Area type="monotone" dataKey="cumEstimated" stroke={COLORS.estimated} fill="url(#cumEstGrad)" name="Estimado acumulado" strokeWidth={2} />
                    <Area type="monotone" dataKey="cumValidated" stroke={COLORS.validated} fill="url(#cumValGrad)" name="Validado acumulado" strokeWidth={2} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Consumo histórico por tipo de energía</CardTitle></CardHeader>
            <CardContent>
              {data.consumptionByMonth.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de consumo</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.consumptionByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `${v.toLocaleString('es-ES')} kWh`} />
                    <Legend />
                    <Bar dataKey="electricity" stackId="a" fill={COLORS.electricity} name="Electricidad kWh" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="gas" stackId="a" fill={COLORS.gas} name="Gas kWh" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="power" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Potencia contratada vs demanda vs óptima</CardTitle></CardHeader>
            <CardContent>
              {data.powerAnalysis.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de potencia</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.powerAnalysis} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} unit=" kW" />
                    <YAxis dataKey="case" type="category" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="contracted" fill={COLORS.current} name="Contratada kW" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="demand" fill={COLORS.estimated} name="Demanda real kW" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="optimal" fill={COLORS.validated} name="Óptima kW" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Coste actual vs recomendado (antes/después)</CardTitle></CardHeader>
            <CardContent>
              {data.costComparison.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de coste</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.costComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="case" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    <Legend />
                    <Bar dataKey="current" fill={COLORS.current} name="Coste actual €" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recommended" fill={COLORS.recommended} name="Coste recomendado €" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expedientes por tipo de energía</CardTitle></CardHeader>
              <CardContent>
                {data.casesByEnergy.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin expedientes</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data.casesByEnergy} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} innerRadius={35} paddingAngle={3} label>
                        {data.casesByEnergy.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Funnel de estados</CardTitle></CardHeader>
              <CardContent>
                {data.statusFunnel.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.statusFunnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="stage" type="category" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Expedientes" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnergyAdvancedAnalytics;
