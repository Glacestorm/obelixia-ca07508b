/**
 * DocActionQueuePanel — Panel compacto de acciones documentales pendientes
 * V2-ES.4 Paso 2.4: Lista de acciones en sidebar de solicitudes/tareas
 * Recibe datos del hook cacheado. Sin fetch propio de documentos.
 */
import { useState } from 'react';
import { ClipboardList, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocActionBadge } from './DocActionBadge';
import { useHRDocActionQueue, type DocAction, type DocActionType, type DocActionPriority } from '@/hooks/erp/hr/useHRDocActionQueue';

interface Props {
  employeeId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  maxItems?: number;
  className?: string;
}

export function DocActionQueuePanel({
  employeeId,
  relatedEntityType,
  relatedEntityId,
  maxItems = 5,
  className,
}: Props) {
  const { actions, summary, isLoading, resolveAction, isResolving } = useHRDocActionQueue({
    employeeId,
    relatedEntityType,
    relatedEntityId,
  });

  const [expanded, setExpanded] = useState(false);

  if (isLoading || actions.length === 0) return null;

  const shown = expanded ? actions : actions.slice(0, maxItems);
  const hasMore = actions.length > maxItems;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        <span>Acciones pendientes</span>
        {summary.critical > 0 && (
          <span className="text-[10px] font-medium text-red-600 bg-red-500/10 px-1.5 rounded-full">
            {summary.critical} críticas
          </span>
        )}
        {summary.high > 0 && summary.critical === 0 && (
          <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 rounded-full">
            {summary.high} altas
          </span>
        )}
      </div>

      <div className="space-y-1">
        {shown.map(action => (
          <div
            key={action.id}
            className="flex items-center gap-1.5 p-1.5 rounded border bg-card text-xs"
          >
            <DocActionBadge
              actionType={action.action_type as DocActionType}
              priority={action.priority as DocActionPriority}
              label={`${action.document_type_code}`}
            />
            <span className="flex-1 truncate text-[10px] text-muted-foreground">
              {(action.context as any)?.reason ?? ''}
            </span>
            <div className="flex gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                title="Resolver"
                disabled={isResolving}
                onClick={() => resolveAction({ actionId: action.id, resolution: 'done' })}
              >
                <Check className="h-3 w-3 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                title="Descartar"
                disabled={isResolving}
                onClick={() => resolveAction({ actionId: action.id, resolution: 'dismissed' })}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Mostrar menos' : `+${actions.length - maxItems} más`}
        </button>
      )}
    </div>
  );
}
