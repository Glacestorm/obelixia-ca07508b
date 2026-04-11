/**
 * S9SalaryRegisterPanel — Registro Retributivo Formal (RD 902/2020)
 */

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, FileText, TrendingDown } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9SalaryRegister } from '@/hooks/erp/hr/useS9SalaryRegister';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export const S9SalaryRegisterPanel = memo(function S9SalaryRegisterPanel({ companyId }: Props) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentMonth);
  const { report, isLoading, employeeCount, payrollCount } = useS9SalaryRegister(companyId, period);

  // Generate last 6 months
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
            Registro Retributivo
            <S9ReadinessBadge readiness="internal_ready" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Estructura formal según RD 902/2020
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Empleados</p>
            <p className="text-xl font-bold">{employeeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Nóminas analizadas</p>
            <p className="text-xl font-bold">{payrollCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Brecha global</p>
            <p className={cn(
              "text-xl font-bold",
              report && report.globalGap >= 0.25 ? 'text-destructive' : 'text-emerald-600'
            )}>
              {report ? `${(report.globalGap * 100).toFixed(1)}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Alertas</p>
            <p className="text-xl font-bold">{report?.alerts.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {report && report.alerts.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Brechas significativas detectadas ({'>'}25%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.alerts.map((alert, i) => (
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

      {/* Register Table */}
      {report && report.entries.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparativa por Sexo × Grupo Profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Grupo</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">H (n)</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">M (n)</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Media H</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Media M</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Mediana H</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Mediana M</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Brecha</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry, i) => (
                    <tr key={i} className={cn(
                      "border-b last:border-0",
                      entry.hasSignificantGap && 'bg-amber-500/5',
                    )}>
                      <td className="py-2">{entry.groupOrCategory}</td>
                      <td className="py-2 text-muted-foreground">{entry.concept}</td>
                      <td className="text-right py-2">{entry.maleCount}</td>
                      <td className="text-right py-2">{entry.femaleCount}</td>
                      <td className="text-right py-2">{entry.maleMean.toFixed(0)}€</td>
                      <td className="text-right py-2">{entry.femaleMean.toFixed(0)}€</td>
                      <td className="text-right py-2">{entry.maleMedian.toFixed(0)}€</td>
                      <td className="text-right py-2">{entry.femaleMedian.toFixed(0)}€</td>
                      <td className="text-right py-2">
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          entry.hasSignificantGap
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
                        )}>
                          {(entry.gapPercent * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay datos de nómina cerrada para el período {period}</p>
            <p className="text-xs mt-1">El registro retributivo se genera a partir de nóminas con estado cerrado o pagado.</p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <FileText className="h-3 w-3" />
        Base legal: RD 902/2020 · Art. 28.2 ET
      </div>
    </div>
  );
});

export default S9SalaryRegisterPanel;
