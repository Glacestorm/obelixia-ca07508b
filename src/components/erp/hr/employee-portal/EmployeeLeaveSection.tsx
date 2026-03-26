import { logger } from "@/lib/logger";
/**
 * EmployeeLeaveSection — "Mis vacaciones y permisos" del Portal del Empleado
 * V2-ES.9.10: Consulta de saldos, historial y solicitudes de ausencias
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Palmtree, Plus, Calendar, Clock, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, Loader2, Send, CalendarDays,
  TrendingUp, CalendarCheck, Ban, ArrowRight, Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format, formatDistanceToNow, differenceInCalendarDays, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

interface LeaveBalance {
  id: string;
  leave_type_code: string;
  year: number;
  entitled_days: number;
  used_days: number | null;
  pending_days: number | null;
  carried_over_days: number | null;
  adjustment_days: number | null;
}

interface LeaveRequest {
  id: string;
  leave_type_code: string | null;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string | null;
  workflow_status: string | null;
  notes: string | null;
  rejection_reason: string | null;
  is_half_day: boolean | null;
  half_day_period: string | null;
  created_at: string | null;
  approved_at: string | null;
  requested_at: string | null;
  dept_comments: string | null;
  hr_comments: string | null;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  is_paid: boolean | null;
  category: string | null;
  days_entitled: number | null;
  requires_documentation: boolean | null;
  is_calendar_days: boolean | null;
  description: string | null;
}

type TabFilter = 'all' | 'pending' | 'approved' | 'past';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  draft: { label: 'Borrador', icon: Clock, variant: 'outline', className: 'text-muted-foreground' },
  pending_dept: { label: 'Pte. departamento', icon: Clock, variant: 'secondary', className: 'text-amber-600' },
  pending_hr: { label: 'Pte. RRHH', icon: Clock, variant: 'secondary', className: 'text-blue-600' },
  approved: { label: 'Aprobada', icon: CheckCircle2, variant: 'default', className: 'text-emerald-600' },
  rejected: { label: 'Rechazada', icon: XCircle, variant: 'destructive', className: 'text-rose-600' },
  cancelled: { label: 'Cancelada', icon: Ban, variant: 'outline', className: 'text-muted-foreground' },
};

function getEffectiveStatus(r: LeaveRequest): string {
  return r.workflow_status || r.status || 'draft';
}

export function EmployeeLeaveSection({ employee, onNavigate }: Props) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const currentYear = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, reqRes, typRes] = await Promise.all([
        supabase
          .from('erp_hr_leave_balances')
          .select('id, leave_type_code, year, entitled_days, used_days, pending_days, carried_over_days, adjustment_days')
          .eq('employee_id', employee.id)
          .eq('year', currentYear),
        supabase
          .from('erp_hr_leave_requests')
          .select('id, leave_type_code, start_date, end_date, days_requested, status, workflow_status, notes, rejection_reason, is_half_day, half_day_period, created_at, approved_at, requested_at, dept_comments, hr_comments')
          .eq('employee_id', employee.id)
          .order('start_date', { ascending: false })
          .limit(100),
        supabase
          .from('erp_hr_leave_types')
          .select('id, code, name, is_paid, category, days_entitled, requires_documentation, is_calendar_days, description')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (balRes.error) console.error('[LeaveSection] balances error:', balRes.error);
      if (reqRes.error) console.error('[LeaveSection] requests error:', reqRes.error);
      if (typRes.error) console.error('[LeaveSection] types error:', typRes.error);

      setBalances((balRes.data || []) as LeaveBalance[]);
      setRequests((reqRes.data || []) as LeaveRequest[]);
      setLeaveTypes((typRes.data || []) as LeaveType[]);
    } catch (err) {
      console.error('[EmployeeLeaveSection] fetch error:', err);
      toast.error('Error al cargar datos de vacaciones');
    } finally {
      setLoading(false);
    }
  }, [employee.id, currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build type name map
  const typeNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of leaveTypes) map[t.code] = t.name;
    return map;
  }, [leaveTypes]);

  // KPIs from balances
  const kpis = useMemo(() => {
    const vacBalance = balances.find(b => b.leave_type_code === 'vacaciones') || balances[0];
    const totalEntitled = vacBalance ? vacBalance.entitled_days + (vacBalance.carried_over_days || 0) + (vacBalance.adjustment_days || 0) : 0;
    const totalUsed = vacBalance?.used_days || 0;
    const totalPending = vacBalance?.pending_days || 0;
    const available = totalEntitled - totalUsed - totalPending;

    const pendingRequests = requests.filter(r => ['draft', 'pending_dept', 'pending_hr'].includes(getEffectiveStatus(r))).length;
    const nextAbsence = requests
      .filter(r => getEffectiveStatus(r) === 'approved' && isAfter(parseISO(r.start_date), new Date()))
      .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())[0];

    return { totalEntitled, totalUsed, totalPending, available, pendingRequests, nextAbsence, hasBalance: !!vacBalance };
  }, [balances, requests]);

  // Filtered requests
  const filtered = useMemo(() => {
    const now = new Date();
    switch (tabFilter) {
      case 'pending':
        return requests.filter(r => ['draft', 'pending_dept', 'pending_hr'].includes(getEffectiveStatus(r)));
      case 'approved':
        return requests.filter(r => getEffectiveStatus(r) === 'approved');
      case 'past':
        return requests.filter(r => ['rejected', 'cancelled'].includes(getEffectiveStatus(r)) || (getEffectiveStatus(r) === 'approved' && isBefore(parseISO(r.end_date), now)));
      default:
        return requests;
    }
  }, [requests, tabFilter]);

  // Calendar absences for current month
  const calendarAbsences = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const approvedInMonth = requests.filter(r => {
      const st = getEffectiveStatus(r);
      if (st !== 'approved' && st !== 'pending_dept' && st !== 'pending_hr') return false;
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return !(isAfter(start, monthEnd) || isBefore(end, monthStart));
    });
    return approvedInMonth;
  }, [requests, calendarMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-primary" /> Mis Vacaciones y Permisos
            </h2>
            <p className="text-sm text-muted-foreground">
              Consulta tu saldo, solicita ausencias y sigue el estado de tus solicitudes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => onNavigate('requests')}>
              <Send className="h-4 w-4" /> Mis solicitudes
            </Button>
            <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4" /> Nueva solicitud
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Días disponibles"
            value={kpis.hasBalance ? kpis.available : '—'}
            icon={CalendarCheck}
            description={kpis.hasBalance ? `de ${kpis.totalEntitled} totales` : 'Sin saldo configurado'}
            variant="primary"
          />
          <KpiCard
            label="Días consumidos"
            value={kpis.hasBalance ? kpis.totalUsed : '—'}
            icon={Calendar}
            description={kpis.hasBalance ? `${Math.round((kpis.totalUsed / Math.max(kpis.totalEntitled, 1)) * 100)}% del total` : ''}
          />
          <KpiCard
            label="Pendientes aprobación"
            value={kpis.pendingRequests}
            icon={Clock}
            description={`${kpis.totalPending} días en trámite`}
            variant={kpis.pendingRequests > 0 ? 'warning' : undefined}
          />
          <KpiCard
            label="Próxima ausencia"
            value={kpis.nextAbsence ? format(parseISO(kpis.nextAbsence.start_date), 'dd MMM', { locale: es }) : '—'}
            icon={CalendarDays}
            description={kpis.nextAbsence ? `${kpis.nextAbsence.days_requested} día(s)` : 'Sin ausencias próximas'}
          />
        </div>

        {/* No balance configured — info banner */}
        {!kpis.hasBalance && (
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground/60 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">No hay saldos de vacaciones configurados todavía</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tu departamento de RRHH aún no ha registrado los saldos para {currentYear}. 
                  Si crees que esto es un error, puedes crear una solicitud para consultarlo.
                </p>
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => onNavigate('requests')}>
                  <Send className="h-3.5 w-3.5" /> Consultar a RRHH
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance progress (if balance exists) */}
        {kpis.hasBalance && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Uso de vacaciones {currentYear}</p>
                <span className="text-xs text-muted-foreground">
                  {kpis.totalUsed} de {kpis.totalEntitled} días
                </span>
              </div>
              <Progress
                value={Math.min((kpis.totalUsed / Math.max(kpis.totalEntitled, 1)) * 100, 100)}
                className="h-2.5"
              />
              <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Consumidos: {kpis.totalUsed}
                </span>
                {kpis.totalPending > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Pendientes: {kpis.totalPending}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted inline-block" /> Disponibles: {kpis.available}
                </span>
              </div>
              {/* Other balances */}
              {balances.length > 1 && (
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  {balances.filter(b => b.leave_type_code !== 'vacaciones').map(b => {
                    const total = b.entitled_days + (b.carried_over_days || 0) + (b.adjustment_days || 0);
                    const used = b.used_days || 0;
                    return (
                      <div key={b.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{typeNames[b.leave_type_code] || b.leave_type_code}</span>
                        <span className="font-medium">{used} / {total} días</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mini calendar view */}
        <MiniCalendar
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          absences={calendarAbsences}
          typeNames={typeNames}
        />

        {/* Requests list */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-3">
            <h3 className="text-sm font-semibold">Historial de solicitudes</h3>
            <Tabs value={tabFilter} onValueChange={v => setTabFilter(v as TabFilter)}>
              <TabsList className="h-auto">
                <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">Pendientes</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">Aprobadas</TabsTrigger>
                <TabsTrigger value="past" className="text-xs">Historial</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Palmtree className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {requests.length === 0 ? 'Aún no tienes solicitudes de ausencias' : 'Sin resultados para este filtro'}
                </p>
                {requests.length === 0 && (
                  <Button variant="outline" className="mt-3 gap-2" onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-4 w-4" /> Solicitar vacaciones
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const st = STATUS_CONFIG[getEffectiveStatus(r)] || STATUS_CONFIG.draft;
                const StIcon = st.icon;
                const typeName = typeNames[r.leave_type_code || ''] || r.leave_type_code || 'Ausencia';

                return (
                  <Card
                    key={r.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedRequest(r)}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <StIcon className={`h-4 w-4 ${st.className}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{typeName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>{format(parseISO(r.start_date), 'dd MMM', { locale: es })}</span>
                              <span>→</span>
                              <span>{format(parseISO(r.end_date), 'dd MMM yyyy', { locale: es })}</span>
                              <span>·</span>
                              <span>{r.days_requested} día{r.days_requested !== 1 ? 's' : ''}</span>
                              {r.is_half_day && <Badge variant="outline" className="text-[9px] h-4 px-1">½ día</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={open => !open && setSelectedRequest(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRequest && (
            <LeaveRequestDetail
              request={selectedRequest}
              typeNames={typeNames}
              onCancel={async () => {
                try {
                  const { error } = await supabase
                    .from('erp_hr_leave_requests')
                    .update({ status: 'cancelled', workflow_status: 'cancelled' as any })
                    .eq('id', selectedRequest.id);
                  if (error) throw error;
                  toast.success('Solicitud cancelada');
                  setSelectedRequest(null);
                  fetchData();
                } catch {
                  toast.error('No se pudo cancelar la solicitud');
                }
              }}
              onNavigateRequests={() => { setSelectedRequest(null); onNavigate('requests'); }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* New leave request dialog */}
      <NewLeaveRequestDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        employee={employee}
        leaveTypes={leaveTypes}
        onCreated={() => { setShowNewDialog(false); fetchData(); }}
      />
    </>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, description, variant }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  variant?: 'primary' | 'warning';
}) {
  return (
    <Card className={variant === 'primary' ? 'border-primary/30 bg-primary/5' : variant === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${variant === 'primary' ? 'text-primary' : variant === 'warning' ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </div>
        <p className="text-xl font-bold">{value}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Mini Calendar ──────────────────────────────────────────────────────

function MiniCalendar({ month, onMonthChange, absences, typeNames }: {
  month: Date;
  onMonthChange: (d: Date) => void;
  absences: LeaveRequest[];
  typeNames: Record<string, string>;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to Monday
  const startDow = monthStart.getDay(); // 0=Sun
  const padStart = startDow === 0 ? 6 : startDow - 1;

  const isAbsenceDay = (day: Date) => {
    return absences.some(r => {
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  const getAbsenceStatus = (day: Date) => {
    const match = absences.find(r => {
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return isWithinInterval(day, { start, end });
    });
    return match ? getEffectiveStatus(match) : null;
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Calendario de ausencias
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1))}
            >
              ‹
            </Button>
            <span className="text-xs font-medium min-w-[100px] text-center capitalize">
              {format(month, 'MMMM yyyy', { locale: es })}
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1))}
            >
              ›
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-7 gap-px text-center">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: padStart }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map(day => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const absence = isAbsenceDay(day);
            const absStatus = getAbsenceStatus(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={`
                  text-xs py-1.5 rounded-md transition-colors
                  ${isToday ? 'ring-1 ring-primary font-bold' : ''}
                  ${isWeekend ? 'text-muted-foreground/50' : ''}
                  ${absence && absStatus === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : ''}
                  ${absence && (absStatus === 'pending_dept' || absStatus === 'pending_hr') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                `}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Aprobada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Pendiente
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Leave Request Detail ───────────────────────────────────────────────

function LeaveRequestDetail({ request, typeNames, onCancel, onNavigateRequests }: {
  request: LeaveRequest;
  typeNames: Record<string, string>;
  onCancel: () => void;
  onNavigateRequests: () => void;
}) {
  const status = getEffectiveStatus(request);
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const StIcon = st.icon;
  const typeName = typeNames[request.leave_type_code || ''] || request.leave_type_code || 'Ausencia';
  const canCancel = ['draft', 'pending_dept', 'pending_hr'].includes(status);

  // Timeline
  const timeline = useMemo(() => {
    const events: Array<{ label: string; date: string; icon: React.ElementType; className: string }> = [];
    if (request.created_at) {
      events.push({ label: 'Solicitud creada', date: request.created_at, icon: Send, className: 'text-blue-500' });
    }
    if (request.requested_at && request.requested_at !== request.created_at) {
      events.push({ label: 'Enviada para aprobación', date: request.requested_at, icon: Send, className: 'text-blue-500' });
    }
    if (request.approved_at) {
      events.push({ label: 'Aprobada', date: request.approved_at, icon: CheckCircle2, className: 'text-emerald-500' });
    }
    if (status === 'rejected' && request.created_at) {
      events.push({ label: 'Rechazada', date: request.created_at, icon: XCircle, className: 'text-rose-500' });
    }
    if (status === 'cancelled' && request.created_at) {
      events.push({ label: 'Cancelada', date: request.created_at, icon: Ban, className: 'text-muted-foreground' });
    }
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [request, status]);

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <SheetTitle className="text-base">{typeName}</SheetTitle>
          <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
        </div>
      </SheetHeader>

      {/* Dates & days */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-[11px] text-muted-foreground">Fecha inicio</p>
          <p className="text-sm font-medium">{format(parseISO(request.start_date), 'dd MMM yyyy', { locale: es })}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-[11px] text-muted-foreground">Fecha fin</p>
          <p className="text-sm font-medium">{format(parseISO(request.end_date), 'dd MMM yyyy', { locale: es })}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Días solicitados: </span>
          <span className="font-semibold">{request.days_requested}</span>
        </div>
        {request.is_half_day && (
          <Badge variant="outline" className="text-xs">½ jornada ({request.half_day_period === 'morning' ? 'mañana' : 'tarde'})</Badge>
        )}
      </div>

      {/* Notes */}
      {request.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones</p>
          <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
        </div>
      )}

      {/* Rejection reason */}
      {request.rejection_reason && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-destructive mb-1">Motivo del rechazo</p>
            <p className="text-sm whitespace-pre-wrap">{request.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Approver comments */}
      {(request.dept_comments || request.hr_comments) && (
        <div>
          <p className="text-xs font-semibold mb-2">Comentarios</p>
          {request.dept_comments && (
            <div className="p-2 rounded bg-muted/30 text-sm mb-1">
              <span className="text-xs text-muted-foreground">Departamento: </span>{request.dept_comments}
            </div>
          )}
          {request.hr_comments && (
            <div className="p-2 rounded bg-muted/30 text-sm">
              <span className="text-xs text-muted-foreground">RRHH: </span>{request.hr_comments}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3">Historial</p>
          <div className="space-y-3 relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
            {timeline.map((ev, i) => {
              const Icon = ev.icon;
              return (
                <div key={i} className="flex items-start gap-3 relative">
                  <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center shrink-0 z-10">
                    <Icon className={`h-3 w-3 ${ev.className}`} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-medium">{ev.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(ev.date), "dd MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-2">
        {canCancel && (
          <Button variant="destructive" size="sm" className="gap-2" onClick={onCancel}>
            <Ban className="h-4 w-4" /> Cancelar solicitud
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={onNavigateRequests}>
          <Send className="h-4 w-4" /> Ver en Mis solicitudes
        </Button>
      </div>
    </div>
  );
}

// ─── New Leave Request Dialog ───────────────────────────────────────────

function NewLeaveRequestDialog({ open, onClose, employee, leaveTypes, onCreated }: {
  open: boolean;
  onClose: () => void;
  employee: EmployeeProfile;
  leaveTypes: LeaveType[];
  onCreated: () => void;
}) {
  const [typeCode, setTypeCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedType = leaveTypes.find(t => t.code === typeCode);
  const daysRequested = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
    return isHalfDay ? 0.5 : Math.max(diff, 0);
  }, [startDate, endDate, isHalfDay]);

  const handleSubmit = async () => {
    if (!typeCode || !startDate || !endDate) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    if (daysRequested <= 0) {
      toast.error('Las fechas no son válidas');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('erp_hr_leave_requests')
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          leave_type_code: typeCode,
          start_date: startDate,
          end_date: endDate,
          days_requested: daysRequested,
          notes: notes.trim() || null,
          is_half_day: isHalfDay,
          status: 'pending_dept',
          workflow_status: 'pending_dept' as any,
        });

      if (error) throw error;
      toast.success('Solicitud de ausencia enviada');
      setTypeCode('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setIsHalfDay(false);
      onCreated();
    } catch (err) {
      console.error('[NewLeaveRequest] error:', err);
      toast.error('Error al crear la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-primary" />
            Nueva solicitud de ausencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Tipo de ausencia *</Label>
            <Select value={typeCode} onValueChange={setTypeCode}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona tipo..." />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(t => (
                  <SelectItem key={t.code} value={t.code}>
                    <div className="flex items-center gap-2">
                      <span>{t.name}</span>
                      {t.is_paid === false && <Badge variant="outline" className="text-[9px] h-4">No retribuido</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType?.description && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" /> {selectedType.description}
              </p>
            )}
            {selectedType?.requires_documentation && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Requiere documentación justificativa
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha inicio *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Fecha fin *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>

          {daysRequested > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
              <span className="text-muted-foreground">Días solicitados:</span>
              <span className="font-semibold">{daysRequested}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="halfDay"
              checked={isHalfDay}
              onChange={e => setIsHalfDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="halfDay" className="text-xs cursor-pointer">Media jornada</Label>
          </div>

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Motivo o comentarios adicionales..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
