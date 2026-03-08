/**
 * Energy 360 Premium Dashboard
 * Professional-grade energy consulting overview with multi-energy KPIs
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Zap, FolderOpen, TrendingDown, TrendingUp, CheckCircle2,
  Users, FileText, FileSignature, BarChart3, GitCompareArrows,
  FileBarChart, Eye, ArrowRight, AlertTriangle, Clock, Shield,
  Flame, Sun, Activity, Target, ArrowUpRight, ArrowDownRight,
  Layers, Gauge, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isBefore, differenceInDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area,
  LineChart, Line, RadialBarChart, RadialBar
} from 'recharts';
import { cn } from '@/lib/utils';

interface Props { companyId: string; }

interface DashboardData {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingReportCases: number;
  totalAnnualSavings: number;
  totalGasSavings: number;
  totalSolarSavings: number;
  validatedSavings: number;
  validatedGasSavings: number;
  validatedSolarSavings: number;
  expiringContracts: { title: string; cups: string | null; contract_end_date: string; energy_type: string }[];
  permanenceCases: number;
  statusDistribution: { name: string; value: number; color: string }[];
  energyTypeDistribution: { name: string; value: number; color: string }[];
  monthlySavingsTrend: { month: string; estimated: number; validated: number }[];
  topRecommendedSupplier: string;
  avgCloseTimeDays: number;
  conversionRate: number;
  totalInvoicesAnalyzed: number;
  totalContracts: number;
  riskBreakdown: { level: string; count: number; color: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', analysis: 'En análisis', proposal: 'Propuesta',
  implementation: 'Implementación', completed: 'Completado', cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(220, 14%, 60%)', analysis: 'hsl(217, 91%, 60%)', proposal: 'hsl(45, 93%, 47%)',
  implementation: 'hsl(271, 91%, 65%)', completed: 'hsl(142, 71%, 45%)', cancelled: 'hsl(0, 84%, 60%)',
};

const ENERGY_TYPE_COLORS: Record<string, string> = {
  electricity: 'hsl(45, 93%, 47%)', gas: 'hsl(217, 91%, 60%)',
  solar: 'hsl(25, 95%, 53%)', mixed: 'hsl(271, 91%, 65%)',
};

const RISK_COLORS: Record<string, string> = {
  low: 'hsl(142, 71%, 45%)', medium: 'hsl(45, 93%, 47%)',
  high: 'hsl(25, 95%, 53%)', critical: 'hsl(0, 84%, 60%)',
};

export function ElectricalDashboard({ companyId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, title, status, cups, contract_end_date, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings, energy_type, risk_level, created_at, updated_at')
        .eq('company_id', companyId);

      const allCases = (cases || []) as any[];
      const activeCases = allCases.filter(c => !['completed', 'cancelled'].includes(c.status));
      const completedCases = allCases.filter(c => c.status === 'completed');
      const pendingReport = allCases.filter(c => ['analysis', 'proposal'].includes(c.status));

      // Savings
      const totalSavings = allCases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0);
      const totalGas = allCases.reduce((s, c) => s + (c.estimated_gas_savings || 0), 0);
      const totalSolar = allCases.reduce((s, c) => s + (c.estimated_solar_savings || 0), 0);
      const validatedSavings = allCases.reduce((s, c) => s + (c.validated_annual_savings || 0), 0);
      const validatedGas = allCases.reduce((s, c) => s + (c.validated_gas_savings || 0), 0);
      const validatedSolar = allCases.reduce((s, c) => s + (c.validated_solar_savings || 0), 0);

      // Status distribution
      const statusMap: Record<string, number> = {};
      allCases.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      const statusDistribution = Object.entries(statusMap).map(([key, value]) => ({
        name: STATUS_LABELS[key] || key, value, color: STATUS_COLORS[key] || 'hsl(var(--muted))',
      }));

      // Energy type distribution
      const typeMap: Record<string, number> = {};
      allCases.forEach(c => { const t = c.energy_type || 'electricity'; typeMap[t] = (typeMap[t] || 0) + 1; });
      const energyTypeDistribution = Object.entries(typeMap).map(([key, value]) => ({
        name: key === 'electricity' ? 'Electricidad' : key === 'gas' ? 'Gas' : key === 'solar' ? 'Solar' : 'Mixto',
        value, color: ENERGY_TYPE_COLORS[key] || 'hsl(var(--primary))',
      }));

      // Risk breakdown
      const riskMap: Record<string, number> = {};
      allCases.forEach(c => { const r = c.risk_level || 'medium'; riskMap[r] = (riskMap[r] || 0) + 1; });
      const riskBreakdown = Object.entries(riskMap).map(([level, count]) => ({
        level: level === 'low' ? 'Bajo' : level === 'medium' ? 'Medio' : level === 'high' ? 'Alto' : 'Crítico',
        count, color: RISK_COLORS[level] || RISK_COLORS.medium,
      }));

      // Expiring contracts
      const in90Days = addDays(new Date(), 90);
      const expiring = allCases.filter(c => {
        if (!c.contract_end_date) return false;
        return isBefore(new Date(c.contract_end_date), in90Days);
      }).sort((a, b) => new Date(a.contract_end_date!).getTime() - new Date(b.contract_end_date!).getTime());

      // Permanence, conversion
      const caseIds = allCases.map(c => c.id);
      let permanenceCount = 0, totalInvoices = 0, totalContracts = 0;
      if (caseIds.length > 0) {
        const [contractsRes, invoicesRes, contractsTotalRes] = await Promise.all([
          supabase.from('energy_contracts').select('case_id, has_permanence').in('case_id', caseIds).eq('has_permanence', true),
          supabase.from('energy_invoices').select('id', { count: 'exact', head: true }).in('case_id', caseIds),
          supabase.from('energy_contracts').select('id', { count: 'exact', head: true }).in('case_id', caseIds),
        ]);
        permanenceCount = new Set((contractsRes.data || []).map(c => c.case_id)).size;
        totalInvoices = (invoicesRes as any).count || 0;
        totalContracts = (contractsTotalRes as any).count || 0;
      }

      // Avg close time & conversion
      let totalCloseDays = 0;
      completedCases.forEach(c => {
        totalCloseDays += Math.round((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
      });
      const acceptedCount = allCases.filter(c => ['proposal', 'implementation', 'completed'].includes(c.status)).length;

      // Top supplier
      let topSupplier = '—';
      if (caseIds.length > 0) {
        const { data: recs } = await supabase
          .from('energy_recommendations').select('recommended_supplier').in('case_id', caseIds);
        if (recs?.length) {
          const sc: Record<string, number> = {};
          recs.forEach(r => { if (r.recommended_supplier) sc[r.recommended_supplier] = (sc[r.recommended_supplier] || 0) + 1; });
          const sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
          if (sorted.length) topSupplier = sorted[0][0];
        }
      }

      // Monthly savings trend (last 6 months based on case creation)
      const monthlySavingsTrend: { month: string; estimated: number; validated: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const monthStr = format(d, 'MMM yy', { locale: es });
        const monthCases = allCases.filter(c => {
          const cd = new Date(c.created_at);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        });
        monthlySavingsTrend.push({
          month: monthStr,
          estimated: monthCases.reduce((s, c) => s + (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0), 0),
          validated: monthCases.reduce((s, c) => s + (c.validated_annual_savings || 0) + (c.validated_gas_savings || 0) + (c.validated_solar_savings || 0), 0),
        });
      }

      setData({
        totalCases: allCases.length,
        activeCases: activeCases.length,
        completedCases: completedCases.length,
        pendingReportCases: pendingReport.length,
        totalAnnualSavings: totalSavings,
        totalGasSavings: totalGas,
        totalSolarSavings: totalSolar,
        validatedSavings,
        validatedGasSavings: validatedGas,
        validatedSolarSavings: validatedSolar,
        expiringContracts: expiring.slice(0, 8),
        permanenceCases: permanenceCount,
        statusDistribution,
        energyTypeDistribution,
        monthlySavingsTrend,
        topRecommendedSupplier: topSupplier,
        avgCloseTimeDays: completedCases.length > 0 ? Math.round(totalCloseDays / completedCases.length) : 0,
        conversionRate: allCases.length > 0 ? Math.round((acceptedCount / allCases.length) * 100) : 0,
        totalInvoicesAnalyzed: totalInvoices,
        totalContracts,
        riskBreakdown,
      });
    } catch (err) {
      console.error('[ElectricalDashboard] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return d; }
  };

  const totalAllSavings = useMemo(() => {
    if (!data) return 0;
    return data.totalAnnualSavings + data.totalGasSavings + data.totalSolarSavings;
  }, [data]);

  const totalAllValidated = useMemo(() => {
    if (!data) return 0;
    return data.validatedSavings + data.validatedGasSavings + data.validatedSolarSavings;
  }, [data]);

  const validationRate = useMemo(() => {
    if (!totalAllSavings) return 0;
    return Math.round((totalAllValidated / totalAllSavings) * 100);
  }, [totalAllSavings, totalAllValidated]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/8 via-background to-accent/5 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Layers className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Consultoría Energética 360</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Electricidad · Gas · Solar · Autoconsumo — Vista integral en tiempo real
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{totalAllSavings.toLocaleString('es-ES')} €</p>
            <p className="text-xs text-muted-foreground">Ahorro anual estimado total</p>
            {totalAllValidated > 0 && (
              <div className="flex items-center gap-1 justify-end mt-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">{totalAllValidated.toLocaleString('es-ES')} € validado ({validationRate}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: FolderOpen, label: 'Expedientes', value: data.totalCases, sub: `${data.activeCases} activos`, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: CheckCircle2, label: 'Cerrados', value: data.completedCases, sub: `${data.conversionRate}% conversión`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: Zap, label: 'Ahorro elec.', value: `${(data.totalAnnualSavings / 1000).toFixed(1)}k€`, sub: `${(data.validatedSavings / 1000).toFixed(1)}k validado`, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Flame, label: 'Ahorro gas', value: `${data.totalGasSavings.toLocaleString()}€`, sub: `${data.validatedGasSavings.toLocaleString()}€ valid.`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Sun, label: 'Ahorro solar', value: `${data.totalSolarSavings.toLocaleString()}€`, sub: `${data.validatedSolarSavings.toLocaleString()}€ valid.`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { icon: FileText, label: 'Facturas', value: data.totalInvoicesAnalyzed, sub: `${data.totalContracts} contratos`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Clock, label: 'T. cierre', value: `${data.avgCloseTimeDays}d`, sub: data.avgCloseTimeDays <= 30 ? 'Buen ritmo' : 'Mejorable', color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: AlertTriangle, label: 'Vencimientos', value: data.expiringContracts.length, sub: `${data.permanenceCases} con perman.`, color: data.expiringContracts.length > 0 ? 'text-red-500' : 'text-muted-foreground', bg: 'bg-red-500/10' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("p-2 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{kpi.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Savings trend */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolución del ahorro (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlySavingsTrend.every(d => d.estimated === 0 && d.validated === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de tendencia</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlySavingsTrend}>
                  <defs>
                    <linearGradient id="estGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v.toLocaleString('es-ES')} €`, '']} />
                  <Area type="monotone" dataKey="estimated" stroke="hsl(45, 93%, 47%)" fill="url(#estGrad)" name="Estimado" strokeWidth={2} />
                  <Area type="monotone" dataKey="validated" stroke="hsl(142, 71%, 45%)" fill="url(#valGrad)" name="Validado" strokeWidth={2} />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por estado</CardTitle></CardHeader>
          <CardContent>
            {data.statusDistribution.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                    {data.statusDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Energy type distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mix energético</CardTitle></CardHeader>
          <CardContent>
            {data.energyTypeDistribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.energyTypeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3} label>
                    {data.energyTypeDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Risk breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de riesgo</CardTitle></CardHeader>
          <CardContent>
            {data.riskBreakdown.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <div className="space-y-3 pt-2">
                {data.riskBreakdown.map(r => (
                  <div key={r.level} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{r.level}</span>
                      <span className="text-muted-foreground">{r.count} expedientes</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${data.totalCases > 0 ? (r.count / data.totalCases) * 100 : 0}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings by energy */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro por vector energético</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Electricidad', estimado: data.totalAnnualSavings, validado: data.validatedSavings },
                { name: 'Gas', estimado: data.totalGasSavings, validado: data.validatedGasSavings },
                { name: 'Solar', estimado: data.totalSolarSavings, validado: data.validatedSolarSavings },
              ].filter(d => d.estimado > 0 || d.validado > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="estimado" fill="hsl(45, 93%, 47%)" name="Estimado €/año" radius={[4, 4, 0, 0]} />
                <Bar dataKey="validado" fill="hsl(142, 71%, 45%)" name="Validado €/año" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Contracts */}
      {data.expiringContracts.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Contratos próximos a vencer ({data.expiringContracts.length})
              </CardTitle>
              <Badge variant="destructive" className="text-[10px]">Requiere atención</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.expiringContracts.map((c, i) => {
                const daysLeft = differenceInDays(new Date(c.contract_end_date), new Date());
                const urgency = daysLeft <= 15 ? 'destructive' : daysLeft <= 30 ? 'default' : 'secondary';
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.energy_type === 'gas' ? <Flame className="h-4 w-4 text-blue-500 shrink-0" /> :
                       c.energy_type === 'solar' ? <Sun className="h-4 w-4 text-orange-400 shrink-0" /> :
                       <Zap className="h-4 w-4 text-amber-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.cups || '—'}</p>
                      </div>
                    </div>
                    <Badge variant={urgency as any} className="text-xs shrink-0 ml-2">
                      {daysLeft <= 0 ? 'Vencido' : `${daysLeft}d`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ElectricalDashboard;
