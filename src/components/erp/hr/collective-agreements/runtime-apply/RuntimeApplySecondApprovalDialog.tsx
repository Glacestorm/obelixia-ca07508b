/**
 * B10D.4 — Second-approval dialog. Requires the 4 acknowledgements
 * mirrored from the service B10D.2 / edge B10D.3:
 *   - understands_runtime_enable
 *   - reviewed_comparison_report
 *   - reviewed_payroll_impact
 *   - confirms_rollback_available
 *
 * Also surfaces the warning that the second approver must NOT be the
 * original requester. Real check is enforced server-side; this is a
 * client-side guidance only.
 */
import React, { useState } from 'react';
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
import { AlertTriangle } from 'lucide-react';

export interface RuntimeApplySecondApprovalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending?: boolean;
  onConfirm: (input: {
    acknowledgements: {
      understands_runtime_enable: true;
      reviewed_comparison_report: true;
      reviewed_payroll_impact: true;
      confirms_rollback_available: true;
    };
  }) => Promise<void> | void;
}

const ACK_ROWS = [
  {
    key: 'understands_runtime_enable',
    label:
      'Entiendo que esto habilita el scope para el registro en runtime (sin tocar nómina aún).',
  },
  {
    key: 'reviewed_comparison_report',
    label: 'He revisado el reporte de comparación interno → registro.',
  },
  {
    key: 'reviewed_payroll_impact',
    label: 'He revisado la vista previa de impacto en nómina.',
  },
  {
    key: 'confirms_rollback_available',
    label: 'Confirmo que el rollback está disponible y entiendo el procedimiento.',
  },
] as const;

type AckKey = (typeof ACK_ROWS)[number]['key'];

export function RuntimeApplySecondApprovalDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: RuntimeApplySecondApprovalDialogProps) {
  const [acks, setAcks] = useState<Record<AckKey, boolean>>({
    understands_runtime_enable: false,
    reviewed_comparison_report: false,
    reviewed_payroll_impact: false,
    confirms_rollback_available: false,
  });

  const allChecked = ACK_ROWS.every((r) => acks[r.key]);
  const canConfirm = allChecked && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="runtime-apply-second-approval-dialog">
        <DialogHeader>
          <DialogTitle>Segunda aprobación — runtime apply</DialogTitle>
          <DialogDescription>
            Esta acción no ejecuta nómina con el registro. Solo registra al
            scope como elegible para una fase posterior.
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="runtime-apply-distinct-user-warning"
          className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm flex items-start gap-2 dark:bg-amber-900/20 dark:border-amber-700"
        >
          <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 dark:text-amber-300" />
          <span className="text-amber-900 dark:text-amber-200">
            La segunda aprobación no puede realizarla el mismo usuario
            solicitante. El servidor rechazará la operación si coincide.
          </span>
        </div>

        <div className="space-y-2">
          {ACK_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-start gap-2"
              data-testid={`runtime-apply-ack-row-${row.key}`}
            >
              <Checkbox
                id={`runtime-apply-ack-${row.key}`}
                data-testid={`runtime-apply-ack-${row.key}`}
                checked={acks[row.key]}
                onCheckedChange={(v) =>
                  setAcks((prev) => ({ ...prev, [row.key]: v === true }))
                }
              />
              <Label
                htmlFor={`runtime-apply-ack-${row.key}`}
                className="text-sm leading-snug"
              >
                {row.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            data-testid="runtime-apply-second-approval-confirm"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                acknowledgements: {
                  understands_runtime_enable: true,
                  reviewed_comparison_report: true,
                  reviewed_payroll_impact: true,
                  confirms_rollback_available: true,
                },
              })
            }
          >
            Confirmar 2ª aprobación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RuntimeApplySecondApprovalDialog;