import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, TrendingDown, TrendingUp, Info, Briefcase } from 'lucide-react';
import { type PAEquityMetrics } from '@/hooks/erp/hr/usePeopleAnalytics';
import type { EquityVPTContext } from '@/types/s9-compliance';

interface Props {
  data: PAEquityMetrics | null;
  isLoading: boolean;
  vptContext?: EquityVPTContext | null;
}

export function PAEquityDashboard({ data, isLoading, vptContext }: Props) {
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

      {/* S9.5 — VPT Context Section (conditional, descriptive only) */}
      {vptContext && vptContext.vptContextAvailable && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Contexto VPT — Información Complementaria
              </span>
              <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600">internal_ready</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cobertura VPT</p>
                <p className="text-lg font-bold text-foreground">{(vptContext.vptCoverage * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">{vptContext.positionsValued}/{vptContext.totalPositions} puestos</p>
              </div>
              {vptContext.avgScoreMale != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Score Medio H</p>
                  <p className="text-lg font-bold text-foreground">{vptContext.avgScoreMale.toFixed(1)}</p>
                </div>
              )}
              {vptContext.avgScoreFemale != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Score Medio M</p>
                  <p className="text-lg font-bold text-foreground">{vptContext.avgScoreFemale.toFixed(1)}</p>
                </div>
              )}
              {vptContext.scoreDifference != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Diferencia Score</p>
                  <p className={`text-lg font-bold ${vptContext.divergenceRelevant ? 'text-amber-600' : 'text-foreground'}`}>
                    {vptContext.scoreDifference.toFixed(1)} pts
                  </p>
                </div>
              )}
            </div>

            {vptContext.insight && (
              <div className="p-2.5 rounded-md bg-blue-500/10 text-xs text-muted-foreground">
                <Info className="h-3 w-3 inline mr-1 text-blue-500" />
                {vptContext.insight}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-2">
              {vptContext.disclaimer}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}