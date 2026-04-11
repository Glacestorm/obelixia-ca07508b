/**
 * CertificaResponseDialog.tsx — SEPE Certific@2 response entry dialog
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Mirrors SiltraResponseDialog / AEATResponseDialog pattern.
 * Manual registration of SEPE responses for Certific@2 certificates.
 * 
 * IMPORTANT: No real SEPE connector exists.
 * This dialog registers manually-obtained responses.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Award } from 'lucide-react';
import { format } from 'date-fns';

interface CertificaResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactId: string;
  employeeId: string;
  terminationId?: string;
  onSubmit: (data: {
    responseType: 'accepted' | 'rejected';
    sepeReference: string;
    receptionDate: string;
    rejectionReason?: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function CertificaResponseDialog({
  open,
  onOpenChange,
  artifactId,
  employeeId,
  terminationId,
  onSubmit,
  isSubmitting = false,
}: CertificaResponseDialogProps) {
  const [responseType, setResponseType] = useState<'accepted' | 'rejected'>('accepted');
  const [sepeReference, setSepeReference] = useState('');
  const [receptionDate, setReceptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    await onSubmit({
      responseType,
      sepeReference,
      receptionDate,
      rejectionReason: responseType === 'rejected' ? rejectionReason : undefined,
      notes: notes || undefined,
    });

    // Reset form
    setResponseType('accepted');
    setSepeReference('');
    setReceptionDate(format(new Date(), 'yyyy-MM-dd'));
    setRejectionReason('');
    setNotes('');
  };

  const canSubmit = receptionDate
    && (responseType === 'accepted' || (responseType === 'rejected' && rejectionReason.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Registrar Respuesta SEPE — Certific@2
          </DialogTitle>
          <DialogDescription>
            Registrar manualmente la respuesta del SEPE al certificado de empresa
          </DialogDescription>
        </DialogHeader>

        {/* Preparatory banner */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Registro manual — no existe conector SEPE real. El artefacto es un payload preparatorio.
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* Response type */}
          <div className="space-y-2">
            <Label>Tipo de respuesta</Label>
            <Select value={responseType} onValueChange={(v) => setResponseType(v as 'accepted' | 'rejected')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">Aceptado</Badge>
                  </span>
                </SelectItem>
                <SelectItem value="rejected">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-red-500/10 text-red-700 text-xs">Rechazado</Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SEPE Reference */}
          <div className="space-y-2">
            <Label>Referencia SEPE (opcional)</Label>
            <Input
              placeholder="Nº de referencia del SEPE"
              value={sepeReference}
              onChange={(e) => setSepeReference(e.target.value)}
            />
          </div>

          {/* Reception date */}
          <div className="space-y-2">
            <Label>Fecha de recepción</Label>
            <Input
              type="date"
              value={receptionDate}
              onChange={(e) => setReceptionDate(e.target.value)}
            />
          </div>

          {/* Rejection reason (conditional) */}
          {responseType === 'rejected' && (
            <div className="space-y-2">
              <Label>Motivo de rechazo *</Label>
              <Textarea
                placeholder="Describe el motivo del rechazo por parte del SEPE..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea
              placeholder="Observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar Respuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CertificaResponseDialog;
