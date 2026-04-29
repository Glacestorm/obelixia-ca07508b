/**
 * B10C.2B.2C — Confirmation dialog for mapping actions:
 *   - approve (cnae_suggestion requires human-confirm checkbox)
 *   - reject  (reason ≥ 5 chars required)
 *   - supersede (reason ≥ 5 chars required)
 *
 * The dialog NEVER applies anything to payroll. Approving here is
 * an INTERNAL approval; the runtime activation is reserved for B10D.
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export type MappingActionKind = 'approve' | 'reject' | 'supersede';

export interface MappingActionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: MappingActionKind;
  sourceType?: string;
  hasBlockers?: boolean;
  onConfirm: (input: { reason?: string; humanConfirmed?: boolean }) => Promise<void> | void;
  isPending?: boolean;
}

export function MappingActionDialog({
  open,
  onOpenChange,
  action,
  sourceType,
  hasBlockers,
  onConfirm,
  isPending,
}: MappingActionDialogProps) {
  const [reason, setReason] = useState('');
  const [humanConfirmed, setHumanConfirmed] = useState(false);

  const requiresReason = action === 'reject' || action === 'supersede';
  const reasonOk = !requiresReason || reason.trim().length >= 5;

  const requiresHumanConfirm = action === 'approve' && sourceType === 'cnae_suggestion';
  const humanConfirmOk = !requiresHumanConfirm || humanConfirmed;

  const blockedByBlockers = action === 'approve' && !!hasBlockers;

  const canConfirm = reasonOk && humanConfirmOk && !blockedByBlockers && !isPending;

  const titles: Record<MappingActionKind, string> = {
    approve: 'Aprobar mapping interno',
    reject: 'Rechazar mapping',
    supersede: 'Superar mapping',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mapping-action-dialog">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>
            Esta acción es interna. No ejecuta nómina con el convenio seleccionado.
          </DialogDescription>
        </DialogHeader>

        {blockedByBlockers && (
          <div
            data-testid="mapping-action-blockers-warning"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <span className="text-destructive">
              El candidato tiene bloqueos pendientes. Resuelve los bloqueos antes de aprobar.
            </span>
          </div>
        )}

        {requiresReason && (
          <div className="space-y-1">
            <Label htmlFor="mapping-action-reason">Motivo (mín. 5 caracteres)</Label>
            <Textarea
              id="mapping-action-reason"
              data-testid="mapping-action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica el motivo"
              rows={3}
            />
          </div>
        )}

        {requiresHumanConfirm && (
          <div className="flex items-start gap-2">
            <Checkbox
              id="mapping-action-human-confirm"
              data-testid="mapping-action-human-confirm"
              checked={humanConfirmed}
              onCheckedChange={(v) => setHumanConfirmed(v === true)}
            />
            <Label htmlFor="mapping-action-human-confirm" className="text-sm leading-snug">
              Confirmo selección humana del convenio sugerido por CNAE.
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            data-testid="mapping-action-confirm"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                reason: requiresReason ? reason.trim() : undefined,
                humanConfirmed: requiresHumanConfirm ? humanConfirmed : undefined,
              })
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MappingActionDialog;