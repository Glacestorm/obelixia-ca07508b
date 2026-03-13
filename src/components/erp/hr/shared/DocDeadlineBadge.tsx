/**
 * DocDeadlineBadge — Indicador de plazo/urgencia documental
 * V2-ES.4 Paso 1 (parte 3): Badge compacto de vencimiento legal
 * Componente puro — recibe DueDateResult o datos mínimos por prop.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CheckCircle2, HelpCircle, AlertOctagon } from 'lucide-react';
import type { DueUrgency, DueSeverity } from '@/hooks/erp/hr/useHRDocumentDueRules';

const URGENCY_STYLES: Record<DueUrgency, string> = {
  overdue: 'bg-red-500/10 text-red-700 border-red-500/30',
  urgent: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  upcoming: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  ok: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const URGENCY_ICONS: Record<DueUrgency, typeof Clock> = {
  overdue: AlertOctagon,
  urgent: AlertTriangle,
  upcoming: Clock,
  ok: CheckCircle2,
  unknown: HelpCircle,
};

const SEVERITY_DOT: Record<DueSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground',
};

interface DocDeadlineBadgeProps {
  urgency: DueUrgency;
  severity: DueSeverity;
  label: string;
  showSeverityDot?: boolean;
  className?: string;
}

export function DocDeadlineBadge({
  urgency,
  severity,
  label,
  showSeverityDot = false,
  className,
}: DocDeadlineBadgeProps) {
  const Icon = URGENCY_ICONS[urgency];

  return (
    <Badge
      variant="outline"
      className={cn(
        URGENCY_STYLES[urgency],
        'text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
      title={label}
    >
      {showSeverityDot && (
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[severity])} />
      )}
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[120px]">{label}</span>
    </Badge>
  );
}
