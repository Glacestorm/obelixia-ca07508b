/**
 * RegistrationDeadlineAlert — Inline deadline signal for RegistrationDataPanel
 * V2-ES.5 Paso 2: Shows pre/post-alta deadline status with urgency
 *
 * Pure component — receives computed deadlines by prop.
 */
import { AlertTriangle, AlertOctagon, Clock, CheckCircle2, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegistrationDeadlineSummary, RegistrationDeadline } from './registrationDeadlineEngine';

interface Props {
  summary: RegistrationDeadlineSummary;
  className?: string;
}

const URGENCY_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  overdue:  { icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-500/5 border-red-500/20' },
  blocked:  { icon: Ban, color: 'text-red-700', bg: 'bg-red-500/5 border-red-500/20' },
  urgent:   { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-500/5 border-amber-500/20' },
  upcoming: { icon: Clock, color: 'text-blue-700', bg: 'bg-blue-500/5 border-blue-500/20' },
  ok:       { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-500/5 border-emerald-500/20' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-500/5 border-emerald-500/20' },
};

function DeadlineRow({ deadline }: { deadline: RegistrationDeadline }) {
  const config = URGENCY_CONFIG[deadline.urgency] || URGENCY_CONFIG.ok;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-1.5 text-[10px]', config.color)}>
      <Icon className="h-3 w-3 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{deadline.label}</span>
        <span className="text-muted-foreground ml-1">— {deadline.message}</span>
      </div>
    </div>
  );
}

export function RegistrationDeadlineAlert({ summary, className }: Props) {
  if (summary.deadlines.length === 0 && summary.worstUrgency === 'resolved') return null;
  if (summary.deadlines.length === 0 && !summary.summaryLabel) return null;

  const worst = URGENCY_CONFIG[summary.worstUrgency] || URGENCY_CONFIG.ok;

  // If no registration_date yet (blocked with no deadlines)
  if (summary.deadlines.length === 0 && summary.worstUrgency === 'blocked') {
    return (
      <div className={cn('rounded-lg border px-3 py-2 space-y-1', worst.bg, className)}>
        <div className={cn('flex items-center gap-1.5 text-[10px] font-medium', worst.color)}>
          <Ban className="h-3 w-3 shrink-0" />
          <span>Sin fecha de alta — no se pueden calcular plazos</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border px-3 py-2 space-y-1', worst.bg, className)}>
      <div className={cn('flex items-center gap-1.5 text-[10px] font-medium', worst.color)}>
        <Clock className="h-3 w-3 shrink-0" />
        <span>Plazos operativos de alta</span>
      </div>
      {summary.deadlines.map((d, i) => (
        <DeadlineRow key={i} deadline={d} />
      ))}
    </div>
  );
}
