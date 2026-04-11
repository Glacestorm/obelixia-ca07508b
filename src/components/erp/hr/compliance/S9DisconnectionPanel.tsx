/**
 * S9DisconnectionPanel — Digital Disconnection Protocol
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Users, FileText, Wifi } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9DisconnectionDigital } from '@/hooks/erp/hr/useS9DisconnectionDigital';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

export const S9DisconnectionPanel = memo(function S9DisconnectionPanel({ companyId }: Props) {
  const { policies, violations, metrics, isLoading } = useS9DisconnectionDigital(companyId);

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
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Desconexión Digital
          <S9ReadinessBadge readiness="internal_ready" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Protocolo de desconexión digital — Art. 88 LOPDGDD · Art. 18 Ley 10/2021
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tasa cumplimiento</p>
                <p className="text-xl font-bold">{metrics.complianceRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Incumplimientos (30d)</p>
                <p className="text-xl font-bold">{metrics.totalViolations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Empleados afectados</p>
                <p className="text-xl font-bold">{metrics.employeesAffected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-xs text-muted-foreground">Media min. fuera</p>
                <p className="text-xl font-bold">{metrics.averageMinutesOutside.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Policies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Políticas de Desconexión Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length > 0 ? (
            <div className="space-y-2">
              {policies.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md border bg-card">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.rules ? `${(p.rules as any).disconnection_start || '18:00'} - ${(p.rules as any).disconnection_end || '08:00'}` : 'Sin horario configurado'}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                    Activa
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay políticas de desconexión configuradas. Configúrelas desde Control Horario.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Violations */}
      {violations.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Incumplimientos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Empleado</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Hora salida</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Min. exceso</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.slice(0, 15).map((v, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{v.employeeId.slice(0, 8)}</td>
                      <td className="py-2">{v.date}</td>
                      <td className="text-right py-2">{v.endTime}</td>
                      <td className="text-right py-2">
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          v.minutesOutside > 60
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200',
                        )}>
                          {v.minutesOutside} min
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {violations.length > 15 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Mostrando 15 de {violations.length} incumplimientos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <FileText className="h-3 w-3" />
        Base legal: Art. 88 LOPDGDD · Art. 18 Ley 10/2021
      </div>
    </div>
  );
});

export default S9DisconnectionPanel;
