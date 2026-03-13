/**
 * DocActionBadge — Badge compacto de acción pendiente
 * V2-ES.4 Paso 2.4: Muestra tipo de acción + prioridad
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, RefreshCw, Link2, Eye, AlertOctagon } from 'lucide-react';
import type { DocActionType, DocActionPriority } from '@/hooks/erp/hr/useHRDocActionQueue';

const ACTION_LABELS: Record<DocActionType, string> = {
  submit: 'Enviar',
  renew: 'Renovar',
  reconcile: 'Conciliar',
  review: 'Revisar',
  escalate: 'Escalar',
};

const ACTION_ICONS: Record<DocActionType, typeof Send> = {
  submit: Send,
  renew: RefreshCw,
  reconcile: Link2,
  review: Eye,
  escalate: AlertOctagon,
};

const PRIORITY_STYLES: Record<DocActionPriority, string> = {
  critical: 'bg-red-500/10 text-red-700 border-red-500/30',
  high: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  actionType: DocActionType;
  priority: DocActionPriority;
  label?: string;
  className?: string;
}

export function DocActionBadge({ actionType, priority, label, className }: Props) {
  const Icon = ACTION_ICONS[actionType];
  const displayLabel = label ?? ACTION_LABELS[actionType];

  return (
    <Badge
      variant="outline"
      className={cn(
        PRIORITY_STYLES[priority],
        'text-[10px] px-1.5 py-0 gap-1 font-normal',
        className,
      )}
      title={displayLabel}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[100px]">{displayLabel}</span>
    </Badge>
  );
}
