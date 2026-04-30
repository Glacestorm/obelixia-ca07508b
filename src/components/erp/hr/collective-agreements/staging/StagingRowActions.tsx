/**
 * B11.2C.3A — Test-friendly explicit action buttons for the staging review.
 *
 * Replaces the Radix DropdownMenu used previously. The previous menu was
 * fragile in jsdom (floating-ui + portal) and broke 5/12 UI tests.
 *
 * This component renders the same set of actions as plain accessible
 * buttons, each with:
 *   - role="menuitem" (so existing tests that look up by role keep working)
 *   - a stable data-testid: staging-action-<kind>-<rowId>
 *
 * It NEVER triggers any DB write directly: it only invokes the parent
 * `onAction` callback. Approval mode + status drive availability — the
 * business rules are NOT changed here, only made deterministically
 * testable.
 */
import { Button } from '@/components/ui/button';
import {
  Eye,
  Pencil,
  Check,
  CheckCheck,
  X,
  AlertOctagon,
} from 'lucide-react';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';

export type StagingRowAction =
  | 'view'
  | 'edit'
  | 'approve_single'
  | 'approve_first'
  | 'approve_second'
  | 'reject'
  | 'mark_needs_correction';

export interface StagingRowActionsProps {
  row: StagingRowSummary;
  onAction: (action: StagingRowAction, row: StagingRowSummary) => void;
}

export function StagingRowActions({ row, onAction }: StagingRowActionsProps) {
  const isRejected = row.validation_status === 'rejected';
  const isApprovedFinal =
    row.validation_status === 'human_approved_single' ||
    row.validation_status === 'human_approved_second';

  const isPending =
    row.validation_status === 'ocr_pending_review' ||
    row.validation_status === 'manual_pending_review' ||
    row.validation_status === 'needs_correction';

  const isFirstApproved = row.validation_status === 'human_approved_first';

  const mode = row.approval_mode ?? '';
  const isSingleMode = mode.includes('single');
  const isDualMode = mode.includes('dual');

  const canEdit = !isRejected && !isApprovedFinal;
  const canApproveSingle = isSingleMode && isPending;
  const canApproveFirst = isDualMode && isPending;
  const canApproveSecond = isDualMode && isFirstApproved;
  const canReject = !isRejected && !isApprovedFinal;
  const canNeedsCorrection = !isRejected && !isApprovedFinal;

  return (
    <div
      role="group"
      aria-label="Acciones de revisión"
      data-testid={`staging-row-actions-${row.id}`}
      className="flex flex-wrap items-center justify-end gap-1"
    >
      <Button
        type="button"
        role="menuitem"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs"
        data-testid={`staging-action-detail-${row.id}`}
        onClick={() => onAction('view', row)}
      >
        <Eye className="mr-1 h-3.5 w-3.5" /> Ver detalle
      </Button>

      {canEdit && (
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          data-testid={`staging-action-edit-${row.id}`}
          onClick={() => onAction('edit', row)}
        >
          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar propuesta
        </Button>
      )}

      {canApproveSingle && (
        <Button
          type="button"
          role="menuitem"
          variant="secondary"
          size="sm"
          className="h-8 px-2 text-xs"
          data-testid={`staging-action-approve-single-${row.id}`}
          onClick={() => onAction('approve_single', row)}
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Aprobar (única)
        </Button>
      )}

      {canApproveFirst && (
        <Button
          type="button"
          role="menuitem"
          variant="secondary"
          size="sm"
          className="h-8 px-2 text-xs"
          data-testid={`staging-action-approve-first-${row.id}`}
          onClick={() => onAction('approve_first', row)}
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Aprobar 1ª
        </Button>
      )}

      {canApproveSecond && (
        <Button
          type="button"
          role="menuitem"
          variant="secondary"
          size="sm"
          className="h-8 px-2 text-xs"
          data-testid={`staging-action-approve-second-${row.id}`}
          onClick={() => onAction('approve_second', row)}
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Aprobar 2ª
        </Button>
      )}

      {canNeedsCorrection && (
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          data-testid={`staging-action-needs-correction-${row.id}`}
          onClick={() => onAction('mark_needs_correction', row)}
        >
          <AlertOctagon className="mr-1 h-3.5 w-3.5" /> Necesita corrección
        </Button>
      )}

      {canReject && (
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          data-testid={`staging-action-reject-${row.id}`}
          onClick={() => onAction('reject', row)}
        >
          <X className="mr-1 h-3.5 w-3.5" /> Rechazar
        </Button>
      )}
    </div>
  );
}

export default StagingRowActions;