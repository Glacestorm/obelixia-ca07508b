/**
 * B10D.4 — Rollback / reject dialog. Reason ≥ 10 chars required
 * (mirrors B10D.3 edge constraint).
 *
 * Used for:
 *   - rollback of an `activated` request
 *   - reject of a `draft` or `pending_second_approval` request
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export type RuntimeRollbackDialogKind = 'rollback' | 'reject';

export interface RuntimeRollbackDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: RuntimeRollbackDialogKind;
  isPending?: boolean;
  onConfirm: (input: { reason: string }) => Promise<void> | void;
}

export function RuntimeRollbackDialog({
  open,
  onOpenChange,
  kind,
  isPending,
  onConfirm,
}: RuntimeRollbackDialogProps) {
  const [reason, setReason] = useState('');
  const reasonOk = reason.trim().length >= 10;
  const canConfirm = reasonOk && !isPending;

  const title = kind === 'rollback' ? 'Revertir activación (scope)' : 'Rechazar request';
  const desc =
    kind === 'rollback'
      ? 'El rollback marca el setting como no actual y deja constancia inmutable. No toca nómina.'
      : 'El rechazo cierra la request y deja constancia inmutable. No toca nómina.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`runtime-${kind}-dialog`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="runtime-rollback-reason">Motivo (mín. 10 caracteres)</Label>
          <Textarea
            id="runtime-rollback-reason"
            data-testid={`runtime-${kind}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indica el motivo (≥ 10 caracteres)"
            rows={3}
          />
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
            variant={kind === 'rollback' ? 'destructive' : 'destructive'}
            data-testid={`runtime-${kind}-confirm`}
            disabled={!canConfirm}
            onClick={() => onConfirm({ reason: reason.trim() })}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RuntimeRollbackDialog;