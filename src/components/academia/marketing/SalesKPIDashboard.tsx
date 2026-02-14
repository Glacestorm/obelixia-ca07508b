import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, DollarSign, BarChart3, Target, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export function SalesKPIDashboard() {
  const [metrics, setMetrics] = useState({ totalLeads: 0, converted: 0, totalFunnels: 0, totalCohorts: 0, totalSubs: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [leads, funnels, cohorts, subs] = await Promise.all([
        supabase.from('academia_leads').select('id, converted', { count: 'exact' }),
        supabase.from('academia_sales_funnels').select('id', { count: 'exact' }),
        supabase.from('academia_cohorts').select('id', { count: 'exact' }),
        supabase.from('academia_subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
      ]);
      setMetrics({
        totalLeads: leads.count || 0,
        converted: leads.data?.filter(l => l.converted).length || 0,
        totalFunnels: funnels.count || 0,
        totalCohorts: cohorts.count || 0,
        totalSubs: subs.count || 0,
      });
    };
    fetch();
  }, []);

  const conversionRate = metrics.totalLeads > 0 ? ((metrics.converted / metrics.totalLeads) * 100).toFixed(1) : '0';

  const kpis = [
    { label: 'Total Leads', value: metrics.totalLeads, icon: Users, color: 'text-blue-500' },
    { label: 'Convertidos', value: metrics.converted, icon: Target, color: 'text-green-500' },
    { label: 'Tasa Conversión', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-violet-500' },
    { label: 'Funnels Activos', value: metrics.totalFunnels, icon: BarChart3, color: 'text-amber-500' },
    { label: 'Cohortes', value: metrics.totalCohorts, icon: Users, color: 'text-orange-500' },
    { label: 'Suscripciones', value: metrics.totalSubs, icon: DollarSign, color: 'text-emerald-500' },
  ];

  const benchmarks = [
    { name: 'Landing→Lead', target: '25-45%', actual: conversionRate },
    { name: 'Webinar→Venta', target: '3-12%', actual: '—' },
    { name: 'Tasa Reembolso', target: '<5%', actual: '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">KPIs de Ventas</h2>
          <p className="text-sm text-muted-foreground">Métricas clave de conversión y rendimiento comercial</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Benchmarks del Sector</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {benchmarks.map(b => (
              <div key={b.name} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">{b.name}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Objetivo: {b.target}</Badge>
                  <Badge variant="secondary">Actual: {b.actual}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SalesKPIDashboard;
