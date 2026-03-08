/**
 * ElectricalExecutiveDashboard - Multi-company executive reporting
 * Energy 360 with electricity, gas, solar breakdowns and PDF/Excel export
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen, FileText, TrendingDown, CheckCircle2, Clock, Target,
  BarChart3, Download, FileSpreadsheet, Loader2, ArrowRightLeft, Building2,
  Zap, Flame, Sun, Shield, Activity, Layers
} from 'lucide-react';
import { useEnergyExecutiveReport, ExecutiveKPIs } from '@/hooks/erp/useEnergyExecutiveReport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { SmartActionsPanel } from './SmartActionsPanel';
import { cn } from '@/lib/utils';

interface Props { onNavigateToCase?: (caseId: string) => void; }

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)',
  'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(271, 91%, 65%)',
];

export function ElectricalExecutiveDashboard({ onNavigateToCase }: Props) {
  const { kpis, loading, fetchMultiCompanyKPIs, exportPDF, exportExcel } = useEnergyExecutiveReport();
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const { user } = useAuth();

  const loadCompanies = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('erp_user_companies').select('company_id').eq('user_id', user.id);
    const ids = (data || []).map(d => d.company_id);
    setCompanyIds(ids);
    if (ids.length > 0) fetchMultiCompanyKPIs(ids);
  }, [user?.id, fetchMultiCompanyKPIs]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('es-ES');

  if (loading || !kpis) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Cargando datos ejecutivos...</p>
      </div>
    );
  }

  const statusData = Object.entries(kpis.casesByStatus).map(([name, value]) => ({ name, value }));
  const totalAllSavings = kpis.totalEstimatedSavings + (kpis.totalGasSavings || 0) + (kpis.totalSolarSavings || 0);
  const totalAllValidated = kpis.totalValidatedSavings + (kpis.totalValidatedGas || 0) + (kpis.totalValidatedSolar || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dashboard Ejecutivo Energético</h2>
          <Badge variant="secondary" className="text-xs">{kpis.companyBreakdown.length} empresa{kpis.companyBreakdown.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF(kpis)}>
            <Download className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel(kpis)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: FolderOpen, label: 'Total exp.', value: kpis.totalCases, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: CheckCircle2, label: 'Cerrados', value: kpis.closedCases, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: Target, label: 'Tasa cierre', value: `${kpis.closeRate}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: Clock, label: 'T. medio', value: `${kpis.avgCloseTimeDays}d`, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { icon: TrendingDown, label: 'Ahorro est.', value: `${fmtK(totalAllSavings)}€`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { icon: TrendingDown, label: 'Ahorro valid.', value: `${fmtK(totalAllValidated)}€`, color: 'text-green-600', bg: 'bg-green-500/10' },
          { icon: Activity, label: 'Conversión', value: `${kpis.conversionRate}%`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: ArrowRightLeft, label: 'Venc. <30d', value: kpis.contractsExpiring30, color: 'text-red-500', bg: 'bg-red-500/10' },
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

      {/* Energy savings breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, label: 'Electricidad', est: kpis.totalEstimatedSavings, val: kpis.totalValidatedSavings, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Flame, label: 'Gas', est: kpis.totalGasSavings || 0, val: kpis.totalValidatedGas || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Sun, label: 'Solar', est: kpis.totalSolarSavings || 0, val: kpis.totalValidatedSolar || 0, color: 'text-orange-400', bg: 'bg-orange-500/10' },
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por estado</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {kpis.companyBreakdown.length > 1 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Por empresa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
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
        )}

        {companyIds.length > 0 && (
          <SmartActionsPanel companyId={companyIds[0]} onNavigateToCase={onNavigateToCase} />
        )}
      </div>

      {/* Company table */}
      {kpis.companyBreakdown.length > 1 && (
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
                    <th className="text-right p-2">Tasa</th>
                    <th className="text-right p-2">Ahorro est.</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.companyBreakdown.map(c => (
                    <tr key={c.companyId} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{c.companyName}</td>
                      <td className="p-2 text-right">{c.cases}</td>
                      <td className="p-2 text-right">{c.closed}</td>
                      <td className="p-2 text-right">{c.cases > 0 ? Math.round((c.closed / c.cases) * 100) : 0}%</td>
                      <td className="p-2 text-right font-medium text-emerald-600">{c.savings.toLocaleString('es-ES')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ElectricalExecutiveDashboard;
