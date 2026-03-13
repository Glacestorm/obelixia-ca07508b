/**
 * ProcessDeadlinesSummary — Resumen compacto de plazos legales de un proceso
 * V2-ES.4 Paso 1 (parte 3): Muestra deadlines aplicables en sidebar
 * Recibe processType + triggerDate por prop. Sin fetch propio (usa hook cacheado).
 */
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHRDocumentDueRules, type DueDateResult } from '@/hooks/erp/hr/useHRDocumentDueRules';
import { useHRHolidayCalendar } from '@/hooks/erp/hr/useHRHolidayCalendar';
import { DocDeadlineBadge } from './DocDeadlineBadge';

interface Props {
  processType: string;
  triggerDate: string | Date;
  /** Max deadlines to show (default 3, most urgent first) */
  maxItems?: number;
  className?: string;
}

/** Maps request_type → process_type for due rules lookup */
const REQUEST_TO_PROCESS: Record<string, string> = {
  employee_registration: 'employee_registration',
  termination: 'termination',
  sick_leave: 'sick_leave',
  work_accident: 'work_accident',
  birth_leave: 'birth_leave',
  settlement: 'termination',
  contract_modification: 'employee_registration',
};

export function ProcessDeadlinesSummary({
  processType,
  triggerDate,
  maxItems = 3,
  className,
}: Props) {
  const { getProcessDeadlines, isLoading } = useHRDocumentDueRules();

  const mappedProcess = REQUEST_TO_PROCESS[processType] ?? processType;
  const trigger = typeof triggerDate === 'string' ? new Date(triggerDate) : triggerDate;
  const deadlines = getProcessDeadlines(mappedProcess, trigger);

  if (isLoading || deadlines.length === 0) return null;

  const shown = deadlines.slice(0, maxItems);
  const hasOverdue = shown.some(d => d.urgency === 'overdue');
  const hasUrgent = shown.some(d => d.urgency === 'urgent');

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Plazos legales</span>
        {hasOverdue && <AlertOctagon className="h-3 w-3 text-red-600" />}
        {!hasOverdue && hasUrgent && <AlertTriangle className="h-3 w-3 text-amber-600" />}
        {!hasOverdue && !hasUrgent && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
      </div>
      <div className="flex flex-wrap gap-1">
        {shown.map((d, i) => (
          <DocDeadlineBadge
            key={i}
            urgency={d.urgency}
            severity={d.severity}
            label={`${d.rule.document_type_code}: ${d.label}`}
            showSeverityDot
          />
        ))}
      </div>
      {deadlines.length > maxItems && (
        <p className="text-[10px] text-muted-foreground">
          +{deadlines.length - maxItems} plazos más
        </p>
      )}
    </div>
  );
}
