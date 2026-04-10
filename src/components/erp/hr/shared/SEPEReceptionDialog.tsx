/**
 * SEPEReceptionDialog — Dialog for registering SEPE/Contrat@ response
 * V2-RRHH-P1.2: Mirrors TA2ReceptionDialog pattern
 */

import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSEPEReception } from '@/hooks/erp/hr/useSEPEReception';
import type { SEPEResponseType } from '@/engines/erp/hr/sepeReceptionEngine';

interface SEPEReceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  artifactId: string;
  contractProcessId?: string;
  onRegistered?: () => void;
}

export function SEPEReceptionDialog({
  open,
  onOpenChange,
  companyId,
  employeeId,
  artifactId,
  contractProcessId,
  onRegistered,
}: SEPEReceptionDialogProps) {
  const { registerSEPEReception } = useSEPEReception(companyId);

  const [responseType, setResponseType] = useState<SEPEResponseType>('accepted');
  const [sepeReference, setSepeReference] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().slice(0, 10));
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const result = await registerSEPEReception({
      artifactId,
      employeeId,
      contractProcessId,
      sepeReference,
      receptionDate,
      responseType,
      rejectionReason: responseType === 'rejected' ? rejectionReason : undefined,
      notes: notes || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      setSepeReference('');
      setRejectionReason('');
      setNotes('');
      onRegistered?.();
    } else {
      setError(result.error ?? 'Error desconocido');
    }
  }, [
    artifactId, employeeId, contractProcessId, sepeReference,
    receptionDate, responseType, rejectionReason, notes,
    registerSEPEReception, onRegistered,
  ]);

  const canSubmit = sepeReference.trim() && receptionDate && (
    responseType === 'accepted' || rejectionReason.trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar respuesta SEPE</DialogTitle>
          <DialogDescription className="text-xs">
            Registra la respuesta del SEPE a la comunicación Contrat@.
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

          {/* SEPE Reference */}
          <div className="space-y-1.5">
            <Label className="text-xs">Referencia SEPE *</Label>
            <Input
              value={sepeReference}
              onChange={e => setSepeReference(e.target.value)}
              placeholder="Ej: SEPE-2026-001234567"
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

          {/* Rejection Reason */}
          {responseType === 'rejected' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo de rechazo *</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Indique el motivo de rechazo comunicado por el SEPE"
                className="min-h-[60px] text-sm"
              />
            </div>
          )}

          {/* Notes */}
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
              Esta acción registra la respuesta SEPE como evidencia inmutable.
              El artefacto Contrat@ pasará a estado "{responseType === 'accepted' ? 'Aceptado' : 'Rechazado'}".
              {responseType === 'accepted' && ' El proceso contractual se confirmará automáticamente.'}
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
            {submitting ? 'Registrando...' : 'Registrar respuesta SEPE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
