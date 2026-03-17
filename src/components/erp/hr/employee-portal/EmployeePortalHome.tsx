/**
 * EmployeePortalHome — Modern action-oriented dashboard
 * RRHH-PORTAL.2 Block B: Hero + fichaje + quick actions + status cards
 * V2-RRHH-P3B: Added leave balance card + notifications quick action
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, FolderOpen, Send, Clock, Palmtree, User,
  CalendarDays, Building2, Briefcase, AlertTriangle,
  ArrowRight, Euro, Loader2, Smartphone, ChevronRight, Bell,
} from 'lucide-react';
import { EmployeeProfile, DashboardSummary } from '@/hooks/erp/hr/useEmployeePortal';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { type PortalSection } from './EmployeePortalNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { TimeClockWidget } from './TimeClockWidget';
import { PWAInstallGuide } from './PWAInstallGuide';

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
  submitted: { label: 'Enviada', color: 'text-info' },
  in_progress: { label: 'En curso', color: 'text-warning' },
  pending_info: { label: 'Info pendiente', color: 'text-warning' },
  approved: { label: 'Aprobada', color: 'text-success' },
};

export function EmployeePortalHome({ employee, dashboard, isDashboardLoading, onNavigate }: Props) {
  const isMobile = useIsMobile();
  const statusInfo = STATUS_LABELS[employee.status || ''] || { label: employee.status || 'Desconocido', variant: 'outline' as const };

  // V2-RRHH-P3B: Fetch leave balance for current year
  const [leaveBalance, setLeaveBalance] = useState<{ remaining: number; total: number } | null>(null);
  useEffect(() => {
    const year = new Date().getFullYear();
    supabase
      .from('erp_hr_leave_balances')
      .select('entitled_days, used_days, pending_days, adjustment_days, carried_over_days')
      .eq('employee_id', employee.id)
      .eq('year', year)
      .eq('leave_type_code', 'vacaciones')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const total = (data.entitled_days ?? 0) + (data.carried_over_days ?? 0) + (data.adjustment_days ?? 0);
          const used = (data.used_days ?? 0) + (data.pending_days ?? 0);
          setLeaveBalance({ remaining: Math.max(0, total - used), total });
        }
      });
  }, [employee.id]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 7) return 'Buenas noches';
    if (h < 13) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <div className="space-y-5">
      {/* ═══ HERO: Saludo + Estado del día ═══ */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-primary/6 to-secondary/8 border border-primary/10 p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {employee.first_name}
            </h1>
          </div>
          <Badge variant={statusInfo.variant} className="text-[10px] mt-1 shrink-0">
            {statusInfo.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          {employee.job_title && <> · {employee.job_title}</>}
        </p>
      </div>

      {/* ═══ FICHAJE WIDGET (protagonista) ═══ */}
      <TimeClockWidget
        employeeId={employee.id}
        companyId={employee.company_id}
        compact={isMobile}
      />

      {/* ═══ QUICK ACTIONS GRID ═══ */}
      <div className="grid grid-cols-4 gap-2">
        <QuickActionPill icon={FileText} label="Nóminas" onClick={() => onNavigate('payslips')} />
        <QuickActionPill icon={FolderOpen} label="Docs" onClick={() => onNavigate('documents')} />
        <QuickActionPill icon={Palmtree} label="Vacaciones" onClick={() => onNavigate('leave')} />
        <QuickActionPill icon={Send} label="Solicitud" onClick={() => onNavigate('requests')} />
      </div>

      {/* ═══ STATUS CARDS ROW — V2-RRHH-P3B: added leave balance ═══ */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard
          icon={Send}
          label="Solicitudes"
          value={dashboard?.pendingRequests ?? 0}
          suffix="activas"
          loading={isDashboardLoading}
          onClick={() => onNavigate('requests')}
          accent={!!dashboard && dashboard.pendingRequests > 0}
        />
        <StatusCard
          icon={Palmtree}
          label="Vacaciones"
          value={leaveBalance?.remaining ?? 0}
          suffix={`de ${leaveBalance?.total ?? '—'} días`}
          loading={!leaveBalance && isDashboardLoading}
          onClick={() => onNavigate('leave')}
        />
        <StatusCard
          icon={AlertTriangle}
          label="Alertas"
          value={dashboard?.documentsWithAlerts ?? 0}
          suffix="pendientes"
          loading={isDashboardLoading}
          onClick={() => onNavigate('notifications')}
          warning={!!dashboard && dashboard.documentsWithAlerts > 0}
        />
      </div>

      {/* ═══ ÚLTIMAS NÓMINAS ═══ */}
      <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary" /> Últimas nóminas
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" onClick={() => onNavigate('payslips')}>
              Ver todas <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isDashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !dashboard?.recentPayslips?.length ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No hay nóminas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dashboard.recentPayslips.slice(0, isMobile ? 3 : 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onNavigate('payslips')}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
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
                  <p className="text-sm font-bold tabular-nums">{p.net_salary.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ SOLICITUDES EN CURSO ═══ */}
      {dashboard && dashboard.activeRequests.length > 0 && (
        <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Solicitudes en curso
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" onClick={() => onNavigate('requests')}>
                Ver todas <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {dashboard.activeRequests.slice(0, isMobile ? 3 : 5).map(r => {
                const st = REQUEST_STATUS_STYLE[r.status] || { label: r.status, color: 'text-muted-foreground' };
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">
                        {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${st.color} border-current/20`}>{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ MI SITUACIÓN (collapsable info) ═══ */}
      {!isMobile && (
        <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Mi situación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={Briefcase} label="Puesto" value={employee.job_title || 'No definido'} />
              <InfoRow icon={Building2} label="Categoría" value={employee.category || 'No definida'} />
              <InfoRow icon={CalendarDays} label="Antigüedad" value={employee.hire_date ? format(new Date(employee.hire_date), 'dd MMM yyyy', { locale: es }) : 'No registrada'} />
              <InfoRow icon={FileText} label="Contrato" value={employee.contract_type || 'No definido'} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PWA INSTALL BANNER ═══ */}
      <PWAInstallGuide variant="banner" />

      {/* ═══ NO DATA FALLBACK ═══ */}
      {!isDashboardLoading && !dashboard && (
        <Card className="border-dashed border-0 shadow-sm">
          <CardContent className="py-8 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No se pudieron cargar los datos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Usa las acciones rápidas para navegar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuickActionPill({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/30 active:scale-95 transition-all cursor-pointer"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-[11px] font-medium text-foreground/80">{label}</span>
    </button>
  );
}

function StatusCard({ icon: Icon, label, value, suffix, loading, onClick, accent, warning }: {
  icon: React.ElementType; label: string; value: number; suffix: string;
  loading?: boolean; onClick?: () => void; accent?: boolean; warning?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer border-0 shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${warning ? 'bg-warning/5 ring-1 ring-warning/20' : accent ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-card/80'}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${warning ? 'bg-warning/10' : 'bg-primary/10'}`}>
            <Icon className={`h-4 w-4 ${warning ? 'text-warning' : 'text-primary'}`} />
          </div>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold">{value}</p>
            <span className="text-xs text-muted-foreground">{suffix}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg">
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
