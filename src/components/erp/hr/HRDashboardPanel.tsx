/**
 * HRDashboardPanel - Panel principal del dashboard de RRHH
 * Conectado a datos reales de Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Calendar, FileText, DollarSign, Building2,
  TrendingUp, TrendingDown, HeartHandshake, CheckCircle,
  RefreshCw, AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { HRPayrollComplianceWidget } from './widgets/HRPayrollComplianceWidget';

interface HRDashboardPanelProps {
  companyId: string;
}

interface DashboardData {
  headcountData: Array<{ month: string; empleados: number; altas: number; bajas: number }>;
  departmentData: Array<{ name: string; value: number; color: string }>;
  contractTypes: Array<{ type: string; count: number; percentage: number }>;
  upcomingEvents: Array<{ type: string; title: string; date: string; days?: number; alert?: boolean }>;
  kpis: Array<{ label: string; value: string; trend: 'up' | 'down'; target: string; status: 'good' | 'warning' | 'neutral' }>;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))'
];

// Demo data as fallback
const DEMO_DATA: DashboardData = {
  headcountData: [
    { month: 'Ene', empleados: 42, altas: 3, bajas: 1 },
    { month: 'Feb', empleados: 44, altas: 2, bajas: 0 },
    { month: 'Mar', empleados: 45, altas: 2, bajas: 1 },
    { month: 'Abr', empleados: 46, altas: 1, bajas: 0 },
    { month: 'May', empleados: 47, altas: 2, bajas: 1 },
    { month: 'Jun', empleados: 47, altas: 1, bajas: 1 },
  ],
  departmentData: [
    { name: 'Producción', value: 18, color: CHART_COLORS[0] },
    { name: 'Administración', value: 8, color: CHART_COLORS[1] },
    { name: 'Comercial', value: 10, color: CHART_COLORS[2] },
    { name: 'IT', value: 6, color: CHART_COLORS[3] },
    { name: 'RRHH', value: 3, color: CHART_COLORS[4] },
    { name: 'Dirección', value: 2, color: CHART_COLORS[5] },
  ],
  contractTypes: [
    { type: 'Indefinido', count: 32, percentage: 68 },
    { type: 'Temporal', count: 10, percentage: 21 },
    { type: 'Prácticas', count: 3, percentage: 6 },
    { type: 'Formación', count: 2, percentage: 5 },
  ],
  upcomingEvents: [
    { type: 'vacation', title: 'Vacaciones - María García', date: '2026-02-01', days: 5 },
    { type: 'contract', title: 'Fin contrato - Juan López', date: '2026-02-15', alert: true },
    { type: 'review', title: 'Evaluación - Dpto. IT', date: '2026-02-10' },
    { type: 'payroll', title: 'Cierre nóminas Enero', date: '2026-01-31', alert: true },
    { type: 'birthday', title: 'Cumpleaños - Ana Martín', date: '2026-02-05' },
  ],
  kpis: [
    { label: 'Rotación anual', value: '8.5%', trend: 'down', target: '<10%', status: 'good' },
    { label: 'Absentismo', value: '3.2%', trend: 'up', target: '<3%', status: 'warning' },
    { label: 'Satisfacción', value: '7.8/10', trend: 'up', target: '>8', status: 'good' },
    { label: 'Formación h/emp', value: '24h', trend: 'up', target: '40h', status: 'neutral' },
  ]
};

export function HRDashboardPanel({ companyId }: HRDashboardPanelProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>(DEMO_DATA);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: fnData, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: { action: 'get_full_dashboard', companyId }
      });

      if (error) throw error;

      if (fnData?.success && fnData?.data) {
        const apiData = fnData.data;
        
        // Map headcount evolution
        const headcountData = apiData.headcountEvolution?.length > 0 
          ? apiData.headcountEvolution.map((h: any, idx: number) => ({
              month: h.month || ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][idx] || `M${idx + 1}`,
              empleados: h.total || 0,
              altas: h.hires || 0,
              bajas: h.departures || 0
            }))
          : DEMO_DATA.headcountData;

        // Map department distribution
        const departmentData = apiData.departmentDistribution?.length > 0
          ? apiData.departmentDistribution.map((d: any, idx: number) => ({
              name: d.department || d.name || 'Otro',
              value: d.count || d.value || 0,
              color: CHART_COLORS[idx % CHART_COLORS.length]
            }))
          : DEMO_DATA.departmentData;

        // Map contract types
        const totalContracts = apiData.contractTypes?.reduce((sum: number, c: any) => sum + (c.count || 0), 0) || 1;
        const contractTypes = apiData.contractTypes?.length > 0
          ? apiData.contractTypes.map((c: any) => ({
              type: c.type || c.contract_type || 'Otro',
              count: c.count || 0,
              percentage: Math.round((c.count || 0) / totalContracts * 100)
            }))
          : DEMO_DATA.contractTypes;

        // Map upcoming events
        const upcomingEvents = apiData.upcomingEvents?.length > 0
          ? apiData.upcomingEvents.map((e: any) => ({
              type: e.type || 'calendar',
              title: e.title || e.description || 'Evento',
              date: e.date || new Date().toISOString().split('T')[0],
              days: e.days,
              alert: e.alert || e.priority === 'high'
            }))
          : DEMO_DATA.upcomingEvents;

        // Map KPIs
        const kpis = apiData.kpis?.length > 0
          ? apiData.kpis.map((k: any) => ({
              label: k.label || k.name || 'KPI',
              value: k.value || '0',
              trend: k.trend || 'up',
              target: k.target || '-',
              status: k.status || 'neutral'
            }))
          : DEMO_DATA.kpis;

        setData({ headcountData, departmentData, contractTypes, upcomingEvents, kpis });
      }
    } catch (err) {
      console.warn('[HRDashboardPanel] Error loading data, using demo:', err);
      // Keep demo data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => fetchDashboardData(true);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-4"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.kpis.map((kpi, index) => (
          <Card key={index} className={`
            ${kpi.status === 'good' ? 'border-success/30 bg-success/5' : ''}
            ${kpi.status === 'warning' ? 'border-warning/30 bg-warning/5' : ''}
            ${kpi.status === 'neutral' ? 'border-primary/30 bg-primary/5' : ''}
          `}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">Objetivo: {kpi.target}</p>
                </div>
                {kpi.trend === 'up' ? (
                  <TrendingUp className={`h-5 w-5 ${kpi.status === 'good' ? 'text-success' : 'text-warning'}`} />
                ) : (
                  <TrendingDown className={`h-5 w-5 ${kpi.status === 'good' ? 'text-success' : 'text-destructive'}`} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolución plantilla */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Evolución de Plantilla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.headcountData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="empleados" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por departamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distribución por Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {data.departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Widget de Cumplimiento de Nóminas */}
        <HRPayrollComplianceWidget 
          companyId={companyId}
          className="lg:row-span-2"
        />
        {/* Tipos de contrato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tipos de Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contractTypes.map((ct, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{ct.type}</span>
                  <span className="font-medium">{ct.count} ({ct.percentage}%)</span>
                </div>
                <Progress value={ct.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {data.upcomingEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      event.alert ? 'border-warning/30 bg-warning/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {event.type === 'vacation' && <Calendar className="h-4 w-4 text-primary" />}
                      {event.type === 'contract' && <FileText className="h-4 w-4 text-warning" />}
                      {event.type === 'review' && <CheckCircle className="h-4 w-4 text-success" />}
                      {event.type === 'payroll' && <DollarSign className="h-4 w-4 text-accent" />}
                      {event.type === 'birthday' && <HeartHandshake className="h-4 w-4 text-pink-500" />}
                      {!['vacation','contract','review','payroll','birthday'].includes(event.type) && (
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                    {event.alert && (
                      <Badge variant="outline" className="text-warning border-warning">
                        Atención
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HRDashboardPanel;
