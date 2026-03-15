/**
 * EmployeeTimeSection — "Mi tiempo" del Portal del Empleado
 * V2-ES.9.6: Fichaje, histórico semanal/mensual, vacaciones, permisos
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
  ArrowRight, Loader2, Coffee, LogIn, LogOut, TrendingUp,
  Send, Palmtree,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

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

type ViewTab = 'today' | 'week' | 'month';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completo', color: 'text-emerald-600' },
  active: { label: 'En curso', color: 'text-blue-600' },
  corrected: { label: 'Corregido', color: 'text-amber-600' },
  anomaly: { label: 'Anomalía', color: 'text-rose-600' },
  approved: { label: 'Aprobado', color: 'text-emerald-600' },
  pending_review: { label: 'En revisión', color: 'text-amber-600' },
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
  const [activeTab, setActiveTab] = useState<ViewTab>('today');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch last 60 days of entries
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

  // Today's entries
  const todayEntries = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return entries.filter(e => e.clock_date === today);
  }, [entries]);

  // Week entries
  const weekEntries = useMemo(() => {
    const now = new Date();
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return entries.filter(e => e.clock_date >= start && e.clock_date <= end);
  }, [entries]);

  // Month entries
  const monthEntries = useMemo(() => {
    return entries.filter(e => e.clock_date.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  // Summary stats
  const weekStats = useMemo(() => {
    let totalWorked = 0, totalOvertime = 0, totalBreak = 0, anomalies = 0;
    for (const e of weekEntries) {
      totalWorked += e.worked_hours || 0;
      totalOvertime += e.overtime_hours || 0;
      totalBreak += (e.break_minutes || 0) / 60;
      if (e.anomaly_type) anomalies++;
    }
    return { totalWorked, totalOvertime, totalBreak, anomalies, days: new Set(weekEntries.map(e => e.clock_date)).size };
  }, [weekEntries]);

  const monthStats = useMemo(() => {
    let totalWorked = 0, totalOvertime = 0, anomalies = 0;
    for (const e of monthEntries) {
      totalWorked += e.worked_hours || 0;
      totalOvertime += e.overtime_hours || 0;
      if (e.anomaly_type) anomalies++;
    }
    return { totalWorked, totalOvertime, anomalies, days: new Set(monthEntries.map(e => e.clock_date)).size };
  }, [monthEntries]);

  // Available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const e of entries) {
      months.add(e.clock_date.substring(0, 7));
    }
    if (months.size === 0) months.add(format(new Date(), 'yyyy-MM'));
    return Array.from(months).sort().reverse();
  }, [entries]);

  const activeEntries = activeTab === 'today' ? todayEntries : activeTab === 'week' ? weekEntries : monthEntries;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Mi Tiempo
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro de jornada, fichajes y tiempo trabajado
        </p>
      </div>

      {/* Today summary */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Timer}
            label="Hoy"
            value={todayEntries.length > 0 ? fmtHours(todayEntries.reduce((s, e) => s + (e.worked_hours || 0), 0)) : 'Sin fichaje'}
            color="text-primary"
          />
          <StatCard
            icon={Calendar}
            label="Semana"
            value={fmtHours(weekStats.totalWorked)}
            sub={`${weekStats.days} días`}
            color="text-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Horas extra (sem.)"
            value={weekStats.totalOvertime > 0 ? fmtHours(weekStats.totalOvertime) : '—'}
            color="text-amber-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Anomalías"
            value={String(weekStats.anomalies)}
            color={weekStats.anomalies > 0 ? 'text-rose-500' : 'text-emerald-500'}
            highlight={weekStats.anomalies > 0}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ViewTab)}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="today" className="text-xs">Hoy</TabsTrigger>
            <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
            <TabsTrigger value="month" className="text-xs">Mes</TabsTrigger>
          </TabsList>

          {activeTab === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
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

        {/* Month summary bar */}
        {activeTab === 'month' && !loading && monthEntries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <MiniStat label="Días fichados" value={String(monthStats.days)} />
            <MiniStat label="Horas trabajadas" value={fmtHours(monthStats.totalWorked)} />
            <MiniStat label="Horas extra" value={monthStats.totalOvertime > 0 ? fmtHours(monthStats.totalOvertime) : '—'} />
          </div>
        )}

        {/* Entry list */}
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeEntries.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'today' ? 'No hay fichajes registrados hoy' : 'Sin registros en este periodo'}
                </p>
                {activeTab === 'today' && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Los fichajes aparecerán aquí cuando se registren
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeEntries.map(entry => {
                const st = STATUS_STYLE[entry.status] || { label: entry.status, color: 'text-muted-foreground' };
                const dateLabel = isToday(parseISO(entry.clock_date))
                  ? 'Hoy'
                  : format(parseISO(entry.clock_date), 'EEE dd MMM', { locale: es });

                return (
                  <Card key={entry.id} className={entry.anomaly_type ? 'border-rose-500/30 bg-rose-500/5' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium capitalize">{dateLabel}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <LogIn className="h-3 w-3 text-emerald-500" />
                                {fmtTime(entry.clock_in)}
                              </span>
                              <span className="flex items-center gap-1">
                                <LogOut className="h-3 w-3 text-rose-500" />
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
                            <span className="text-sm font-semibold">{fmtHours(entry.worked_hours)}</span>
                          )}
                          {entry.overtime_hours != null && entry.overtime_hours > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                              +{fmtHours(entry.overtime_hours)}
                            </Badge>
                          )}
                          {entry.anomaly_type && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              {entry.anomaly_type === 'missing_clock_out' ? 'Sin salida' : entry.anomaly_type}
                            </Badge>
                          )}
                          <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 pl-12">{entry.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Actions */}
      <Separator />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2 flex-1 min-w-[140px] h-11" onClick={() => onNavigate('leave')}>
          <Palmtree className="h-4 w-4" /> Vacaciones y permisos
        </Button>
        <Button variant="outline" className="gap-2 flex-1 min-w-[140px] h-11" onClick={() => onNavigate('requests')}>
          <Send className="h-4 w-4" /> Reportar incidencia
        </Button>
      </div>

      {/* Jornada legal note */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        Registro conforme al Art. 34.9 del Estatuto de los Trabajadores (RD-ley 8/2019)
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, highlight }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-rose-500/30 bg-rose-500/5' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg border bg-muted/30 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
