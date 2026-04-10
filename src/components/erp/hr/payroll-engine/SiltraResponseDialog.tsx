/**
 * SiltraResponseDialog — Register TGSS response for RLC/RNT/CRA
 * V2-RRHH-P1.4: Mirrors TA2ReceptionDialog / SEPEReceptionDialog pattern
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send } from 'lucide-react';
import { useSiltraResponse } from '@/hooks/erp/hr/useSiltraResponse';
import type { SiltraArtifactType, SiltraResponseType } from '@/engines/erp/hr/siltraResponseEngine';

interface SiltraResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  periodYear: number;
  periodMonth: number;
  /** Pre-selected artifact ID if opening from a specific artifact */
  defaultArtifactId?: string;
  defaultArtifactType?: SiltraArtifactType;
  onSuccess?: () => void;
}

export function SiltraResponseDialog({
  open,
  onOpenChange,
  companyId,
  periodYear,
  periodMonth,
  defaultArtifactId,
  defaultArtifactType,
  onSuccess,
}: SiltraResponseDialogProps) {
  const { registerSiltraResponse } = useSiltraResponse(companyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [artifactId, setArtifactId] = useState(defaultArtifactId ?? '');
  const [artifactType, setArtifactType] = useState<SiltraArtifactType>(defaultArtifactType ?? 'rlc');
  const [responseType, setResponseType] = useState<SiltraResponseType>('accepted');
  const [tgssReference, setTgssReference] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await registerSiltraResponse({
        artifactId,
        artifactType,
        periodYear,
        periodMonth,
        responseType,
        tgssReference,
        receptionDate,
        rejectionReason: responseType === 'rejected' ? rejectionReason : undefined,
        notes: notes || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
        // Reset
        setArtifactId('');
        setTgssReference('');
        setRejectionReason('');
        setNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const periodLabel = `${String(periodMonth).padStart(2, '0')}/${periodYear}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Registrar respuesta TGSS
          </DialogTitle>
          <DialogDescription>
            Periodo {periodLabel} — Registre la respuesta oficial de la TGSS para un artefacto RLC, RNT o CRA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Artifact Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de artefacto</Label>
            <Select value={artifactType} onValueChange={(v) => setArtifactType(v as SiltraArtifactType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rlc">RLC — Recibo de Liquidación</SelectItem>
                <SelectItem value="rnt">RNT — Relación Nominal</SelectItem>
                <SelectItem value="cra">CRA — Cuadro Resumen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Artifact ID */}
          <div className="space-y-1.5">
            <Label className="text-xs">ID del artefacto</Label>
            <Input
              value={artifactId}
              onChange={(e) => setArtifactId(e.target.value)}
              placeholder="ID del artefacto en el sistema"
            />
          </div>

          {/* Response Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de respuesta</Label>
            <Select value={responseType} onValueChange={(v) => setResponseType(v as SiltraResponseType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted">Aceptado por TGSS</SelectItem>
                <SelectItem value="rejected">Rechazado por TGSS</SelectItem>
                <SelectItem value="confirmed">Confirmado (post-reconciliación)</SelectItem>
              </SelectContent>
            </Select>
            {responseType === 'confirmed' && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Solo marcar como confirmado tras reconciliación exitosa.
              </p>
            )}
          </div>

          {/* TGSS Reference */}
          <div className="space-y-1.5">
            <Label className="text-xs">Referencia TGSS</Label>
            <Input
              value={tgssReference}
              onChange={(e) => setTgssReference(e.target.value)}
              placeholder="Número de referencia TGSS"
            />
          </div>

          {/* Reception Date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de recepción</Label>
            <Input
              type="date"
              value={receptionDate}
              onChange={(e) => setReceptionDate(e.target.value)}
            />
          </div>

          {/* Rejection Reason */}
          {responseType === 'rejected' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo de rechazo</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo indicado por la TGSS..."
                rows={2}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !artifactId.trim() || !tgssReference.trim()}
          >
            {isSubmitting ? 'Registrando...' : 'Registrar respuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SiltraResponseDialog;
