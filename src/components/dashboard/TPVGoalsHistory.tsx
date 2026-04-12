import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, History, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthlyProgress {
  month: string;
  monthLabel: string;
  revenue: number;
  revenueTarget: number;
  commission: number;
  commissionTarget: number;
  revenueProgress: number;
  commissionProgress: number;
}

export function TPVGoalsHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<MonthlyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(6);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'revenue' | 'commission'>('all');
  const isAdmin = user?.email?.includes('admin');

  useEffect(() => {
    fetchHistory();
  }, [user, timeRange]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const endDate = new Date();
      const startDate = subMonths(endDate, timeRange - 1);
      
      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      // Fetch goals for the period
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .in('metric_type', ['tpv_revenue', 'tpv_commission'])
        .gte('period_end', startDate.toISOString())
        .lte('period_start', endDate.toISOString());

      if (goalsError) throw goalsError;

      // Fetch TPV terminals
      let terminalsQuery = supabase
        .from('company_tpv_terminals')
        .select('monthly_volume, commission_rate, status, company_id, id, created_at');

      if (!isAdmin && user?.id) {
        const { data: gestorCompanies } = await supabase
          .from('companies')
          .select('id')
          .eq('gestor_id', user.id);

        const companyIds = gestorCompanies?.map(c => c.id) || [];
        if (companyIds.length > 0) {
          terminalsQuery = terminalsQuery.in('company_id', companyIds);
        } else {
          setHistory([]);
          setLoading(false);
          return;
        }
      }

      const { data: terminals, error: terminalsError } = await terminalsQuery;
      if (terminalsError) throw terminalsError;

      // Calculate monthly progress
      const monthlyData: MonthlyProgress[] = months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthKey = format(month, 'yyyy-MM');

        // Filter terminals active in this month
        const monthTerminals = terminals?.filter(t => {
          const createdAt = new Date(t.created_at);
          return createdAt <= monthEnd;
        }) || [];

        const activeTerminals = monthTerminals.filter(t => t.status === 'active');

        // Calculate metrics for this month
        const totalMonthlyVolume = monthTerminals.reduce((sum, t) => sum + (t.monthly_volume || 0), 0) || 0;

        const averageCommission = activeTerminals.length > 0
          ? activeTerminals.reduce((sum, t) => sum + (t.commission_rate || 0), 0) / activeTerminals.length
          : 0;

        // Find goals for this month
        const revenueGoal = goals?.find(g => 
          g.metric_type === 'tpv_revenue' &&
          parseISO(g.period_start) <= monthEnd &&
          parseISO(g.period_end) >= monthStart
        );

        const commissionGoal = goals?.find(g => 
          g.metric_type === 'tpv_commission' &&
          parseISO(g.period_start) <= monthEnd &&
          parseISO(g.period_end) >= monthStart
        );

        const revenueTarget = revenueGoal?.target_value || 0;
        const commissionTarget = commissionGoal?.target_value || 0;

        const revenueProgress = revenueTarget > 0 ? Math.min(100, (totalMonthlyVolume / revenueTarget) * 100) : 0;
        const commissionProgress = commissionTarget > 0 
          ? Math.min(100, Math.max(0, ((commissionTarget - averageCommission) / commissionTarget) * 100 + 100))
          : 0;

        return {
          month: monthKey,
          monthLabel: format(month, 'MMM yyyy', { locale: es }),
          revenue: totalMonthlyVolume,
          revenueTarget,
          commission: averageCommission,
          commissionTarget,
          revenueProgress,
          commissionProgress,
        };
      });

      setHistory(monthlyData);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const calculateTrend = (data: MonthlyProgress[], key: keyof MonthlyProgress) => {
    if (data.length < 2) return 0;
    const recent = data[data.length - 1][key] as number;
    const previous = data[data.length - 2][key] as number;
    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const revenueTrend = calculateTrend(history, 'revenue');
  const commissionTrend = calculateTrend(history, 'commission');

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Evolución Histórica
          </h3>
          <p className="text-sm text-muted-foreground">
            Progreso de objetivos mes a mes
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as typeof selectedMetric)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las métricas</SelectItem>
              <SelectItem value="revenue">Volumen</SelectItem>
              <SelectItem value="commission">Comisión</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trend Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tendencia Volumen Mensual</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${revenueTrend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">vs mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tendencia Comisión</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${commissionTrend <= 0 ? 'text-green-500' : 'text-red-500'}`} />
              {commissionTrend >= 0 ? '+' : ''}{commissionTrend.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">vs mes anterior (menor es mejor)</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      {(selectedMetric === 'all' || selectedMetric === 'revenue') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolución de Volumen Mensual TPV
            </CardTitle>
            <CardDescription>Comparación de volumen real vs objetivo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenueTarget" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.2}
                  name="Objetivo" 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.4}
                  name="Real" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Commission Chart */}
      {(selectedMetric === 'all' || selectedMetric === 'commission') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolución de Comisión de Tarjetas
            </CardTitle>
            <CardDescription>Comparación de comisión real vs objetivo (menor es mejor)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis tickFormatter={formatPercentage} />
                <Tooltip formatter={(value: number) => formatPercentage(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="commissionTarget" 
                  stroke="#8884d8" 
                  strokeDasharray="5 5"
                  name="Objetivo" 
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="commission" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Real" 
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Cumplimiento</CardTitle>
          <CardDescription>Porcentaje de cumplimiento de objetivos por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              {(selectedMetric === 'all' || selectedMetric === 'revenue') && (
                <Line 
                  type="monotone" 
                  dataKey="revenueProgress" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Volumen" 
                  dot={{ r: 4 }}
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'commission') && (
                <Line 
                  type="monotone" 
                  dataKey="commissionProgress" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Comisión" 
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Mes</th>
                  <th className="text-right py-2 px-4">Volumen Mensual</th>
                  <th className="text-right py-2 px-4">Comisión</th>
                  <th className="text-center py-2 px-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((month) => {
                  const avgProgress = (month.revenueProgress + month.commissionProgress) / 2;
                  return (
                    <tr key={month.month} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 font-medium">{month.monthLabel}</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(month.revenue)}
                        <div className="text-xs text-muted-foreground">
                          {month.revenueProgress.toFixed(0)}%
                        </div>
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatPercentage(month.commission)}
                        <div className="text-xs text-muted-foreground">
                          {month.commissionProgress.toFixed(0)}%
                        </div>
                      </td>
                      <td className="text-center py-2 px-4">
                        {avgProgress >= 90 ? (
                          <Badge className="bg-green-500">Excelente</Badge>
                        ) : avgProgress >= 75 ? (
                          <Badge className="bg-blue-500">Bueno</Badge>
                        ) : avgProgress >= 60 ? (
                          <Badge variant="secondary">Regular</Badge>
                        ) : (
                          <Badge variant="destructive">Bajo</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
