/**
 * EmployeeTimeSection — "Mi tiempo" del Portal del Empleado
 * RRHH-PORTAL.2 Block D: Rediseño con fichaje protagonista
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Clock, Calendar, Timer, AlertTriangle, CheckCircle2,
  Loader2, Coffee, LogIn, LogOut, TrendingUp,
  Send, Palmtree, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';
import { TimeClockWidget } from './TimeClockWidget';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

interface ClockEntry {
  id: string;
  clock_date: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_method: string;
  clock_out_method: string | null;
  worked_hours: number | null;
  overtime_hours: number | null;
  break_minutes: number | null;
  status: string;
  anomaly_type: string | null;
  anomaly_notes: string | null;
  notes: string | null;
}

type ViewTab = 'week' | 'month';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completo', color: 'text-success' },
  active: { label: 'En curso', color: 'text-info' },
  corrected: { label: 'Corregido', color: 'text-warning' },
  anomaly: { label: 'Anomalía', color: 'text-destructive' },
  approved: { label: 'Aprobado', color: 'text-success' },
  pending_review: { label: 'En revisión', color: 'text-warning' },
};

const fmtHours = (h: number | null) => {
  if (h === null || h === undefined) return '—';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
};

const fmtTime = (iso: string) => {
  try { return format(new Date(iso), 'HH:mm'); } catch { return '—'; }
};

export function EmployeeTimeSection({ employee, onNavigate }: Props) {
  const [entries, setEntries] = useState<ClockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('week');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data, error } = await supabase
        .from('erp_hr_time_clock')
        .select('id, clock_date, clock_in, clock_out, clock_in_method, clock_out_method, worked_hours, overtime_hours, break_minutes, status, anomaly_type, anomaly_notes, notes')
        .eq('employee_id', employee.id)
        .gte('clock_date', format(since, 'yyyy-MM-dd'))
        .order('clock_date', { ascending: false })
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setEntries((data || []) as ClockEntry[]);
    } catch (err) {
      console.error('[EmployeeTimeSection] fetch error:', err);
      toast.error('Error al cargar fichajes');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Filter entries by today
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Week entries (exclude today — shown in widget)
  const weekEntries = useMemo(() => {
    const now = new Date();
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return entries.filter(e => e.clock_date >= start && e.clock_date <= end && e.clock_date !== todayStr);
  }, [entries, todayStr]);

  const monthEntries = useMemo(() => {
    return entries.filter(e => e.clock_date.startsWith(selectedMonth) && e.clock_date !== todayStr);
  }, [entries, selectedMonth, todayStr]);

  // Summary stats
  const weekStats = useMemo(() => {
    const allWeek = entries.filter(e => {
      const now = new Date();
      const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      return e.clock_date >= start && e.clock_date <= end;
    });
    let totalWorked = 0, totalOvertime = 0, anomalies = 0;
    for (const e of allWeek) {
      totalWorked += e.worked_hours || 0;
      totalOvertime += e.overtime_hours || 0;
      if (e.anomaly_type) anomalies++;
    }
    return { totalWorked, totalOvertime, anomalies, days: new Set(allWeek.map(e => e.clock_date)).size };
  }, [entries]);

  const monthStats = useMemo(() => {
    const allMonth = entries.filter(e => e.clock_date.startsWith(selectedMonth));
    let totalWorked = 0, totalOvertime = 0, anomalies = 0;
    for (const e of allMonth) {
      totalWorked += e.worked_hours || 0;
      totalOvertime += e.overtime_hours || 0;
      if (e.anomaly_type) anomalies++;
    }
    return { totalWorked, totalOvertime, anomalies, days: new Set(allMonth.map(e => e.clock_date)).size };
  }, [entries, selectedMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const e of entries) months.add(e.clock_date.substring(0, 7));
    if (months.size === 0) months.add(format(new Date(), 'yyyy-MM'));
    return Array.from(months).sort().reverse();
  }, [entries]);

  const activeEntries = activeTab === 'week' ? weekEntries : monthEntries;
  const stats = activeTab === 'week' ? weekStats : monthStats;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">Mi Tiempo</h2>
        <p className="text-sm text-muted-foreground">
          Fichaje y control de jornada
        </p>
      </div>

      {/* ═══ FICHAJE WIDGET (full mode) ═══ */}
      <TimeClockWidget employeeId={employee.id} companyId={employee.company_id} compact={false} />

      {/* ═══ RESUMEN SEMANAL ═══ */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Semana" value={fmtHours(weekStats.totalWorked)} sub={`${weekStats.days} días`} />
          <MiniStat label="Horas extra" value={weekStats.totalOvertime > 0 ? fmtHours(weekStats.totalOvertime) : '—'} />
          <MiniStat
            label="Anomalías"
            value={String(weekStats.anomalies)}
            warning={weekStats.anomalies > 0}
          />
        </div>
      )}

      {/* ═══ HISTORIAL ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Historial</h3>
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ViewTab)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs h-7 px-3">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-xs h-7 px-3">Mes</TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'month' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>
                      {format(new Date(m + '-01'), 'MMMM yyyy', { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Month summary */}
        {activeTab === 'month' && !loading && (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Días fichados" value={String(monthStats.days)} />
            <MiniStat label="Horas" value={fmtHours(monthStats.totalWorked)} />
            <MiniStat label="Extra" value={monthStats.totalOvertime > 0 ? fmtHours(monthStats.totalOvertime) : '—'} />
          </div>
        )}

        {/* Entry list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeEntries.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">Sin registros en este periodo</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeEntries.map(entry => {
              const st = STATUS_STYLE[entry.status] || { label: entry.status, color: 'text-muted-foreground' };
              const dateLabel = format(parseISO(entry.clock_date), 'EEE dd MMM', { locale: es });

              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-xl border ${entry.anomaly_type ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card/80'} transition-colors`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{dateLabel}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <LogIn className="h-3 w-3 text-success" />
                            {fmtTime(entry.clock_in)}
                          </span>
                          <span className="flex items-center gap-1">
                            <LogOut className="h-3 w-3 text-destructive" />
                            {entry.clock_out ? fmtTime(entry.clock_out) : '—'}
                          </span>
                          {entry.break_minutes != null && entry.break_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Coffee className="h-3 w-3" />
                              {entry.break_minutes}min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.worked_hours != null && (
                        <span className="text-sm font-bold tabular-nums">{fmtHours(entry.worked_hours)}</span>
                      )}
                      {entry.anomaly_type && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {entry.anomaly_type === 'missing_clock_out' ? 'Sin salida' : entry.anomaly_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ ACCIONES ═══ */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2 flex-1 min-w-[140px] h-11 rounded-xl" onClick={() => onNavigate('leave')}>
          <Palmtree className="h-4 w-4" /> Vacaciones y permisos
        </Button>
        <Button variant="outline" className="gap-2 flex-1 min-w-[140px] h-11 rounded-xl" onClick={() => onNavigate('requests')}>
          <Send className="h-4 w-4" /> Reportar incidencia
        </Button>
      </div>

      {/* Legal note */}
      <p className="text-[10px] text-muted-foreground/50 text-center">
        Registro conforme al Art. 34.9 del Estatuto de los Trabajadores (RD-ley 8/2019)
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function MiniStat({ label, value, sub, warning }: { label: string; value: string; sub?: string; warning?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${warning ? 'border-destructive/20 bg-destructive/5' : 'border-border/50 bg-card/80'} text-center`}>
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm font-bold ${warning ? 'text-destructive' : ''}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
