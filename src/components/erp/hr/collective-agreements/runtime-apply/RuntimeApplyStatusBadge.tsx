/**
 * B10D.4 — Status badge for runtime-apply request lifecycle.
 * Pure presentational. No payroll, no bridge, no flag.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RuntimeApplyStatus =
  | 'draft'
  | 'pending_second_approval'
  | 'approved_for_runtime'
  | 'activated'
  | 'rejected'
  | 'rolled_back'
  | 'superseded';

const LABELS: Record<RuntimeApplyStatus, string> = {
  draft: 'Borrador',
  pending_second_approval: 'Pendiente 2ª aprobación',
  approved_for_runtime: 'Aprobado para runtime',
  activated: 'Activado (scope)',
  rejected: 'Rechazado',
  rolled_back: 'Revertido',
  superseded: 'Superado',
};

const STYLES: Record<RuntimeApplyStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_second_approval:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  approved_for_runtime:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  activated:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  rolled_back:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  superseded:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

export function RuntimeApplyStatusBadge({
  status,
  className,
}: {
  status: RuntimeApplyStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-testid={`runtime-apply-status-${status}`}
      className={cn('font-normal border', STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}

export default RuntimeApplyStatusBadge;