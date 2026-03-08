/**
 * HREnterpriseDashboard - Command Center enterprise RRHH
 */
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Network, Calendar, Shield, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { useHREnterprise } from '@/hooks/admin/hr/useHREnterprise';

interface Props { companyId: string; }

export function HREnterpriseDashboard({ companyId }: Props) {
  const { stats, fetchStats, criticalEvents, fetchCriticalEvents, loading } = useHREnterprise();

  useEffect(() => {
    fetchStats(companyId);
    fetchCriticalEvents(companyId, false);
  }, [companyId]);

  const kpis = [
    { label: 'Entidades Legales', value: stats?.legal_entities ?? '-', icon: Building2, color: 'text-blue-500' },
    { label: 'Centros de Trabajo', value: stats?.work_centers ?? '-', icon: MapPin, color: 'text-green-500' },
    { label: 'Unidades Org.', value: stats?.org_units ?? '-', icon: Network, color: 'text-purple-500' },
    { label: 'Empleados Activos', value: stats?.active_employees ?? '-', icon: Activity, color: 'text-cyan-500' },
    { label: 'Eventos Auditoría', value: stats?.total_audit_events ?? '-', icon: Shield, color: 'text-amber-500' },
    { label: 'Alertas Críticas', value: stats?.unresolved_critical ?? '-', icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">HR Enterprise Command Center</h2>
          <p className="text-sm text-muted-foreground">Vista consolidada de estructura organizativa, permisos y auditoría</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(companyId); fetchCriticalEvents(companyId, false); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${kpi.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Critical Events */}
      {criticalEvents.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eventos Críticos Sin Resolver ({criticalEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {event.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estructura Organizativa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gestiona entidades legales, centros de trabajo, unidades organizativas y calendarios laborales desde las pestañas del menú Enterprise.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Badge variant="outline">Multi-entidad</Badge>
              <Badge variant="outline">Multi-jurisdicción</Badge>
              <Badge variant="outline">Multi-centro</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seguridad y Auditoría</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sistema RBAC+ABAC con permisos por campo, audit trail inmutable y eventos críticos con notificación obligatoria.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Badge variant="outline">RBAC+ABAC</Badge>
              <Badge variant="outline">Permisos por campo</Badge>
              <Badge variant="outline">Audit trail</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
