/**
 * S9RetributiveAuditPanel — Auditoría Retributiva Integrada (S9.4)
 * Contextualiza brechas salariales con VPT sin justificarlas automáticamente.
 */

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Info, Scale, TrendingDown, FileText } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9RetributiveAudit } from '@/hooks/erp/hr/useS9RetributiveAudit';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export const S9RetributiveAuditPanel = memo(function S9RetributiveAuditPanel({ companyId }: Props) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentMonth);
  const { report, isLoading, hasVPTData, employeeCount, payrollCount, vptCount } = useS9RetributiveAudit(companyId, period);

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Auditoría Retributiva
            <S9ReadinessBadge readiness="internal_ready" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Análisis de brechas salariales con contextualización VPT
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Disclaimer — always visible */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <span>
            {report?.disclaimer ?? 'La valoración de puestos es una herramienta de soporte analítico. Las diferencias retributivas requieren análisis individualizado conforme al RD 902/2020.'}
          </span>
        </CardContent>
      </Card>

      {/* KPIs */}
      {report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Brecha global</p>
                <p className={cn(
                  "text-xl font-bold",
                  report.globalGapPercent >= 0.25 ? 'text-destructive' : 'text-emerald-600'
                )}>
                  {(report.globalGapPercent * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Contextualizada VPT</p>
                <p className="text-xl font-bold text-blue-600">
                  {report.globalGapPercent > 0
                    ? `${(report.globalContextualizedPercent / report.globalGapPercent * 100).toFixed(0)}%`
                    : '—'
                  }
                </p>
                <p className="text-[10px] text-muted-foreground">del total de brecha</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">No explicada</p>
                <p className={cn(
                  "text-xl font-bold",
                  report.globalUnexplainedPercent >= 0.20 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {(report.globalUnexplainedPercent * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Grupos con alerta</p>
                <p className={cn(
                  "text-xl font-bold",
                  report.groupsWithAlert > 0 ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {report.groupsWithAlert}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* VPT coverage notice */}
          {!hasVPTData && (
            <Card className="border-dashed border-amber-500/30">
              <CardContent className="p-3 text-xs text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                No hay valoraciones de puestos aprobadas. La contextualización VPT no está disponible.
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {report.entries.some(e => e.alerts.length > 0) && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Brechas significativas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.entries.flatMap(e => e.alerts).map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-2.5 rounded-md text-sm',
                      alert.level === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {alert.message}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Detail table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Desglose por Grupo Profesional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">Grupo</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">H</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">M</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Media H</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Media M</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Brecha</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">VPT H</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">VPT M</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Context.</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">No expl.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.entries.map((entry, i) => (
                      <tr key={i} className={cn(
                        "border-b last:border-0",
                        entry.totalGapPercent >= 0.25 && 'bg-amber-500/5',
                      )}>
                        <td className="py-2">{entry.groupLabel}</td>
                        <td className="text-right py-2">{entry.maleCount}</td>
                        <td className="text-right py-2">{entry.femaleCount}</td>
                        <td className="text-right py-2">{entry.maleMeanSalary.toFixed(0)}€</td>
                        <td className="text-right py-2">{entry.femaleMeanSalary.toFixed(0)}€</td>
                        <td className="text-right py-2">
                          <Badge variant="outline" className={cn(
                            'text-[10px]',
                            entry.totalGapPercent >= 0.25
                              ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
                          )}>
                            {(entry.totalGapPercent * 100).toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right py-2 text-muted-foreground">
                          {entry.maleAvgVPT != null ? entry.maleAvgVPT.toFixed(0) : '—'}
                        </td>
                        <td className="text-right py-2 text-muted-foreground">
                          {entry.femaleAvgVPT != null ? entry.femaleAvgVPT.toFixed(0) : '—'}
                        </td>
                        <td className="text-right py-2">
                          {entry.gapContextualizedByVPT > 0
                            ? <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                {(entry.gapContextualizedByVPT * 100).toFixed(1)}%
                              </Badge>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="text-right py-2">
                          {entry.gapUnexplained > 0
                            ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                {(entry.gapUnexplained * 100).toFixed(1)}%
                              </Badge>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Data summary */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
            <span>{employeeCount} empleados</span>
            <span>{payrollCount} nóminas</span>
            <span>{vptCount} valoraciones VPT</span>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay datos suficientes para el período {period}</p>
            <p className="text-xs mt-1">Se necesitan nóminas cerradas o pagadas para generar la auditoría.</p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <FileText className="h-3 w-3" />
        Base legal: RD 902/2020 · Directiva UE 2023/970 · Art. 28.2 ET
      </div>
    </div>
  );
});

export default S9RetributiveAuditPanel;
