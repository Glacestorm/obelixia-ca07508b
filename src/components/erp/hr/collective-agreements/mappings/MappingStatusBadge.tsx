/**
 * B10C.2B.2C — Status badge for mapping lifecycle states.
 * Pure presentational. No payroll, no bridge, no flag.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MappingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'rejected'
  | 'superseded';

const LABELS: Record<MappingStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  approved_internal: 'Aprobado interno',
  rejected: 'Rechazado',
  superseded: 'Superado',
};

const STYLES: Record<MappingStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_review: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  approved_internal: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  superseded: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

export function MappingStatusBadge({
  status,
  className,
}: {
  status: MappingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-testid={`mapping-status-${status}`}
      className={cn('font-normal border', STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}

export default MappingStatusBadge;