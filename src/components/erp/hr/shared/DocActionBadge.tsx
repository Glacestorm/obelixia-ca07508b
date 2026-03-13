/**
 * DocActionBadge — Badge compacto de acción pendiente
 * V2-ES.4 Paso 2: Muestra tipo de acción + prioridad + severity
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, RefreshCw, Link2, Eye, AlertOctagon, FilePlus, CheckSquare, PenLine } from 'lucide-react';
import type { DocActionType, DocActionPriority, DocActionSeverity } from '@/hooks/erp/hr/useHRDocActionQueue';

const ACTION_LABELS: Record<DocActionType, string> = {
  generate: 'Generar',
  submit: 'Enviar',
  review: 'Revisar',
  correct: 'Corregir',
  close: 'Cerrar',
  renew: 'Renovar',
  reconcile: 'Conciliar',
  escalate: 'Escalar',
};

const ACTION_ICONS: Record<DocActionType, typeof Send> = {
  generate: FilePlus,
  submit: Send,
  review: Eye,
  correct: PenLine,
  close: CheckSquare,
  renew: RefreshCw,
  reconcile: Link2,
  escalate: AlertOctagon,
};

const PRIORITY_STYLES: Record<DocActionPriority, string> = {
  critical: 'bg-red-500/10 text-red-700 border-red-500/30',
  high: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const SEVERITY_DOT: Record<DocActionSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground',
  info: 'bg-sky-400',
};

interface Props {
  actionType: DocActionType;
  priority: DocActionPriority;
  severity?: DocActionSeverity;
  label?: string;
  showSeverityDot?: boolean;
  className?: string;
}

export function DocActionBadge({ actionType, priority, severity, label, showSeverityDot = false, className }: Props) {
  const Icon = ACTION_ICONS[actionType] ?? Eye;
  const displayLabel = label ?? ACTION_LABELS[actionType] ?? actionType;

  return (
    <Badge
      variant="outline"
      className={cn(
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium,
        'text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
      title={displayLabel}
    >
      {showSeverityDot && severity && (
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[severity])} />
      )}
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[120px]">{displayLabel}</span>
    </Badge>
  );
}
