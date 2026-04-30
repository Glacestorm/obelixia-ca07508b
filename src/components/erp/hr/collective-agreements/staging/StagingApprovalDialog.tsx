import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingBlockersWarningsPanel } from './StagingBlockersWarningsPanel';

export type ApprovalAction = 'approve_single' | 'approve_first' | 'approve_second';

export interface StagingApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StagingRowSummary | null;
  action: ApprovalAction;
  /** Currently authenticated user id, used to block self-second-approval. */
  currentUserId: string | null;
  isPending?: boolean;
  onConfirm: () => void;
}

const RESPONSIBILITY_TEXT =
  'Al aprobar esta fila confirmo que he revisado el dato contra la fuente oficial y asumo la responsabilidad de su uso posterior en el flujo de convenio.';

const ACTION_TITLE: Record<ApprovalAction, string> = {
  approve_single: 'Aprobar fila (revisión única)',
  approve_first: 'Aprobar — primera revisión',
  approve_second: 'Aprobar — segunda revisión',
};

export function StagingApprovalDialog({
  open,
  onOpenChange,
  row,
  action,
  currentUserId,
  isPending,
  onConfirm,
}: StagingApprovalDialogProps) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  if (!row) return null;

  const sameReviewerBlocked =
    action === 'approve_second' &&
    !!currentUserId &&
    !!row.first_reviewed_by &&
    currentUserId === row.first_reviewed_by;

  const confirmDisabled = !accepted || !!isPending || sameReviewerBlocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ACTION_TITLE[action]}</DialogTitle>
          <DialogDescription>
            Convenio: TIC-NAC · año {row.year} · grupo {row.professional_group}
            {row.level ? ` · nivel ${row.level}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <StagingBlockersWarningsPanel row={row} />

          {sameReviewerBlocked && (
            <div
              role="alert"
              data-testid="staging-same-reviewer-blocked"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                No puedes ser el mismo revisor en la primera y la segunda aprobación.
                La segunda revisión debe realizarla otra persona autorizada.
              </span>
            </div>
          )}

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Responsabilidad del aprobador</p>
            <p
              data-testid="staging-responsibility-text"
              className="mt-1 text-muted-foreground"
            >
              {RESPONSIBILITY_TEXT}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="staging-responsibility-checkbox"
              data-testid="staging-responsibility-checkbox"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <Label
              htmlFor="staging-responsibility-checkbox"
              className="text-sm leading-snug"
            >
              Confirmo mi responsabilidad sobre esta revisión.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            data-testid="staging-confirm-approval"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            Confirmar aprobación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StagingApprovalDialog;