/**
 * S9RemoteWorkPanel — Remote Work Agreements (Ley 10/2021)
 */

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Home, FileText, CheckCircle, AlertTriangle, Users, Laptop } from 'lucide-react';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import { useS9RemoteWork } from '@/hooks/erp/hr/useS9RemoteWork';
import { MANDATORY_POINT_LABELS } from '@/engines/erp/hr/s9ComplianceEngine';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Vigente', className: 'bg-green-100 text-green-700 border-green-200' },
  suspended: { label: 'Suspendido', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  terminated: { label: 'Finalizado', className: 'bg-red-100 text-red-700 border-red-200' },
};

export const S9RemoteWorkPanel = memo(function S9RemoteWorkPanel({ companyId }: Props) {
  const { agreements, stats, isLoading } = useS9RemoteWork(companyId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? agreements.find(a => a.id === selectedId) : null;

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
          Acuerdos de Teletrabajo
          <S9ReadinessBadge readiness="internal_ready" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Acuerdo individual de trabajo a distancia — Ley 10/2021 (13 puntos obligatorios)
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total acuerdos</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vigentes</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-xs text-muted-foreground">% remoto medio</p>
                <p className="text-xl font-bold">{stats.avgRemotePercent.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Incompletos</p>
                <p className="text-xl font-bold">{stats.incompleteAgreements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agreements list */}
      {agreements.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Acuerdos Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agreements.map(a => {
                const sc = statusConfig[a.status] || statusConfig.draft;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between py-2.5 px-3 rounded-md border bg-card cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedId === a.id && 'ring-1 ring-primary',
                    )}
                    onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium font-mono">{a.employee_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.start_date} → {a.end_date || 'Indefinido'} · {a.remote_percentage}% remoto
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={a.validation.completionPercent} className="w-16 h-1.5" />
                      <span className="text-[10px] text-muted-foreground w-8">{a.validation.completionPercent.toFixed(0)}%</span>
                      <Badge variant="outline" className={cn('text-[10px]', sc.className)}>{sc.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Home className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay acuerdos de teletrabajo registrados</p>
          </CardContent>
        </Card>
      )}

      {/* Detail: 13 mandatory points */}
      {selected && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              13 Puntos Obligatorios — Ley 10/2021 Art. 7
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(MANDATORY_POINT_LABELS).map(([key, label]) => {
                const filled = selected.validation.completedPoints.includes(key as any);
                return (
                  <div key={key} className="flex items-center gap-2 py-1">
                    {filled
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                    }
                    <span className={cn("text-sm", !filled && "text-muted-foreground")}>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Completitud</span>
                <span className="font-medium">{selected.validation.completionPercent.toFixed(0)}%</span>
              </div>
              <Progress value={selected.validation.completionPercent} className="h-2 mt-1" />
            </div>

            {/* Equipment inventory */}
            {Array.isArray(selected.equipment_inventory) && selected.equipment_inventory.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Inventario de equipos</p>
                <div className="space-y-1">
                  {selected.equipment_inventory.map((item, i) => (
                    <div key={i} className="text-sm flex items-center gap-1.5">
                      <Laptop className="h-3 w-3 text-muted-foreground" />
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <FileText className="h-3 w-3" />
        Base legal: Ley 10/2021 de trabajo a distancia · Art. 7 (contenido obligatorio)
      </div>
    </div>
  );
});

export default S9RemoteWorkPanel;
