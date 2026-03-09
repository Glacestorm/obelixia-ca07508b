/**
 * ElectricalExecutiveDashboard - Consolidated Energy 360 Executive Dashboard
 * Multi-company, multi-energy with filters, rankings, charts, export
 * Integrated with real MIBGAS market data
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnergyMibgas } from '@/hooks/erp/useEnergyMibgas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen, FileText, TrendingDown, CheckCircle2, Clock, Target,
  BarChart3, Download, FileSpreadsheet, Loader2, ArrowRightLeft, Building2,
  Zap, Flame, Sun, Shield, Activity, Layers, AlertTriangle, Filter,
  Trophy, ArrowUpRight, Calendar, RefreshCw
} from 'lucide-react';
import { useEnergyExecutiveReport, ExecutiveKPIs } from '@/hooks/erp/useEnergyExecutiveReport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
  ComposedChart, Funnel, FunnelChart
} from 'recharts';
import { SmartActionsPanel } from './SmartActionsPanel';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { onNavigateToCase?: (caseId: string) => void; }

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)',
  'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(271, 91%, 65%)',
  'hsl(199, 89%, 48%)', 'hsl(30, 90%, 50%)',
];

const ENERGY_COLORS: Record<string, string> = {
  electricity: 'hsl(45, 93%, 47%)',
  gas: 'hsl(217, 91%, 60%)',
  solar: 'hsl(30, 90%, 50%)',
  mixed: 'hsl(271, 91%, 65%)',
};

interface CaseDetail {
  id: string;
  title: string;
  status: string;
  energy_type: string;
  current_supplier: string | null;
  contract_end_date: string | null;
  estimated_annual_savings: number | null;
  estimated_gas_savings: number | null;
  estimated_solar_savings: number | null;
  validated_annual_savings: number | null;
  validated_gas_savings: number | null;
  validated_solar_savings: number | null;
  risk_level: string | null;
  company_id: string;
  created_at: string;
}

interface Filters {
  energyType: string;
  status: string;
  companyId: string;
  dateRange: string;
}

export function ElectricalExecutiveDashboard({ onNavigateToCase }: Props) {
  const { kpis, loading, fetchMultiCompanyKPIs, exportPDF, exportExcel } = useEnergyExecutiveReport();
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [filters, setFilters] = useState<Filters>({ energyType: 'all', status: 'all', companyId: 'all', dateRange: 'all' });
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('kpis');
  const { data: mibgasData, fetchMibgasData } = useEnergyMibgas();

  useEffect(() => { fetchMibgasData(); }, []);

  const loadCompanies = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('erp_user_companies').select('company_id').eq('user_id', user.id);
    const ids = (data || []).map(d => d.company_id);
    setCompanyIds(ids);

    if (ids.length > 0) {
      const { data: comps } = await supabase.from('erp_companies').select('id, name').in('id', ids);
      setCompanies(comps || []);
      fetchMultiCompanyKPIs(ids);

      const { data: casesData } = await supabase
        .from('energy_cases')
        .select('id, title, status, energy_type, current_supplier, contract_end_date, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings, risk_level, company_id, created_at')
        .in('company_id', ids)
        .order('created_at', { ascending: false });
      setCases((casesData as CaseDetail[]) || []);
    }
  }, [user?.id, fetchMultiCompanyKPIs]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const filteredCases = useMemo(() => {
    let result = cases;
    if (filters.energyType !== 'all') result = result.filter(c => c.energy_type === filters.energyType);
    if (filters.status !== 'all') result = result.filter(c => c.status === filters.status);
    if (filters.companyId !== 'all') result = result.filter(c => c.company_id === filters.companyId);
    if (filters.dateRange !== 'all') {
      const months = parseInt(filters.dateRange);
      const cutoff = subMonths(new Date(), months);
      result = result.filter(c => new Date(c.created_at) >= cutoff);
    }
    return result;
  }, [cases, filters]);

  const totalSavings = (c: CaseDetail) => (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0);
  const totalValidated = (c: CaseDetail) => (c.validated_annual_savings || 0) + (c.validated_gas_savings || 0) + (c.validated_solar_savings || 0);

  // Rankings
  const topSavings = useMemo(() =>
    [...filteredCases].sort((a, b) => totalSavings(b) - totalSavings(a)).slice(0, 10),
  [filteredCases]);

  const urgentCases = useMemo(() => {
    const now = new Date();
    return filteredCases
      .filter(c => c.contract_end_date)
      .sort((a, b) => new Date(a.contract_end_date!).getTime() - new Date(b.contract_end_date!).getTime())
      .filter(c => new Date(c.contract_end_date!) > now)
      .slice(0, 10);
  }, [filteredCases]);

  const riskCases = useMemo(() =>
    filteredCases.filter(c => c.risk_level === 'high' || c.risk_level === 'critical'),
  [filteredCases]);

  // Chart data
  const energyMix = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => { counts[c.energy_type] = (counts[c.energy_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases]);

  const savingsByLine = useMemo(() => [
    { linea: 'Electricidad', estimado: filteredCases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0), validado: filteredCases.reduce((s, c) => s + (c.validated_annual_savings || 0), 0) },
    { linea: 'Gas', estimado: filteredCases.reduce((s, c) => s + (c.estimated_gas_savings || 0), 0), validado: filteredCases.reduce((s, c) => s + (c.validated_gas_savings || 0), 0) },
    { linea: 'Solar', estimado: filteredCases.reduce((s, c) => s + (c.estimated_solar_savings || 0), 0), validado: filteredCases.reduce((s, c) => s + (c.validated_solar_savings || 0), 0) },
  ], [filteredCases]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCases]);

  const expiryByPeriod = useMemo(() => {
    const now = new Date();
    const periods = [
      { label: '<30d', max: 30 },
      { label: '30-60d', max: 60 },
      { label: '60-90d', max: 90 },
      { label: '90-180d', max: 180 },
      { label: '>180d', max: Infinity },
    ];
    return periods.map(p => ({
      periodo: p.label,
      cantidad: filteredCases.filter(c => {
        if (!c.contract_end_date) return false;
        const days = Math.ceil((new Date(c.contract_end_date).getTime() - now.getTime()) / 86400000);
        if (days < 0) return false;
        const prevMax = periods[periods.indexOf(p) - 1]?.max || 0;
        return days >= prevMax && days < p.max;
      }).length,
    }));
  }, [filteredCases]);

  // Savings evolution by month (aggregated from case created_at)
  const savingsEvolution = useMemo(() => {
    const byMonth: Record<string, { month: string; estimado: number; validado: number }> = {};
    filteredCases.forEach(c => {
      const d = new Date(c.created_at);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yy', { locale: es });
      if (!byMonth[key]) byMonth[key] = { month: label, estimado: 0, validado: 0 };
      byMonth[key].estimado += totalSavings(c);
      byMonth[key].validado += totalValidated(c);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filteredCases]);

  // Operational funnel
  const operationalFunnel = useMemo(() => {
    const stages = ['intake', 'analysis', 'proposal', 'negotiation', 'documentation', 'switching', 'validation', 'completed'];
    const stageLabels: Record<string, string> = {
      intake: 'Entrada', analysis: 'Análisis', proposal: 'Propuesta', negotiation: 'Negociación',
      documentation: 'Documentación', switching: 'Cambio', validation: 'Validación', completed: 'Cerrado',
    };
    return stages.map(s => ({
      stage: stageLabels[s] || s,
      count: filteredCases.filter(c => c.status === s).length,
    })).filter(s => s.count > 0);
  }, [filteredCases]);

  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('es-ES');
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'dd/MM/yy', { locale: es }) : '—';

  const filteredEstTotal = filteredCases.reduce((s, c) => s + totalSavings(c), 0);
  const filteredValTotal = filteredCases.reduce((s, c) => s + totalValidated(c), 0);
  const filteredClosed = filteredCases.filter(c => c.status === 'completed').length;
  const filteredCloseRate = filteredCases.length > 0 ? Math.round((filteredClosed / filteredCases.length) * 100) : 0;

  if (loading && !kpis) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Cargando datos ejecutivos...</p>
      </div>
    );
  }

  const uniqueStatuses = [...new Set(cases.map(c => c.status))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dashboard Ejecutivo · Energía 360</h2>
          <Badge variant="secondary" className="text-xs">{companies.length} empresa{companies.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="outline" className="text-xs">{filteredCases.length} exp.</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadCompanies} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
          {kpis && (
            <>
              <Button variant="outline" size="sm" onClick={() => exportPDF(kpis)}>
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportExcel(kpis)}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.energyType} onValueChange={v => setFilters(f => ({ ...f, energyType: v }))}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Energía" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas energías</SelectItem>
                <SelectItem value="electricity">Electricidad</SelectItem>
                <SelectItem value="gas">Gas</SelectItem>
                <SelectItem value="solar">Solar</SelectItem>
                <SelectItem value="mixed">Mixto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {companies.length > 1 && (
              <Select value={filters.companyId} onValueChange={v => setFilters(f => ({ ...f, companyId: v }))}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filters.dateRange} onValueChange={v => setFilters(f => ({ ...f, dateRange: v }))}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: FolderOpen, label: 'Total exp.', value: filteredCases.length, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: CheckCircle2, label: 'Cerrados', value: filteredClosed, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: Target, label: 'Tasa cierre', value: `${filteredCloseRate}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: TrendingDown, label: 'Ahorro est.', value: `${fmtK(filteredEstTotal)}€`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { icon: TrendingDown, label: 'Ahorro valid.', value: `${fmtK(filteredValTotal)}€`, color: 'text-green-600', bg: 'bg-green-500/10' },
          { icon: FileText, label: 'Propuestas', value: kpis?.pendingProposals || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Clock, label: 'Venc. <30d', value: urgentCases.filter(c => { const d = Math.ceil((new Date(c.contract_end_date!).getTime() - Date.now()) / 86400000); return d < 30; }).length, color: 'text-red-500', bg: 'bg-red-500/10' },
          { icon: AlertTriangle, label: 'En riesgo', value: riskCases.length, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                    <p className="text-lg font-bold">{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Energy breakdown cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, label: 'Electricidad', est: filteredCases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0), val: filteredCases.reduce((s, c) => s + (c.validated_annual_savings || 0), 0), color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Flame, label: 'Gas', est: filteredCases.reduce((s, c) => s + (c.estimated_gas_savings || 0), 0), val: filteredCases.reduce((s, c) => s + (c.validated_gas_savings || 0), 0), color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Sun, label: 'Solar', est: filteredCases.reduce((s, c) => s + (c.estimated_solar_savings || 0), 0), val: filteredCases.reduce((s, c) => s + (c.validated_solar_savings || 0), 0), color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1 rounded", s.bg)}><Icon className={cn("h-3.5 w-3.5", s.color)} /></div>
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Estimado:</span>
                  <span className="font-medium">{fmtK(s.est)} €</span>
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span className="text-muted-foreground">Validado:</span>
                  <span className="font-medium text-emerald-600">{fmtK(s.val)} €</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs for charts and rankings */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="kpis" className="text-xs">Gráficos</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs">Rankings</TabsTrigger>
          <TabsTrigger value="riesgo" className="text-xs">Riesgo</TabsTrigger>
          {kpis && kpis.companyBreakdown.length > 1 && <TabsTrigger value="empresas" className="text-xs">Empresas</TabsTrigger>}
          <TabsTrigger value="acciones" className="text-xs">Acciones</TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs">Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status distribution */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expedientes por estado</CardTitle></CardHeader>
              <CardContent>
                {statusDistribution.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {statusDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Energy mix */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mix energético</CardTitle></CardHeader>
              <CardContent>
                {energyMix.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={energyMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {energyMix.map((d) => <Cell key={d.name} fill={ENERGY_COLORS[d.name] || 'hsl(var(--muted))'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Savings by line */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro por línea energética</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={savingsByLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="linea" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    <Bar dataKey="estimado" name="Estimado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="validado" name="Validado" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Savings evolution */}
          {savingsEvolution.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución mensual del ahorro</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={savingsEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    <Area type="monotone" dataKey="estimado" name="Estimado" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Area type="monotone" dataKey="validado" name="Validado" fill="hsl(142, 71%, 45%, 0.2)" stroke="hsl(142, 71%, 45%)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Expiry + Funnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Vencimientos por período</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={expiryByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="periodo" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" name="Expedientes" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {operationalFunnel.length > 0 ? (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Embudo operativo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={operationalFunnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" name="Expedientes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              companyIds.length > 0 && (
                <SmartActionsPanel companyId={companyIds[0]} onNavigateToCase={onNavigateToCase} />
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top savings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top 10 por potencial de ahorro</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {topSavings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin expedientes</p>
                  ) : topSavings.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2" onClick={() => onNavigateToCase?.(c.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{c.title}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] capitalize">{c.energy_type}</Badge>
                            <span className="text-[10px] text-muted-foreground">{c.current_supplier || ''}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{fmtK(totalSavings(c))} €</span>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Urgent cases */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-red-500" />Expedientes urgentes (vencimiento)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {urgentCases.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin vencimientos próximos</p>
                  ) : urgentCases.map(c => {
                    const days = Math.ceil((new Date(c.contract_end_date!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2" onClick={() => onNavigateToCase?.(c.id)}>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{c.title}</p>
                          <span className="text-[10px] text-muted-foreground">{c.current_supplier || ''}</span>
                        </div>
                        <Badge variant={days < 30 ? 'destructive' : days < 60 ? 'secondary' : 'outline'} className="text-xs">
                          {days}d · {fmtDate(c.contract_end_date)}
                        </Badge>
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="riesgo" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-red-500" />Cartera en riesgo</CardTitle>
              <CardDescription className="text-xs">Expedientes con nivel de riesgo alto o crítico</CardDescription>
            </CardHeader>
            <CardContent>
              {riskCases.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay expedientes en riesgo. ¡Excelente!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  {riskCases.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2" onClick={() => onNavigateToCase?.(c.id)}>
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{c.energy_type}</Badge>
                          <span className="text-[10px] text-muted-foreground">{c.status}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs capitalize">{c.risk_level}</Badge>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {kpis && kpis.companyBreakdown.length > 1 && (
          <TabsContent value="empresas" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por empresa</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={kpis.companyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="companyName" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="cases" fill="hsl(var(--primary))" name="Expedientes" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="closed" fill="hsl(142,71%,45%)" name="Cerrados" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose por empresa</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left p-2">Empresa</th>
                          <th className="text-right p-2">Exp.</th>
                          <th className="text-right p-2">Cerrados</th>
                          <th className="text-right p-2">Ahorro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpis.companyBreakdown.map(c => (
                          <tr key={c.companyId} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{c.companyName}</td>
                            <td className="p-2 text-right">{c.cases}</td>
                            <td className="p-2 text-right">{c.closed}</td>
                            <td className="p-2 text-right font-medium text-emerald-600">{c.savings.toLocaleString('es-ES')} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="acciones" className="mt-4">
          {companyIds.length > 0 ? (
            <SmartActionsPanel companyId={companyIds[0]} onNavigateToCase={onNavigateToCase} />
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin empresas asignadas</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="mt-4 space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Benchmark sectorial
              </CardTitle>
              <CardDescription className="text-xs">Comparativa con datos agregados del sector energético español</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Coste medio sector</p>
                    <p className="text-2xl font-bold text-muted-foreground">0,142 €/kWh</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">Referencia CNMC 2025</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Ahorro medio consultoría</p>
                    <p className="text-2xl font-bold text-muted-foreground">12-18%</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">Benchmark sectorial</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Tu rendimiento</p>
                    <p className="text-2xl font-bold">{filteredCloseRate}%</p>
                    <Badge variant={filteredCloseRate > 15 ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                      {filteredCloseRate > 15 ? 'Por encima' : 'En rango'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Datos de referencia</p>
                    <p className="text-xs text-muted-foreground">
                      Los datos de benchmark son referencias aproximadas basadas en publicaciones de CNMC y REE. 
                      Para datos personalizados en tiempo real se requiere integración con fuentes externas del sector.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ElectricalExecutiveDashboard;
