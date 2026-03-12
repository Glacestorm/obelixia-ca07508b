/**
 * TasksDashboard — KPIs, charts, alert cards
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, TrendingUp, Timer } from 'lucide-react';
import type { HRTask, TaskStats } from '@/hooks/erp/hr/useHRTasksEngine';

interface Props {
  stats: TaskStats | null;
  tasks: HRTask[];
  loading: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  admin_request: 'Solicitudes',
  payroll: 'Nómina',
  mobility: 'Movilidad',
  document: 'Documentos',
  compliance: 'Compliance',
  integration: 'Integraciones',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  general: 'General',
};

export function TasksDashboard({ stats, tasks, loading }: Props) {
  const overdueTasks = tasks.filter(t => t.sla_breached && t.status !== 'completed' && t.status !== 'cancelled');

  const kpis = [
    { label: 'Pendientes', value: stats?.pending ?? 0, icon: ClipboardList, color: 'text-amber-600 bg-amber-500/15' },
    { label: 'En Curso', value: stats?.in_progress ?? 0, icon: Clock, color: 'text-blue-600 bg-blue-500/15' },
    { label: 'Completadas Hoy', value: stats?.completed_today ?? 0, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-500/15' },
    { label: 'Vencidas SLA', value: stats?.overdue ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-500/15' },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="py-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-violet-500" /> Cumplimiento SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold">{stats?.sla_compliance ?? 100}%</span>
              <Badge variant={
                (stats?.sla_compliance ?? 100) >= 90 ? 'default' :
                (stats?.sla_compliance ?? 100) >= 70 ? 'secondary' : 'destructive'
              }>
                {(stats?.sla_compliance ?? 100) >= 90 ? 'Óptimo' :
                 (stats?.sla_compliance ?? 100) >= 70 ? 'En riesgo' : 'Crítico'}
              </Badge>
            </div>
            <Progress value={stats?.sla_compliance ?? 100} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(stats?.by_category || {}).slice(0, 5).map(([cat, count]) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{CATEGORY_LABELS[cat] || cat}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              {!stats?.by_category || Object.keys(stats.by_category).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin datos</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue alerts */}
      {overdueTasks.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Tareas con SLA vencido ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex justify-between items-center text-sm p-2 rounded bg-background">
                  <span className="font-medium">{t.title}</span>
                  <Badge variant="destructive">{t.priority}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
