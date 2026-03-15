/**
 * TimeClockWidget — Prominent clock-in/out widget for the Employee Portal
 * RRHH-PORTAL.2 Block C: Fichaje protagonista
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogIn, LogOut, Coffee, Play, Pause, Clock, Timer,
  CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

type JornadaState = 'not_started' | 'active' | 'paused' | 'completed';

interface TodayEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  worked_hours: number | null;
  break_minutes: number | null;
  status: string;
  anomaly_type: string | null;
}

interface Props {
  employeeId: string;
  /** Compact mode for embedding in Home */
  compact?: boolean;
  className?: string;
}

const fmtTime = (iso: string) => {
  try { return format(new Date(iso), 'HH:mm'); } catch { return '—'; }
};

export function TimeClockWidget({ employeeId, compact = false, className }: Props) {
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('erp_hr_time_clock')
        .select('id, clock_in, clock_out, worked_hours, break_minutes, status, anomaly_type')
        .eq('employee_id', employeeId)
        .eq('clock_date', today)
        .order('clock_in', { ascending: true });

      if (error) throw error;
      setTodayEntries((data || []) as TodayEntry[]);
    } catch (err) {
      console.error('[TimeClockWidget] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // Derive state
  const jornadaState = useMemo<JornadaState>(() => {
    if (todayEntries.length === 0) return 'not_started';
    const last = todayEntries[todayEntries.length - 1];
    if (last.clock_out) return 'completed';
    if (last.status === 'paused') return 'paused';
    return 'active';
  }, [todayEntries]);

  const totalWorkedToday = useMemo(() => {
    let total = 0;
    for (const e of todayEntries) {
      if (e.worked_hours) total += e.worked_hours;
      else if (!e.clock_out) {
        // Calculate live duration
        const start = new Date(e.clock_in).getTime();
        const elapsed = (now.getTime() - start) / 3600000;
        total += Math.max(0, elapsed);
      }
    }
    return total;
  }, [todayEntries, now]);

  const fmtHours = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}h ${mins > 0 ? `${String(mins).padStart(2, '0')}m` : '00m'}`;
  };

  const lastEntry = todayEntries[todayEntries.length - 1];
  const hasAnomalies = todayEntries.some(e => e.anomaly_type);

  // Clock actions
  const handleClockIn = useCallback(async () => {
    setClocking(true);
    try {
      const nowISO = new Date().toISOString();
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('erp_hr_time_clock')
        .insert({
          employee_id: employeeId,
          clock_date: today,
          clock_in: nowISO,
          clock_in_method: 'web_portal',
          status: 'active',
        } as any);
      if (error) throw error;
      toast.success('Entrada registrada correctamente');
      await fetchToday();
    } catch (err) {
      console.error('[TimeClockWidget] clock in error:', err);
      toast.error('Error al registrar entrada');
    } finally {
      setClocking(false);
    }
  }, [employeeId, fetchToday]);

  const handleClockOut = useCallback(async () => {
    if (!lastEntry) return;
    setClocking(true);
    try {
      const nowISO = new Date().toISOString();
      const clockIn = new Date(lastEntry.clock_in).getTime();
      const elapsed = (new Date().getTime() - clockIn) / 3600000;
      const breakMins = lastEntry.break_minutes || 0;
      const worked = Math.max(0, elapsed - breakMins / 60);

      const { error } = await supabase
        .from('erp_hr_time_clock')
        .update({
          clock_out: nowISO,
          clock_out_method: 'web_portal',
          worked_hours: Math.round(worked * 100) / 100,
          status: 'completed',
        } as any)
        .eq('id', lastEntry.id);
      if (error) throw error;
      toast.success('Salida registrada correctamente');
      await fetchToday();
    } catch (err) {
      console.error('[TimeClockWidget] clock out error:', err);
      toast.error('Error al registrar salida');
    } finally {
      setClocking(false);
    }
  }, [lastEntry, fetchToday]);

  if (loading) {
    return (
      <div className={cn('rounded-2xl border bg-card p-6 flex items-center justify-center', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stateConfig = {
    not_started: {
      label: 'Jornada no iniciada',
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      dotColor: 'bg-muted-foreground',
    },
    active: {
      label: 'Jornada en curso',
      color: 'text-success',
      bg: 'bg-success/10',
      dotColor: 'bg-success',
    },
    paused: {
      label: 'En pausa',
      color: 'text-warning',
      bg: 'bg-warning/10',
      dotColor: 'bg-warning',
    },
    completed: {
      label: 'Jornada finalizada',
      color: 'text-primary',
      bg: 'bg-primary/10',
      dotColor: 'bg-primary',
    },
  };

  const state = stateConfig[jornadaState];

  if (compact) {
    return (
      <div className={cn('rounded-2xl border bg-card overflow-hidden', className)}>
        <div className="p-4 space-y-3">
          {/* Status + time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('h-2.5 w-2.5 rounded-full animate-pulse', state.dotColor)} />
              <span className={cn('text-xs font-medium', state.color)}>{state.label}</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums tracking-tight">{fmtHours(totalWorkedToday)}</p>
            </div>
          </div>

          {/* Clock times */}
          {todayEntries.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <LogIn className="h-3 w-3 text-success" />
                {fmtTime(todayEntries[0].clock_in)}
              </span>
              {lastEntry?.clock_out && (
                <span className="flex items-center gap-1">
                  <LogOut className="h-3 w-3 text-destructive" />
                  {fmtTime(lastEntry.clock_out)}
                </span>
              )}
            </div>
          )}

          {/* Action button */}
          {jornadaState === 'not_started' && (
            <Button
              onClick={handleClockIn}
              disabled={clocking}
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl bg-success hover:bg-success/90 text-success-foreground"
            >
              {clocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Fichar entrada
            </Button>
          )}
          {jornadaState === 'active' && (
            <Button
              onClick={handleClockOut}
              disabled={clocking}
              variant="destructive"
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
            >
              {clocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              Fichar salida
            </Button>
          )}
          {jornadaState === 'completed' && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Jornada completada
            </div>
          )}
        </div>

        {/* Anomaly alert */}
        {hasAnomalies && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2 text-xs text-destructive font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Anomalía detectada en el registro
          </div>
        )}
      </div>
    );
  }

  // Full mode (for Mi Tiempo section)
  return (
    <div className={cn('rounded-2xl border bg-card overflow-hidden', className)}>
      {/* Header gradient */}
      <div className="relative p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('h-3 w-3 rounded-full', state.dotColor, jornadaState === 'active' && 'animate-pulse')} />
              <span className={cn('text-sm font-semibold', state.color)}>{state.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums tracking-tight">{fmtHours(totalWorkedToday)}</p>
            <p className="text-xs text-muted-foreground">horas hoy</p>
          </div>
        </div>

        {/* Clock times detail */}
        {todayEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <LogIn className="h-4 w-4 text-success" />
              Entrada: <strong className="text-foreground">{fmtTime(todayEntries[0].clock_in)}</strong>
            </span>
            {lastEntry?.clock_out && (
              <span className="flex items-center gap-1.5">
                <LogOut className="h-4 w-4 text-destructive" />
                Salida: <strong className="text-foreground">{fmtTime(lastEntry.clock_out)}</strong>
              </span>
            )}
            {lastEntry?.break_minutes != null && lastEntry.break_minutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Coffee className="h-4 w-4 text-warning" />
                Pausa: <strong className="text-foreground">{lastEntry.break_minutes}min</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 space-y-3">
        {jornadaState === 'not_started' && (
          <Button
            onClick={handleClockIn}
            disabled={clocking}
            size="lg"
            className="w-full h-14 text-lg font-bold gap-3 rounded-xl bg-success hover:bg-success/90 text-success-foreground shadow-lg"
          >
            {clocking ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6" />}
            Fichar entrada
          </Button>
        )}
        {jornadaState === 'active' && (
          <Button
            onClick={handleClockOut}
            disabled={clocking}
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg font-bold gap-3 rounded-xl shadow-lg"
          >
            {clocking ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" />}
            Fichar salida
          </Button>
        )}
        {jornadaState === 'completed' && (
          <div className="flex items-center justify-center gap-2 py-4 text-base text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Jornada completada — ¡Buen trabajo!
          </div>
        )}

        {/* Today entries summary */}
        {todayEntries.length > 1 && (
          <p className="text-xs text-center text-muted-foreground">
            {todayEntries.length} registros hoy
          </p>
        )}
      </div>

      {/* Anomaly alert */}
      {hasAnomalies && (
        <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2 text-sm text-destructive font-medium">
          <AlertTriangle className="h-4 w-4" />
          Anomalía detectada — revisa tus fichajes
        </div>
      )}
    </div>
  );
}
