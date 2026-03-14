/**
 * EmployeePortalHome — Dashboard ejecutivo "Mi espacio"
 * V2-ES.9.2: Widgets con datos reales del empleado autenticado
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, FolderOpen, Send, Clock, Palmtree, User,
  CalendarDays, Building2, Briefcase, AlertTriangle,
  CheckCircle2, ArrowRight, TrendingUp, Euro,
  Activity, Bell, Loader2,
} from 'lucide-react';
import { EmployeeProfile, DashboardSummary } from '@/hooks/erp/hr/useEmployeePortal';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  dashboard: DashboardSummary | null;
  isDashboardLoading: boolean;
  onNavigate: (section: PortalSection) => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  temporary_leave: { label: 'Baja temporal', variant: 'secondary' },
  excedencia: { label: 'Excedencia', variant: 'secondary' },
  onboarding: { label: 'En incorporación', variant: 'outline' },
  terminated: { label: 'Finalizado', variant: 'destructive' },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  alta: 'Alta', baja: 'Baja', modificacion_contrato: 'Mod. contrato',
  cambio_datos: 'Cambio datos', vacaciones: 'Vacaciones', permiso: 'Permiso',
  it: 'IT/Baja médica', excedencia: 'Excedencia', modificacion_salarial: 'Mod. salarial',
};

const REQUEST_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Enviada', color: 'text-blue-600' },
  in_progress: { label: 'En curso', color: 'text-amber-600' },
  pending_info: { label: 'Info pendiente', color: 'text-orange-600' },
  approved: { label: 'Aprobada', color: 'text-emerald-600' },
};

export function EmployeePortalHome({ employee, dashboard, isDashboardLoading, onNavigate }: Props) {
  const statusInfo = STATUS_LABELS[employee.status || ''] || { label: employee.status || 'Desconocido', variant: 'outline' as const };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-2xl font-bold">
              ¡Hola, {employee.first_name}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bienvenido a tu espacio personal de RRHH
            </p>
          </div>
          <Badge variant={statusInfo.variant} className="self-start text-xs">
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Send}
          label="Solicitudes activas"
          value={dashboard?.pendingRequests ?? '—'}
          color="text-blue-500"
          onClick={() => onNavigate('requests')}
          loading={isDashboardLoading}
        />
        <KPICard
          icon={AlertTriangle}
          label="Docs con alertas"
          value={dashboard?.documentsWithAlerts ?? '—'}
          color="text-amber-500"
          onClick={() => onNavigate('documents')}
          loading={isDashboardLoading}
          highlight={!!dashboard && dashboard.documentsWithAlerts > 0}
        />
        <KPICard
          icon={FolderOpen}
          label="Total documentos"
          value={dashboard?.totalDocuments ?? '—'}
          color="text-emerald-500"
          onClick={() => onNavigate('documents')}
          loading={isDashboardLoading}
        />
        <KPICard
          icon={Activity}
          label="Incidencias"
          value={dashboard?.activeIncidents ?? '—'}
          color="text-rose-500"
          loading={isDashboardLoading}
        />
      </div>

      {/* Two-column layout: left info + right actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Employee info + recent payslips */}
        <div className="lg:col-span-2 space-y-4">
          {/* Employee summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Mi situación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Briefcase} label="Puesto" value={employee.job_title || 'No definido'} />
                <InfoRow icon={Building2} label="Categoría" value={employee.category || 'No definida'} />
                <InfoRow icon={CalendarDays} label="Antigüedad desde" value={format(new Date(employee.hire_date), 'dd MMM yyyy', { locale: es })} />
                <InfoRow icon={FileText} label="Tipo contrato" value={employee.contract_type || 'No definido'} />
                {employee.employee_number && (
                  <InfoRow icon={User} label="Nº empleado" value={employee.employee_number} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent payslips */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Euro className="h-4 w-4 text-primary" /> Últimas nóminas
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onNavigate('payslips')}>
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isDashboardLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !dashboard?.recentPayslips?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay nóminas registradas</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recentPayslips.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(p.created_at), 'MMM yyyy', { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.status === 'approved' ? 'Aprobada' : p.status === 'draft' ? 'Borrador' : p.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{p.net_salary.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                        <p className="text-xs text-muted-foreground">Bruto: {p.gross_salary.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active requests */}
          {dashboard && dashboard.activeRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" /> Solicitudes en curso
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onNavigate('requests')}>
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.activeRequests.slice(0, 5).map(r => {
                    const st = REQUEST_STATUS_STYLE[r.status] || { label: r.status, color: 'text-muted-foreground' };
                    return (
                      <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">
                            {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: quick actions + recent activity */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <QuickAction icon={FileText} label="Ver nóminas" onClick={() => onNavigate('payslips')} />
              <QuickAction icon={FolderOpen} label="Mis documentos" onClick={() => onNavigate('documents')} />
              <QuickAction icon={Send} label="Nueva solicitud" onClick={() => onNavigate('requests')} />
              <QuickAction icon={Palmtree} label="Vacaciones" onClick={() => onNavigate('leave')} />
              <QuickAction icon={Clock} label="Fichaje" onClick={() => onNavigate('time')} />
              <QuickAction icon={User} label="Mi perfil" onClick={() => onNavigate('profile')} />
            </CardContent>
          </Card>

          {/* Last activity */}
          {dashboard && dashboard.lastActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Últimos movimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.lastActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{a.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.date), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color, onClick, loading, highlight }: {
  icon: React.ElementType; label: string; value: number | string;
  color: string; onClick?: () => void; loading?: boolean; highlight?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer hover:border-primary/30 transition-colors ${highlight ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground truncate">{label}</span>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2.5 h-9 text-sm font-normal hover:bg-primary/5"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/50" />
    </Button>
  );
}
