/**
 * EnergyAdvancedAnalytics - Multi-energy advanced charts and KPIs
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Flame, Sun, BarChart3, TrendingDown, Loader2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEnergyTypeFilter, ENERGY_TYPE_LABELS } from '@/hooks/erp/useEnergyTypeFilter';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export function EnergyAdvancedAnalytics({ companyId }: Props) {
  const { energyType, setEnergyType } = useEnergyTypeFilter();
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('savings');
  const [data, setData] = useState({
    savingsByType: [] as { type: string; estimated: number; validated: number }[],
    costBreakdown: [] as { name: string; value: number }[],
    consumptionTrend: [] as { month: string; electricity: number; gas: number }[],
    casesByEnergy: [] as { type: string; count: number }[],
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('energy_type, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings')
        .eq('company_id', companyId);

      if (!cases) { setLoading(false); return; }

      // Savings by type
      let elecEst = 0, gasEst = 0, solarEst = 0, elecVal = 0, gasVal = 0, solarVal = 0;
      const typeCount: Record<string, number> = {};
      cases.forEach(c => {
        elecEst += c.estimated_annual_savings || 0;
        gasEst += c.estimated_gas_savings || 0;
        solarEst += c.estimated_solar_savings || 0;
        elecVal += c.validated_annual_savings || 0;
        gasVal += c.validated_gas_savings || 0;
        solarVal += c.validated_solar_savings || 0;
        typeCount[c.energy_type || 'electricity'] = (typeCount[c.energy_type || 'electricity'] || 0) + 1;
      });

      setData({
        savingsByType: [
          { type: 'Electricidad', estimated: elecEst, validated: elecVal },
          { type: 'Gas', estimated: gasEst, validated: gasVal },
          { type: 'Solar', estimated: solarEst, validated: solarVal },
        ].filter(d => d.estimated > 0 || d.validated > 0),
        costBreakdown: [
          { name: 'Electricidad', value: elecEst },
          { name: 'Gas', value: gasEst },
          { name: 'Solar', value: solarEst },
        ].filter(d => d.value > 0),
        consumptionTrend: [], // Would need invoice data aggregated by month
        casesByEnergy: Object.entries(typeCount).map(([type, count]) => ({ type: ENERGY_TYPE_LABELS[type as keyof typeof ENERGY_TYPE_LABELS] || type, count })),
      });
    } catch (err) {
      console.error('[EnergyAdvancedAnalytics] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const COLORS = ['hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(25,95%,53%)', 'hsl(142,71%,45%)'];

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Cargando analítica...</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Analítica Energética Avanzada</h2>
        </div>
      </div>

      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <TabsList>
          <TabsTrigger value="savings" className="text-xs">Ahorro</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribución</TabsTrigger>
          <TabsTrigger value="cases" className="text-xs">Expedientes</TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ahorro estimado vs validado por tipo</CardTitle></CardHeader>
              <CardContent>
                {data.savingsByType.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de ahorro</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.savingsByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="estimated" fill="hsl(45,93%,47%)" name="Estimado €/año" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="validated" fill="hsl(142,71%,45%)" name="Validado €/año" radius={[4, 4, 0, 0]} />
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
                      <Pie data={data.costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, value }) => `${name}: ${value.toLocaleString()}€`}>
                        {data.costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de ahorro</CardTitle></CardHeader>
            <CardContent>
              {data.savingsByType.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.savingsByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="type" type="category" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="estimated" fill="hsl(var(--primary))" name="Estimado" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="validated" fill="hsl(142,71%,45%)" name="Validado" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Expedientes por tipo de energía</CardTitle></CardHeader>
            <CardContent>
              {data.casesByEnergy.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">Sin expedientes</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.casesByEnergy} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                      {data.casesByEnergy.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnergyAdvancedAnalytics;
