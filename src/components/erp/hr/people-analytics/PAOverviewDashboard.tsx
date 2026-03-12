import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, TrendingDown, CalendarOff, DollarSign, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { type PAHROverview, type PAAlert, type PAInsight } from '@/hooks/erp/hr/usePeopleAnalytics';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  overview: PAHROverview | null;
  alerts: PAAlert[];
  insights: PAInsight[];
  isLoading: boolean;
  companyId: string;
  onRequestInsights: () => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function PAOverviewDashboard({ overview, alerts, insights, isLoading, onRequestInsights }: Props) {
  if (isLoading && !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Sin datos de empleados disponibles</CardContent></Card>;
  }

  const kpis = [
    { label: 'Headcount', value: overview.activeEmployees, icon: Users, color: 'text-primary' },
    { label: 'Altas (12m)', value: overview.newHires, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Bajas (12m)', value: overview.terminations, icon: TrendingDown, color: 'text-destructive' },
    { label: 'Rotación', value: `${overview.turnoverRate}%`, icon: CalendarOff, color: overview.turnoverRate > 15 ? 'text-destructive' : 'text-amber-500' },
    { label: 'Antigüedad media', value: `${overview.avgTenure} años`, icon: Clock, color: 'text-muted-foreground' },
  ];

  const genderData = [
    { name: 'Hombres', value: overview.genderDistribution.male },
    { name: 'Mujeres', value: overview.genderDistribution.female },
    { name: 'Otro', value: overview.genderDistribution.other },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold text-foreground">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gender distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución por Género</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By department */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Departamento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={overview.byDepartment.slice(0, 6)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="department" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Insights IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.length > 0 ? (
              insights.slice(0, 3).map(ins => (
                <div key={ins.id} className="p-2 rounded-md bg-background border text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <Badge variant={ins.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[9px]">{ins.severity}</Badge>
                    <span className="font-medium text-foreground">{ins.title}</span>
                  </div>
                  <p className="text-muted-foreground">{ins.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Solicita análisis IA de tus datos</p>
                <Button size="sm" variant="outline" onClick={onRequestInsights} className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" /> Generar Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas Activas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 4).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2 rounded-md bg-background border text-xs">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px] shrink-0 mt-0.5">
                    {alert.severity}
                  </Badge>
                  <div>
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <p className="text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
