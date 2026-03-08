import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen, FileText, TrendingDown, ArrowRightLeft, CheckCircle2,
  Clock, AlertTriangle, BarChart3, Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { EnergyAlertsPanel } from './EnergyAlertsPanel';

interface Props {
  companyId: string;
  onNavigateToCase?: (caseId: string) => void;
}

interface OpStats {
  totalCases: number;
  byStatus: { name: string; value: number }[];
  pendingProposals: number;
  activeWorkflows: number;
  contractsExpiring: number;
  totalEstimatedSavings: number;
  totalValidatedSavings: number;
  closedCases: number;
  closeRate: number;
}

const CHART_COLORS = [
  'hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(142,71%,45%)',
  'hsl(271,91%,65%)', 'hsl(0,84%,60%)', 'hsl(199,89%,48%)',
  'hsl(30,90%,50%)', 'hsl(330,70%,50%)',
];

export function ElectricalOperationalDashboard({ companyId, onNavigateToCase }: Props) {
  const [stats, setStats] = useState<OpStats>({
    totalCases: 0, byStatus: [], pendingProposals: 0, activeWorkflows: 0,
    contractsExpiring: 0, totalEstimatedSavings: 0, totalValidatedSavings: 0,
    closedCases: 0, closeRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, status, estimated_annual_savings, contract_end_date')
        .eq('company_id', companyId);

      if (!cases) { setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const totalSavings = cases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0);
      const closedCases = cases.filter(c => c.status === 'completed').length;
      const closeRate = cases.length > 0 ? Math.round((closedCases / cases.length) * 100) : 0;

      // Contract expiring in 90 days
      const in90 = new Date();
      in90.setDate(in90.getDate() + 90);
      const expiring = cases.filter(c => c.contract_end_date && new Date(c.contract_end_date) <= in90).length;

      // Status distribution
      const statusMap: Record<string, number> = {};
      cases.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // Pending proposals + active workflows + validated savings
      let pendingProposals = 0, activeWorkflows = 0, validatedSavings = 0;

      if (caseIds.length > 0) {
        const [propRes, wfRes, trackRes] = await Promise.all([
          supabase.from('energy_proposals').select('id', { count: 'exact', head: true }).in('case_id', caseIds).in('status', ['draft', 'issued', 'sent']),
          supabase.from('energy_workflow_states').select('case_id, status').in('case_id', caseIds).order('changed_at', { ascending: false }),
          supabase.from('energy_tracking').select('case_id, observed_real_savings').in('case_id', caseIds),
        ]);

        pendingProposals = (propRes as any).count || 0;

        // Count unique cases with active workflow (not cerrado/cancelado)
        const latestByCase = new Map<string, string>();
        (wfRes.data || []).forEach((w: any) => {
          if (!latestByCase.has(w.case_id)) latestByCase.set(w.case_id, w.status);
        });
        activeWorkflows = [...latestByCase.values()].filter(s => !['cerrado', 'cancelado'].includes(s)).length;

        validatedSavings = (trackRes.data || []).reduce((s: number, t: any) => s + ((t.observed_real_savings || 0) * 12), 0);
      }

      setStats({
        totalCases: cases.length,
        byStatus,
        pendingProposals,
        activeWorkflows,
        contractsExpiring: expiring,
        totalEstimatedSavings: totalSavings,
        totalValidatedSavings: validatedSavings,
        closedCases,
        closeRate,
      });
    } catch (err) {
      console.error('[OperationalDashboard] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('es-ES');

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: FolderOpen, label: 'Total Exp.', value: stats.totalCases, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { icon: ArrowRightLeft, label: 'Cambios activos', value: stats.activeWorkflows, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { icon: FileText, label: 'Propuestas pend.', value: stats.pendingProposals, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Clock, label: 'Vencimientos', value: stats.contractsExpiring, color: 'text-red-500', bg: 'bg-red-500/10' },
          { icon: TrendingDown, label: 'Ahorro estimado', value: `${fmtK(stats.totalEstimatedSavings)}€`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: CheckCircle2, label: 'Ahorro validado', value: `${fmtK(stats.totalValidatedSavings)}€`, color: 'text-green-600', bg: 'bg-green-500/10' },
          { icon: Target, label: 'Tasa cierre', value: `${stats.closeRate}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: BarChart3, label: 'Cerrados', value: stats.closedCases, color: 'text-gray-600', bg: 'bg-gray-500/10' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${kpi.bg}`}><Icon className={`h-4 w-4 ${kpi.color}`} /></div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                    <p className="text-lg font-bold">{loading ? '...' : kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expedientes por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byStatus.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {stats.byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <EnergyAlertsPanel companyId={companyId} onNavigateToCase={onNavigateToCase} />
      </div>
    </div>
  );
}

export default ElectricalOperationalDashboard;
