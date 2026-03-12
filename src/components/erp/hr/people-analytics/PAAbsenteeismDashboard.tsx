import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarOff, AlertTriangle, TrendingDown } from 'lucide-react';
import { type PAAbsenteeismAnalytics } from '@/hooks/erp/hr/usePeopleAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: PAAbsenteeismAnalytics | null;
  isLoading: boolean;
}

export function PAAbsenteeismDashboard({ data, isLoading }: Props) {
  if (isLoading && !data) {
    return <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>;
  }

  if (!data) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Sin datos de absentismo disponibles</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Días Perdidos</p>
              <p className="text-xl font-bold text-foreground">{data.totalDaysLost}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Bradford Factor Medio</p>
              <p className="text-xl font-bold text-foreground">{data.avgBradfordFactor}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Casos Bradford Alto</p>
              <p className="text-xl font-bold text-foreground">{data.highBradford.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By type */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Tipo de Ausencia</CardTitle></CardHeader>
          <CardContent>
            {data.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byType}>
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="days" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Días" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos por tipo</div>
            )}
          </CardContent>
        </Card>

        {/* High Bradford */}
        <Card className={data.highBradford.length > 0 ? 'border-amber-500/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Empleados con Bradford Factor Alto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.highBradford.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.highBradford.map(emp => (
                  <div key={emp.employeeId} className="flex items-center justify-between p-2 rounded-md border bg-background text-xs">
                    <span className="text-foreground font-medium">{emp.employeeName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{emp.episodes} episodios</span>
                      <Badge variant={emp.factor > 500 ? 'destructive' : 'secondary'} className="text-[9px]">
                        BF: {emp.factor}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No se han detectado casos de absentismo repetitivo</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
