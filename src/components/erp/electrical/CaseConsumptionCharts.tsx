import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, Area } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { EnergyInvoice } from '@/hooks/erp/useEnergyInvoices';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  invoices: EnergyInvoice[];
  contractedPowerP1?: number | null;
  contractedPowerP2?: number | null;
  maxDemandP1?: number | null;
  maxDemandP2?: number | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function CaseConsumptionCharts({ invoices, contractedPowerP1, contractedPowerP2, maxDemandP1, maxDemandP2 }: Props) {
  // Sort invoices by billing_start
  const sorted = useMemo(() =>
    [...invoices].filter(i => i.billing_start).sort((a, b) =>
      new Date(a.billing_start!).getTime() - new Date(b.billing_start!).getTime()
    ), [invoices]);

  // Bar data: consumption evolution
  const consumptionData = useMemo(() =>
    sorted.map(inv => ({
      periodo: format(new Date(inv.billing_start!), 'MMM yy', { locale: es }),
      P1: inv.consumption_p1_kwh || 0,
      P2: inv.consumption_p2_kwh || 0,
      P3: inv.consumption_p3_kwh || 0,
      Total: inv.consumption_total_kwh || 0,
    })), [sorted]);

  // Cost evolution
  const costData = useMemo(() =>
    sorted.map(inv => ({
      periodo: format(new Date(inv.billing_start!), 'MMM yy', { locale: es }),
      Energía: inv.energy_cost || 0,
      Potencia: inv.power_cost || 0,
      Total: inv.total_amount || 0,
      '€/kWh': inv.consumption_total_kwh && inv.total_amount
        ? Math.round((inv.total_amount / inv.consumption_total_kwh) * 10000) / 10000
        : 0,
    })), [sorted]);

  // Pie chart: aggregate P1/P2/P3
  const pieData = useMemo(() => {
    const p1 = sorted.reduce((s, i) => s + (i.consumption_p1_kwh || 0), 0);
    const p2 = sorted.reduce((s, i) => s + (i.consumption_p2_kwh || 0), 0);
    const p3 = sorted.reduce((s, i) => s + (i.consumption_p3_kwh || 0), 0);
    if (p1 + p2 + p3 === 0) return [];
    return [
      { name: 'P1 (Punta)', value: Math.round(p1) },
      { name: 'P2 (Llano)', value: Math.round(p2) },
      { name: 'P3 (Valle)', value: Math.round(p3) },
    ];
  }, [sorted]);

  // Power analysis
  const powerAnalysis = useMemo(() => {
    const issues: { type: 'excess' | 'overdimensioned' | 'ok'; period: string; message: string }[] = [];

    if (contractedPowerP1 && maxDemandP1) {
      const margin = (contractedPowerP1 - maxDemandP1) / contractedPowerP1;
      if (maxDemandP1 > contractedPowerP1) {
        issues.push({ type: 'excess', period: 'P1', message: `Exceso: demanda máx. ${maxDemandP1} kW supera contratada ${contractedPowerP1} kW (+${((maxDemandP1 - contractedPowerP1)).toFixed(1)} kW)` });
      } else if (margin > 0.30) {
        issues.push({ type: 'overdimensioned', period: 'P1', message: `Sobredimensionada: contratada ${contractedPowerP1} kW, máx. demanda ${maxDemandP1} kW (margen ${(margin * 100).toFixed(0)}%). Reducción recomendada.` });
      } else {
        issues.push({ type: 'ok', period: 'P1', message: `Potencia P1 ajustada: ${contractedPowerP1} kW contratada, ${maxDemandP1} kW máx. (margen ${(margin * 100).toFixed(0)}%)` });
      }
    }

    if (contractedPowerP2 && maxDemandP2) {
      const margin = (contractedPowerP2 - maxDemandP2) / contractedPowerP2;
      if (maxDemandP2 > contractedPowerP2) {
        issues.push({ type: 'excess', period: 'P2', message: `Exceso: demanda máx. ${maxDemandP2} kW supera contratada ${contractedPowerP2} kW` });
      } else if (margin > 0.30) {
        issues.push({ type: 'overdimensioned', period: 'P2', message: `Sobredimensionada: contratada ${contractedPowerP2} kW, máx. demanda ${maxDemandP2} kW (margen ${(margin * 100).toFixed(0)}%)` });
      } else {
        issues.push({ type: 'ok', period: 'P2', message: `Potencia P2 ajustada: ${contractedPowerP2} kW contratada, ${maxDemandP2} kW máx.` });
      }
    }

    // Check invoice-level cost coherence
    const avgCostPerKwh = sorted.reduce((s, i) => {
      if (i.total_amount && i.consumption_total_kwh && i.consumption_total_kwh > 0) {
        return s + (i.total_amount / i.consumption_total_kwh);
      }
      return s;
    }, 0) / (sorted.filter(i => i.total_amount && i.consumption_total_kwh).length || 1);

    sorted.forEach(inv => {
      if (inv.total_amount && inv.consumption_total_kwh && inv.consumption_total_kwh > 0) {
        const costPerKwh = inv.total_amount / inv.consumption_total_kwh;
        if (costPerKwh > avgCostPerKwh * 1.5) {
          const periodo = inv.billing_start ? format(new Date(inv.billing_start), 'MMM yy', { locale: es }) : '?';
          issues.push({ type: 'excess', period: periodo, message: `Factura ${periodo}: €/kWh (${costPerKwh.toFixed(4)}) un ${((costPerKwh / avgCostPerKwh - 1) * 100).toFixed(0)}% superior a la media` });
        }
      }
    });

    return issues;
  }, [contractedPowerP1, contractedPowerP2, maxDemandP1, maxDemandP2, sorted]);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Añade facturas para ver gráficos de consumo y análisis de potencia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Power analysis alerts */}
      {powerAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Análisis de potencia e incoherencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {powerAnalysis.map((issue, i) => (
                <div key={i} className={`p-2.5 rounded-lg border text-sm flex items-start gap-2 ${
                  issue.type === 'excess' ? 'border-destructive/30 bg-destructive/5' :
                  issue.type === 'overdimensioned' ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  {issue.type === 'excess' ? <TrendingUp className="h-4 w-4 text-destructive mt-0.5 shrink-0" /> :
                   issue.type === 'overdimensioned' ? <TrendingDown className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> :
                   <Zap className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />}
                  <div>
                    <Badge variant="outline" className="text-[10px] mr-2">{issue.period}</Badge>
                    {issue.message}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consumption stacked bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumo por periodo tarifario</CardTitle>
            <CardDescription>Evolución P1/P2/P3 (kWh)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="periodo" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                <Legend />
                <Bar dataKey="P1" stackId="a" fill={COLORS[0]} />
                <Bar dataKey="P2" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="P3" stackId="a" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución de consumo</CardTitle>
            <CardDescription>% acumulado por periodo tarifario</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sin desglose</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost evolution with €/kWh line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolución de costes y precio medio</CardTitle>
          <CardDescription>Coste energía + potencia y €/kWh medio</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="periodo" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Energía" fill={COLORS[0]} stackId="cost" />
              <Bar yAxisId="left" dataKey="Potencia" fill={COLORS[1]} stackId="cost" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="€/kWh" stroke={COLORS[3]} strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default CaseConsumptionCharts;
