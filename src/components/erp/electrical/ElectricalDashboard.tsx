import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, FolderOpen, TrendingDown, TrendingUp, CheckCircle2, 
  Users, FileText, FileSignature, BarChart3, GitCompareArrows,
  FileBarChart, Eye, ArrowRight, AlertTriangle, Clock, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props { companyId: string; }

interface DashboardData {
  totalCases: number;
  activeCases: number;
  pendingReportCases: number;
  totalAnnualSavings: number;
  expiringContracts: { title: string; cups: string | null; contract_end_date: string }[];
  permanenceCases: number;
  statusDistribution: { name: string; value: number }[];
  topRecommendedSupplier: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  analysis: 'En análisis',
  proposal: 'Propuesta',
  implementation: 'Implementación',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const CHART_COLORS = ['hsl(45, 93%, 47%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(271, 91%, 65%)', 'hsl(0, 84%, 60%)', 'hsl(199, 89%, 48%)'];

export function ElectricalDashboard({ companyId }: Props) {
  const [data, setData] = useState<DashboardData>({
    totalCases: 0,
    activeCases: 0,
    pendingReportCases: 0,
    totalAnnualSavings: 0,
    expiringContracts: [],
    permanenceCases: 0,
    statusDistribution: [],
    topRecommendedSupplier: '—',
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all cases
      const { data: cases, error: casesErr } = await supabase
        .from('energy_cases')
        .select('id, title, status, cups, contract_end_date, estimated_annual_savings')
        .eq('company_id', companyId);
      if (casesErr) throw casesErr;

      const allCases = cases || [];
      const activeCases = allCases.filter(c => !['completed', 'cancelled'].includes(c.status));
      const pendingReport = allCases.filter(c => ['analysis', 'proposal'].includes(c.status));
      const totalSavings = allCases.reduce((sum, c) => sum + (c.estimated_annual_savings || 0), 0);

      // Status distribution
      const statusMap: Record<string, number> = {};
      allCases.forEach(c => {
        const label = STATUS_LABELS[c.status] || c.status;
        statusMap[label] = (statusMap[label] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // Expiring contracts (next 90 days)
      const in90Days = addDays(new Date(), 90);
      const expiring = allCases.filter(c => {
        if (!c.contract_end_date) return false;
        const d = new Date(c.contract_end_date);
        return isBefore(d, in90Days);
      }).sort((a, b) => new Date(a.contract_end_date!).getTime() - new Date(b.contract_end_date!).getTime());

      // Permanence cases
      const caseIds = allCases.map(c => c.id);
      let permanenceCount = 0;
      if (caseIds.length > 0) {
        const { data: contracts } = await supabase
          .from('energy_contracts')
          .select('case_id, has_permanence')
          .in('case_id', caseIds)
          .eq('has_permanence', true);
        permanenceCount = new Set((contracts || []).map(c => c.case_id)).size;
      }

      // Top recommended supplier
      let topSupplier = '—';
      if (caseIds.length > 0) {
        const { data: recs } = await supabase
          .from('energy_recommendations')
          .select('recommended_supplier')
          .in('case_id', caseIds);
        if (recs && recs.length > 0) {
          const supplierCount: Record<string, number> = {};
          recs.forEach(r => {
            if (r.recommended_supplier) {
              supplierCount[r.recommended_supplier] = (supplierCount[r.recommended_supplier] || 0) + 1;
            }
          });
          const sorted = Object.entries(supplierCount).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) topSupplier = sorted[0][0];
        }
      }

      setData({
        totalCases: allCases.length,
        activeCases: activeCases.length,
        pendingReportCases: pendingReport.length,
        totalAnnualSavings: totalSavings,
        expiringContracts: expiring.slice(0, 5),
        permanenceCases: permanenceCount,
        statusDistribution,
        topRecommendedSupplier: topSupplier,
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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl border bg-gradient-to-br from-yellow-500/5 via-background to-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consultoría Eléctrica</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Dashboard en tiempo real del módulo de optimización de factura eléctrica.
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><FolderOpen className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Exp. Activos</p>
                <p className="text-xl font-bold">{loading ? '...' : data.activeCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><FileBarChart className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Pend. Informe</p>
                <p className="text-xl font-bold">{loading ? '...' : data.pendingReportCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingDown className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Ahorro Anual</p>
                <p className="text-xl font-bold text-emerald-600">{loading ? '...' : `${data.totalAnnualSavings.toLocaleString('es-ES')}€`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><Clock className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Vencimientos</p>
                <p className="text-xl font-bold">{loading ? '...' : data.expiringContracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Permanencia</p>
                <p className="text-xl font-bold">{loading ? '...' : data.permanenceCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Zap className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Exp.</p>
                <p className="text-xl font-bold">{loading ? '...' : data.totalCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><GitCompareArrows className="h-5 w-5 text-purple-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Top Comercial.</p>
                <p className="text-sm font-bold truncate max-w-[100px]">{loading ? '...' : data.topRecommendedSupplier}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribución por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {data.statusDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ahorro estimado por expediente</CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsChart companyId={companyId} />
          </CardContent>
        </Card>
      </div>

      {/* Expiring contracts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Próximos vencimientos de contrato
          </CardTitle>
          <CardDescription>Contratos que vencen en los próximos 90 días</CardDescription>
        </CardHeader>
        <CardContent>
          {data.expiringContracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay contratos próximos a vencer.</p>
          ) : (
            <div className="space-y-2">
              {data.expiringContracts.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.cups || '—'}</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">{fmtDate(c.contract_end_date)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Sub-component for savings bar chart */
function SavingsChart({ companyId }: { companyId: string }) {
  const [chartData, setChartData] = useState<{ name: string; ahorro: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('energy_cases')
        .select('title, estimated_annual_savings')
        .eq('company_id', companyId)
        .not('estimated_annual_savings', 'is', null)
        .order('estimated_annual_savings', { ascending: false })
        .limit(8);
      if (data) {
        setChartData(data.map(c => ({
          name: c.title.length > 15 ? c.title.substring(0, 15) + '…' : c.title,
          ahorro: Number(c.estimated_annual_savings) || 0,
        })));
      }
    })();
  }, [companyId]);

  if (chartData.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString('es-ES')} €`, 'Ahorro anual']} />
        <Bar dataKey="ahorro" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ElectricalDashboard;
