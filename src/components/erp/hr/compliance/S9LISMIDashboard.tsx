/**
 * S9LISMIDashboard — LISMI/LGD Disability Quota Compliance
 * Cuota de reserva para personas con discapacidad (LGDPD Art. 42)
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Users, Info, FileText } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9LISMI } from '@/hooks/erp/hr/useS9LISMI';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export const S9LISMIDashboard = memo(function S9LISMIDashboard({ companyId }: Props) {
  const { quota, disabledEmployees, byWorkCenter, isLoading } = useS9LISMI(companyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ratioPercent = quota.currentRatio * 100;
  const requiredPercent = quota.requiredRatio * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Cuota LISMI / LGD
            <S9ReadinessBadge readiness="internal_ready" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Cumplimiento cuota de reserva para personas con discapacidad (LGDPD Art. 42)
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Plantilla total</p>
                <p className="text-xl font-bold">{quota.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Con discapacidad (≥33%)</p>
                <p className="text-xl font-bold">{quota.disabledEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center",
                quota.isCompliant ? "text-green-500" : "text-red-500"
              )}>
                {quota.isCompliant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ratio actual</p>
                <p className="text-xl font-bold">{ratioPercent.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Déficit</p>
                <p className="text-xl font-bold">{quota.deficit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estado de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Ratio actual: {ratioPercent.toFixed(1)}%</span>
            <span className="text-muted-foreground">Requerido: {requiredPercent}%</span>
          </div>
          <Progress
            value={quota.thresholdApplies ? Math.min((ratioPercent / requiredPercent) * 100, 100) : 100}
            className="h-3"
          />
          {!quota.thresholdApplies && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              La cuota LISMI no aplica a empresas con menos de 50 empleados.
            </p>
          )}

          {/* Alerts */}
          <div className="space-y-2 mt-3">
            {quota.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  'p-2.5 rounded-md text-sm flex items-start gap-2',
                  alert.level === 'critical' && 'bg-destructive/10 text-destructive',
                  alert.level === 'warning' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  alert.level === 'info' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                )}
              >
                {alert.level === 'critical' ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
                 alert.level === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
                 <Info className="h-4 w-4 mt-0.5 shrink-0" />}
                <div>
                  <p>{alert.message}</p>
                  {alert.legalRef && <p className="text-xs opacity-70 mt-0.5">Ref: {alert.legalRef}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Work Center */}
      {byWorkCenter.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desglose por Centro de Trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Centro</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Discapacidad</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Ratio</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {byWorkCenter.map(wc => (
                    <tr key={wc.workCenterId} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{wc.workCenterId === 'sin_centro' ? '(Sin centro)' : wc.workCenterId.slice(0, 8)}</td>
                      <td className="text-right py-2">{wc.total}</td>
                      <td className="text-right py-2">{wc.disabled}</td>
                      <td className="text-right py-2">{(wc.quota.currentRatio * 100).toFixed(1)}%</td>
                      <td className="text-right py-2">
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          wc.quota.isCompliant
                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
                        )}>
                          {wc.quota.isCompliant ? 'Cumple' : `Déficit: ${wc.quota.deficit}`}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disabled employees list */}
      {disabledEmployees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Empleados con Discapacidad Reconocida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {disabledEmployees.map(e => (
                <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="text-sm">{e.first_name} {e.last_name}</span>
                  <Badge variant="outline" className="text-[10px]">{e.disability_percentage}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal reference */}
      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <FileText className="h-3 w-3" />
        Base legal: LGDPD Art. 42 · RD 364/2005 (medidas alternativas)
      </div>
    </div>
  );
});

export default S9LISMIDashboard;
