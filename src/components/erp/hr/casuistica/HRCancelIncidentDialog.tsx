/**
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Diálogo de cancelación segura (soft-delete) de incidencias persistidas.
 *
 * INVARIANTES:
 *  - Nunca DELETE físico. Llama a `cancelPayrollIncident` que hace UPDATE.
 *  - Motivo obligatorio (≥5 caracteres tras trim).
 *  - Si la incidencia ya está aplicada (`applied_at`), bloquea cancelación.
 *  - No genera comunicaciones oficiales.
 *  - No modifica el motor de nómina ni el payload.
 */

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import { usePayrollIncidentMutations } from '@/hooks/erp/hr/usePayrollIncidentMutations';
import type { PayrollIncidentRow } from '@/lib/hr/incidenciasTypes';

const MIN_REASON_LENGTH = 5;

export interface HRCancelIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: PayrollIncidentRow | null;
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  onCancelled?: (id: string) => void;
  /** Inyectable en tests para stubear la mutación. */
  mutationsHook?: typeof usePayrollIncidentMutations;
}

export function HRCancelIncidentDialog({
  open,
  onOpenChange,
  incident,
  companyId,
  employeeId,
  periodYear,
  periodMonth,
  onCancelled,
  mutationsHook,
}: HRCancelIncidentDialogProps) {
  const useMutations = mutationsHook ?? usePayrollIncidentMutations;
  const { cancelPayrollIncident, isCancelling } = useMutations({
    companyId,
    employeeId,
    periodYear,
    periodMonth,
  });

  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const isApplied = Boolean(incident?.applied_at);
  const isAlreadyCancelled = Boolean(incident?.deleted_at);
  const trimmedLen = reason.trim().length;
  const reasonValid = trimmedLen >= MIN_REASON_LENGTH;
  const canConfirm =
    !!incident && !isApplied && !isAlreadyCancelled && reasonValid && !isCancelling;

  async function handleConfirm() {
    if (!incident || !canConfirm) return;
    const res = await cancelPayrollIncident(incident.id, reason);
    if (res) {
      onCancelled?.(res.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar incidencia persistida</DialogTitle>
          <DialogDescription>
            La incidencia no se borrará físicamente. Quedará marcada como
            cancelada con trazabilidad completa (autor, motivo, timestamp).
          </DialogDescription>
        </DialogHeader>

        <div
          role="note"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground"
        >
          <ShieldOff className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <p>
            La cancelación no envía comunicaciones oficiales (FDI / AFI / DELT@)
            ni recalcula nóminas. Solo marca el registro como cancelado.
          </p>
        </div>

        {isApplied && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Incidencia aplicada a nómina. Requiere flujo de recálculo en
              fase posterior (C4). La cancelación está bloqueada en C3C.
            </p>
          </div>
        )}

        {isAlreadyCancelled && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-muted-foreground/30 bg-muted/20 p-3 text-xs text-muted-foreground"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Esta incidencia ya está cancelada.</p>
          </div>
        )}

        <div className="grid gap-1.5 py-2">
          <Label htmlFor="cancel-reason">
            Motivo de cancelación <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indica el motivo (mínimo 5 caracteres)"
            disabled={isApplied || isAlreadyCancelled}
          />
          <p
            className={
              reasonValid
                ? 'text-[10px] text-muted-foreground'
                : 'text-[10px] text-destructive'
            }
            data-testid="cancel-reason-counter"
          >
            {trimmedLen}/{MIN_REASON_LENGTH} caracteres mínimos
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isCancelling ? 'Cancelando…' : 'Cancelar incidencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRCancelIncidentDialog;