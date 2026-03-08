/**
 * CaseEnergySummaryTab - Unified energy summary for a case
 * Shows electricity + gas + solar savings, risk, urgency
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Zap, Flame, Sun, TrendingDown, AlertTriangle, Clock, Target, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { useEnergySolarInstallations } from '@/hooks/erp/useEnergySolarInstallations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  caseId: string;
  companyId: string;
}

const COLORS = ['hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(25,95%,53%)', 'hsl(142,71%,45%)'];

export function CaseEnergySummaryTab({ caseId, companyId }: Props) {
  const { energyCase } = useEnergyCase(caseId);
  const { installations } = useEnergySolarInstallations(caseId, companyId);
  const [gasStats, setGasStats] = useState({ contracts: 0, invoices: 0, totalCost: 0, totalConsumption: 0 });
  const [elecStats, setElecStats] = useState({ contracts: 0, invoices: 0, totalCost: 0, totalConsumption: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const [gasContracts, gasInvoices, elecContracts, elecInvoices] = await Promise.all([
        supabase.from('energy_contracts').select('id', { count: 'exact', head: true }).eq('case_id', caseId).eq('energy_type', 'gas'),
        supabase.from('energy_invoices').select('total_amount, gas_consumption_kwh').eq('case_id', caseId).eq('energy_type', 'gas'),
        supabase.from('energy_contracts').select('id', { count: 'exact', head: true }).eq('case_id', caseId).eq('energy_type', 'electricity'),
        supabase.from('energy_invoices').select('total_amount, consumption_total_kwh').eq('case_id', caseId).eq('energy_type', 'electricity'),
      ]);

      setGasStats({
        contracts: (gasContracts as any).count || 0,
        invoices: gasInvoices.data?.length || 0,
        totalCost: (gasInvoices.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0),
        totalConsumption: (gasInvoices.data || []).reduce((s: number, i: any) => s + (i.gas_consumption_kwh || 0), 0),
      });
      setElecStats({
        contracts: (elecContracts as any).count || 0,
        invoices: elecInvoices.data?.length || 0,
        totalCost: (elecInvoices.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0),
        totalConsumption: (elecInvoices.data || []).reduce((s: number, i: any) => s + (i.consumption_total_kwh || 0), 0),
      });
    } catch (err) {
      console.error('[CaseEnergySummaryTab] stats error:', err);
    }
  }, [caseId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!energyCase) return null;

  const elecSavings = energyCase.estimated_annual_savings || 0;
  const gasSavings = energyCase.estimated_gas_savings || 0;
  const solarSavings = energyCase.estimated_solar_savings || 0;
  const totalSavings = elecSavings + gasSavings + solarSavings;

  const validatedElec = energyCase.validated_annual_savings || 0;
  const validatedGas = energyCase.validated_gas_savings || 0;
  const validatedSolar = energyCase.validated_solar_savings || 0;
  const totalValidated = validatedElec + validatedGas + validatedSolar;

  const solarPower = installations.reduce((s, i) => s + i.installed_power_kwp, 0);
  const daysToExpiry = energyCase.contract_end_date ? differenceInDays(new Date(energyCase.contract_end_date), new Date()) : null;

  const savingsBreakdown = [
    { name: 'Electricidad', estimado: elecSavings, validado: validatedElec },
    { name: 'Gas', estimado: gasSavings, validado: validatedGas },
    { name: 'Solar', estimado: solarSavings, validado: validatedSolar },
  ].filter(d => d.estimado > 0 || d.validado > 0);

  const energyMix = [
    { name: 'Electricidad', value: elecStats.totalCost },
    { name: 'Gas', value: gasStats.totalCost },
  ].filter(d => d.value > 0);

  const riskLevel = energyCase.risk_level || 'medium';

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Resumen energético integral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Ahorro total est.', value: `${totalSavings.toLocaleString()} €/año`, icon: TrendingDown, color: 'text-emerald-500' },
              { label: 'Ahorro validado', value: `${totalValidated.toLocaleString()} €/año`, icon: TrendingDown, color: 'text-green-600' },
              { label: 'Ahorro elec.', value: `${elecSavings.toLocaleString()} €`, icon: Zap, color: 'text-amber-500' },
              { label: 'Ahorro gas', value: `${gasSavings.toLocaleString()} €`, icon: Flame, color: 'text-blue-500' },
              { label: 'Ahorro solar', value: `${solarSavings.toLocaleString()} €`, icon: Sun, color: 'text-orange-400' },
              { label: 'Potencia solar', value: `${solarPower} kWp`, icon: Sun, color: 'text-orange-500' },
              { label: 'Riesgo', value: riskLevel, icon: Shield, color: riskLevel === 'high' ? 'text-red-500' : riskLevel === 'critical' ? 'text-destructive' : 'text-yellow-500' },
              { label: 'Venc. contrato', value: daysToExpiry != null ? `${daysToExpiry}d` : '—', icon: Clock, color: daysToExpiry != null && daysToExpiry <= 30 ? 'text-red-500' : 'text-muted-foreground' },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="text-center space-y-1">
                  <Icon className={cn("h-5 w-5 mx-auto", kpi.color)} />
                  <p className="text-xs font-bold">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{kpi.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savingsBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose de ahorro</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={savingsBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="estimado" fill="hsl(45,93%,47%)" name="Estimado €/año" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="validado" fill="hsl(142,71%,45%)" name="Validado €/año" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {energyMix.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Coste por tipo de energía</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={energyMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value.toFixed(0)}€`}>
                    {energyMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats by energy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> Electricidad</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Contratos:</span><span>{elecStats.contracts}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Facturas:</span><span>{elecStats.invoices}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Consumo:</span><span>{elecStats.totalConsumption.toFixed(0)} kWh</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Coste:</span><span className="font-semibold">{elecStats.totalCost.toFixed(2)} €</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-blue-500" /> Gas</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Contratos:</span><span>{gasStats.contracts}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Facturas:</span><span>{gasStats.invoices}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Consumo:</span><span>{gasStats.totalConsumption.toFixed(0)} kWh</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Coste:</span><span className="font-semibold">{gasStats.totalCost.toFixed(2)} €</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs flex items-center gap-1"><Sun className="h-3.5 w-3.5 text-orange-400" /> Solar</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Instalaciones:</span><span>{installations.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Potencia:</span><span>{solarPower} kWp</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ahorro est.:</span><span>{solarSavings.toLocaleString()} €/año</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Validado:</span><span className="font-semibold">{validatedSolar.toLocaleString()} €/año</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CaseEnergySummaryTab;
