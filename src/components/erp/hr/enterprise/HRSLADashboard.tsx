/**
 * HRSLADashboard - Panel de SLAs y cuellos de botella
 */
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Timer } from 'lucide-react';
import { useHRWorkflowEngine } from '@/hooks/admin/hr/useHRWorkflowEngine';

interface Props { companyId: string; }

export function HRSLADashboard({ companyId }: Props) {
  const { slaItems, fetchSLAStatus, stats, fetchStats, loading } = useHRWorkflowEngine();

  useEffect(() => { fetchSLAStatus(companyId); fetchStats(companyId); }, [companyId]);

  const overdue = slaItems.filter(s => s.is_overdue);
  const nearBreach = slaItems.filter(s => s.is_near_breach && !s.is_overdue);
  const onTrack = slaItems.filter(s => !s.is_overdue && !s.is_near_breach);

  const slaComplianceRate = stats && stats.total > 0
    ? Math.round(((stats.total - (stats.sla_breached || 0)) / stats.total) * 100)
    : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Timer className="h-5 w-5" /> SLA Dashboard</h3>
          <p className="text-sm text-muted-foreground">Monitorización de tiempos de respuesta y cuellos de botella</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchSLAStatus(companyId); fetchStats(companyId); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{slaComplianceRate}%</p>
            <p className="text-xs text-muted-foreground">Cumplimiento SLA</p>
            <Progress value={slaComplianceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card className={overdue.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${overdue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className="text-3xl font-bold text-destructive">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">SLA vencidos</p>
          </CardContent>
        </Card>
        <Card className={nearBreach.length > 0 ? 'border-amber-500/50' : ''}>
          <CardContent className="p-4 text-center">
            <Clock className={`h-6 w-6 mx-auto mb-2 ${nearBreach.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <p className="text-3xl font-bold text-amber-500">{nearBreach.length}</p>
            <p className="text-xs text-muted-foreground">Próximos a vencer (&lt;4h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold text-green-500">{onTrack.length}</p>
            <p className="text-xs text-muted-foreground">En plazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue items */}
      {overdue.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> SLA Vencidos — Acción requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {overdue.map((sla) => (
                  <div key={sla.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">{sla.erp_hr_workflow_instances?.entity_summary || 'Sin resumen'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>📍 {sla.erp_hr_workflow_steps?.name}</span>
                        <span>👤 {sla.assigned_role}</span>
                        <Badge variant="destructive" className="text-xs">{Math.abs(sla.hours_remaining || 0)}h de retraso</Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(sla.due_at).toLocaleString('es-ES')}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Near breach */}
      {nearBreach.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" /> Próximos a vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nearBreach.map((sla) => (
                <div key={sla.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5">
                  <div>
                    <p className="text-sm font-medium">{sla.erp_hr_workflow_instances?.entity_summary || 'Sin resumen'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>📍 {sla.erp_hr_workflow_steps?.name}</span>
                      <Badge variant="outline" className="text-xs text-amber-600">{sla.hours_remaining}h restantes</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All on track */}
      {slaItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
            <p>No hay SLAs pendientes. Todos los workflows están completados o sin instancias activas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
