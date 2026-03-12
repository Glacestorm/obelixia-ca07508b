import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { type PAEquityMetrics } from '@/hooks/erp/hr/usePeopleAnalytics';

interface Props {
  data: PAEquityMetrics | null;
  isLoading: boolean;
}

export function PAEquityDashboard({ data, isLoading }: Props) {
  if (isLoading && !data) {
    return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>;
  }

  if (!data) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Sin datos de equidad salarial disponibles</CardContent></Card>;
  }

  const gapSeverity = Math.abs(data.genderPayGap) > 15 ? 'destructive' : Math.abs(data.genderPayGap) > 10 ? 'secondary' : 'default';

  return (
    <div className="space-y-4">
      {/* Main gap card */}
      <Card className={Math.abs(data.genderPayGap) > 10 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50'}>
        <CardContent className="p-6 text-center">
          <Scale className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground mb-1">Brecha Salarial de Género</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-4xl font-bold text-foreground">{data.genderPayGap}%</p>
            <Badge variant={gapSeverity as 'default' | 'secondary' | 'destructive'}>
              {Math.abs(data.genderPayGap) > 15 ? 'Crítico' : Math.abs(data.genderPayGap) > 10 ? 'Atención' : 'Aceptable'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.genderPayGap > 0 ? 'Los hombres ganan más en promedio' : data.genderPayGap < 0 ? 'Las mujeres ganan más en promedio' : 'Paridad salarial'}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By department */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Brecha por Departamento</CardTitle></CardHeader>
          <CardContent>
            {data.genderPayGapByDept.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {data.genderPayGapByDept.map(d => (
                  <div key={d.department} className="flex items-center justify-between p-2 rounded-md border text-xs">
                    <span className="text-foreground font-medium">{d.department}</span>
                    <div className="flex items-center gap-2">
                      {d.gap > 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <TrendingUp className="h-3 w-3 text-emerald-500" />}
                      <Badge variant={Math.abs(d.gap) > 15 ? 'destructive' : 'secondary'} className="text-[9px]">{d.gap}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Datos por departamento no disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Outliers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Outliers Salariales</CardTitle></CardHeader>
          <CardContent>
            {data.outliers.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {data.outliers.map(o => (
                  <div key={o.employeeId} className="p-2 rounded-md border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{o.employeeName}</span>
                      <Badge variant={o.direction === 'below' ? 'destructive' : 'secondary'} className="text-[9px]">
                        {o.direction === 'below' ? 'Bajo banda' : 'Sobre banda'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Salario: {o.salary.toLocaleString('es-ES')}€ | Banda: {o.bandMin.toLocaleString('es-ES')}–{o.bandMax.toLocaleString('es-ES')}€
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No se detectan outliers salariales</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
