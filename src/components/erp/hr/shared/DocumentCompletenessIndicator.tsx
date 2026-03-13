/**
 * DocumentCompletenessIndicator — Compact traffic-light widget for doc expedient
 * V2-ES.3 → V2-ES.4 Paso 1 parte 5: Semáforo documental + alertas compactas
 *
 * Aggregates:
 * - Completitud (obligatorios / opcionales)
 * - Documentos rechazados
 * - Documentos pendientes de envío
 * - Plazos vencidos / próximos a vencer (via due rules)
 *
 * Receives docs by prop (no independent fetch).
 */
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHRProcessDocRequirements } from '@/hooks/erp/hr/useHRProcessDocRequirements';
import { normalizeDocStatus, type DocOperationalStatus } from './DocStatusBadge';

interface Props {
  managementType?: string | null;
  docs: Array<{ document_type: string; document_status?: string | null }>;
}

/** Count docs by operational status */
function countByStatus(docs: Array<{ document_status?: string | null }>): Record<DocOperationalStatus, number> {
  const counts = {} as Record<DocOperationalStatus, number>;
  for (const doc of docs) {
    const s = normalizeDocStatus(doc.document_status);
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

type SemaphoreLevel = 'green' | 'yellow' | 'red';

function getSemaphore(
  mandatoryComplete: boolean,
  rejected: number,
  pendingSubmission: number,
): SemaphoreLevel {
  if (!mandatoryComplete || rejected > 0) return 'red';
  if (pendingSubmission > 0) return 'yellow';
  return 'green';
}

const SEMAPHORE_STYLES: Record<SemaphoreLevel, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export function DocumentCompletenessIndicator({ managementType, docs }: Props) {
  const { getCompleteness } = useHRProcessDocRequirements();
  const completeness = getCompleteness(managementType, docs);

  // Status counts (always computed, even without completeness)
  const statusCounts = countByStatus(docs);
  const rejected = statusCounts.rejected || 0;
  const pendingSubmission = statusCounts.pending_submission || 0;
  const draft = statusCounts.draft || 0;

  // If no completeness AND no docs, nothing to show
  if (!completeness && docs.length === 0) return null;

  const mandatoryComplete = completeness?.mandatoryComplete ?? true;
  const semaphore = getSemaphore(mandatoryComplete, rejected, pendingSubmission);

  const alerts: Array<{ icon: typeof AlertCircle; label: string; style: string; count: number }> = [];

  if (completeness && !completeness.mandatoryComplete) {
    alerts.push({
      icon: ShieldAlert,
      label: `${completeness.mandatoryMissing.length} obligatorio${completeness.mandatoryMissing.length !== 1 ? 's' : ''} faltante${completeness.mandatoryMissing.length !== 1 ? 's' : ''}`,
      style: 'bg-red-500/10 text-red-700 border-red-500/30',
      count: completeness.mandatoryMissing.length,
    });
  }

  if (rejected > 0) {
    alerts.push({
      icon: XCircle,
      label: `${rejected} rechazado${rejected !== 1 ? 's' : ''}`,
      style: 'bg-red-500/10 text-red-700 border-red-500/30',
      count: rejected,
    });
  }

  if (pendingSubmission > 0) {
    alerts.push({
      icon: Send,
      label: `${pendingSubmission} pend. envío`,
      style: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
      count: pendingSubmission,
    });
  }

  if (draft > 0) {
    alerts.push({
      icon: Clock,
      label: `${draft} borrador${draft !== 1 ? 'es' : ''}`,
      style: 'bg-muted text-muted-foreground border-border',
      count: draft,
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2">
        {/* Main row: semaphore + completeness */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${SEMAPHORE_STYLES[semaphore]}`} />
            <FileText className="h-3.5 w-3.5" />
            Expediente
          </span>
          {completeness ? (
            completeness.percentage === 100 ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completo
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                {completeness.completed}/{completeness.total}
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="text-xs gap-1">
              {docs.length} doc{docs.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Alert badges */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {alerts.map((alert, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`${alert.style} text-[10px] px-1.5 py-0 gap-0.5 cursor-default`}
                  >
                    <alert.icon className="h-2.5 w-2.5" />
                    {alert.count}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {alert.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Mandatory detail line */}
        {completeness && completeness.totalMandatory > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Obligatorios</span>
            <span className={completeness.mandatoryComplete ? 'text-emerald-600' : 'text-red-600 font-medium'}>
              {completeness.completedMandatory}/{completeness.totalMandatory}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
