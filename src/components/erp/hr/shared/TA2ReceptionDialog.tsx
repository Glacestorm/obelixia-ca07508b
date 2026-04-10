/**
 * TA2ReceptionDialog — Dialog for registering TGSS TA2 response
 * V2-RRHH-P1.1
 */

import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTA2Reception } from '@/hooks/erp/hr/useTA2Reception';
import type { TA2ResponseType } from '@/engines/erp/hr/ta2ReceptionEngine';

interface TA2ReceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  artifactId: string;
  requestId?: string;
  onRegistered?: () => void;
}

export function TA2ReceptionDialog({
  open,
  onOpenChange,
  companyId,
  employeeId,
  artifactId,
  requestId,
  onRegistered,
}: TA2ReceptionDialogProps) {
  const { registerTA2Reception } = useTA2Reception(companyId);

  const [responseType, setResponseType] = useState<TA2ResponseType>('accepted');
  const [tgssReference, setTgssReference] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().slice(0, 10));
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const result = await registerTA2Reception({
      artifactId,
      employeeId,
      requestId,
      tgssReference,
      receptionDate,
      responseType,
      rejectionReason: responseType === 'rejected' ? rejectionReason : undefined,
      notes: notes || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      // Reset form
      setTgssReference('');
      setRejectionReason('');
      setNotes('');
      onRegistered?.();
    } else {
      setError(result.error ?? 'Error desconocido');
    }
  }, [
    artifactId, employeeId, requestId, tgssReference,
    receptionDate, responseType, rejectionReason, notes,
    registerTA2Reception, onRegistered,
  ]);

  const canSubmit = tgssReference.trim() && receptionDate && (
    responseType === 'accepted' || rejectionReason.trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar respuesta TA2</DialogTitle>
          <DialogDescription className="text-xs">
            Registra la respuesta oficial de la TGSS al trámite de afiliación.
            Esta acción generará evidencia documental y trazabilidad en el ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Response Type */}
          <div className="space-y-2">
            <Label className="text-xs">Tipo de respuesta</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResponseType('accepted')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all',
                  responseType === 'accepted'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aceptado
              </button>
              <button
                type="button"
                onClick={() => setResponseType('rejected')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all',
                  responseType === 'rejected'
                    ? 'border-red-500 bg-red-500/10 text-red-700'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                )}
              >
                <XCircle className="h-4 w-4" />
                Rechazado
              </button>
            </div>
          </div>

          {/* TGSS Reference */}
          <div className="space-y-1.5">
            <Label className="text-xs">Referencia TGSS *</Label>
            <Input
              value={tgssReference}
              onChange={e => setTgssReference(e.target.value)}
              placeholder="Ej: TA2-2026-001234567"
              className="h-9 text-sm"
            />
          </div>

          {/* Reception Date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de recepción *</Label>
            <Input
              type="date"
              value={receptionDate}
              onChange={e => setReceptionDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Rejection Reason (conditional) */}
          {responseType === 'rejected' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo de rechazo *</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Indique el motivo de rechazo comunicado por la TGSS"
                className="min-h-[60px] text-sm"
              />
            </div>
          )}

          {/* Notes (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones adicionales"
              className="min-h-[40px] text-sm"
            />
          </div>

          {/* Safety disclaimer */}
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>
              Esta acción registra la respuesta del TA2 como evidencia inmutable.
              El artefacto AFI pasará a estado "{responseType === 'accepted' ? 'Aceptado' : 'Rechazado'}".
              {responseType === 'accepted' && ' El proceso de alta se confirmará automáticamente.'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="gap-1.5"
          >
            {submitting ? 'Registrando...' : 'Registrar TA2'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
