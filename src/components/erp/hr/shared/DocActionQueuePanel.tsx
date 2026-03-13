/**
 * DocActionQueuePanel — Panel compacto de acciones documentales pendientes
 * V2-ES.4 Paso 2: Lista enriquecida con title, description, severity
 * Soporta modo persistido (desde BD) y modo computed (sin persistir).
 */
import { useState, useMemo } from 'react';
import { ClipboardList, Check, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DocActionBadge } from './DocActionBadge';
import {
  useHRDocActionQueue,
  enrichAction,
  computePendingActions,
  type DocAction,
  type DocActionType,
  type DocActionPriority,
  type PendingAction,
  type EnrichedDocAction,
} from '@/hooks/erp/hr/useHRDocActionQueue';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';

interface Props {
  /** Mode A: fetch persisted actions from DB */
  employeeId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Mode B: compute actions from docs already loaded (no extra fetch) */
  docs?: EmployeeDocument[];
  expectedTypes?: string[];
  /** Max items before expand */
  maxItems?: number;
  className?: string;
}

export function DocActionQueuePanel({
  employeeId,
  relatedEntityType,
  relatedEntityId,
  docs,
  expectedTypes,
  maxItems = 5,
  className,
}: Props) {
  const hasPersistedMode = !!(employeeId || (relatedEntityType && relatedEntityId));
  const { actions: persistedActions, summary, isLoading, resolveAction, isResolving } = useHRDocActionQueue(
    hasPersistedMode ? { employeeId, relatedEntityType, relatedEntityId } : {}
  );

  // Compute actions from docs if provided (no persistence, pure derived)
  const computedActions = useMemo<EnrichedDocAction[]>(() => {
    if (!docs || docs.length === 0) return [];
    const pending = computePendingActions(docs, expectedTypes);
    return pending.map(enrichAction);
  }, [docs, expectedTypes]);

  // Merge: persisted first, then computed (deduplicated)
  const enrichedPersisted = useMemo<EnrichedDocAction[]>(() => {
    return persistedActions.map(pa => enrichAction({
      document_id: pa.document_id,
      document_type_code: pa.document_type_code,
      action_type: pa.action_type as DocActionType,
      priority: pa.priority as DocActionPriority,
      source: pa.source as any,
      due_date: pa.due_date,
      reason: (pa.context as any)?.reason ?? '',
    }));
  }, [persistedActions]);

  // Use computed if no persisted mode, otherwise use persisted
  const allActions = hasPersistedMode ? enrichedPersisted : computedActions;

  const [expanded, setExpanded] = useState(false);

  if (isLoading && hasPersistedMode) return null;
  if (allActions.length === 0) return null;

  const shown = expanded ? allActions : allActions.slice(0, maxItems);
  const hasMore = allActions.length > maxItems;

  const criticalCount = allActions.filter(a => a.severity === 'critical').length;
  const highCount = allActions.filter(a => a.severity === 'high').length;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        <span>Acciones pendientes</span>
        <span className="text-[10px] font-medium bg-muted px-1.5 rounded-full">
          {allActions.length}
        </span>
        {criticalCount > 0 && (
          <span className="text-[10px] font-medium text-red-600 bg-red-500/10 px-1.5 rounded-full">
            {criticalCount} crítica{criticalCount !== 1 ? 's' : ''}
          </span>
        )}
        {highCount > 0 && criticalCount === 0 && (
          <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 rounded-full">
            {highCount} alta{highCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {shown.map((enriched, idx) => {
          const action = enriched.raw;
          const persistedMatch = persistedActions.find(
            pa => pa.document_id === action.document_id && pa.action_type === action.action_type
          );

          return (
            <TooltipProvider key={`${action.document_id ?? 'null'}-${action.action_type}-${idx}`} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 p-1.5 rounded border bg-card text-xs group">
                    <DocActionBadge
                      actionType={action.action_type}
                      priority={action.priority}
                      severity={enriched.severity}
                      showSeverityDot
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[10px] font-medium text-foreground">
                        {action.document_type_code}
                      </p>
                      <p className="truncate text-[9px] text-muted-foreground">
                        {enriched.description}
                      </p>
                    </div>
                    {action.due_date && (
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {new Date(action.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    {persistedMatch && (
                      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          title="Resolver"
                          disabled={isResolving}
                          onClick={() => resolveAction({ actionId: persistedMatch.id, resolution: 'done' })}
                        >
                          <Check className="h-3 w-3 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          title="Descartar"
                          disabled={isResolving}
                          onClick={() => resolveAction({ actionId: persistedMatch.id, resolution: 'dismissed' })}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[220px]">
                  <p className="font-medium">{enriched.title}</p>
                  <p className="text-muted-foreground mt-0.5">{enriched.description}</p>
                  {action.source !== 'system' && (
                    <p className="text-muted-foreground mt-0.5">Origen: {action.source}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Mostrar menos' : `+${allActions.length - maxItems} más`}
        </button>
      )}
    </div>
  );
}
