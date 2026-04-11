/**
 * AEATResponseDialog — Dialog for registering AEAT acceptance/rejection
 * P1.5R: Mirrors SiltraResponseDialog pattern for Modelo 111 / 190
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send } from 'lucide-react';
import { useAEATResponse } from '@/hooks/erp/hr/useAEATResponse';
import type { AEATArtifactType, AEATResponseType } from '@/engines/erp/hr/aeatResponseEngine';

interface AEATResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** Pre-selected artifact ID if available */
  artifactId?: string;
  /** Pre-selected type */
  artifactType?: AEATArtifactType;
  onSuccess?: () => void;
}

export function AEATResponseDialog({
  open,
  onOpenChange,
  companyId,
  artifactId: defaultArtifactId,
  artifactType: defaultArtifactType,
  onSuccess,
}: AEATResponseDialogProps) {
  const { registerAEATResponse } = useAEATResponse(companyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [artifactId, setArtifactId] = useState(defaultArtifactId ?? '');
  const [artifactType, setArtifactType] = useState<AEATArtifactType>(defaultArtifactType ?? 'modelo_111');
  const [responseType, setResponseType] = useState<AEATResponseType>('accepted');
  const [aeatReference, setAeatReference] = useState('');
  const [csvCode, setCsvCode] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(Math.ceil(new Date().getMonth() / 3));
  const [periodicity, setPeriodicity] = useState<'trimestral' | 'mensual'>('trimestral');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await registerAEATResponse({
        artifactId,
        artifactType,
        fiscalYear,
        period: artifactType === 'modelo_111' ? period : undefined,
        periodicity: artifactType === 'modelo_111' ? periodicity : undefined,
        responseType,
        aeatReference,
        csvCode: csvCode || undefined,
        receptionDate,
        rejectionReason: responseType === 'rejected' ? rejectionReason : undefined,
        notes: notes || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setAeatReference('');
        setCsvCode('');
        setRejectionReason('');
        setNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Registrar respuesta AEAT
          </DialogTitle>
          <DialogDescription>
            Registrar la aceptación o rechazo de un modelo fiscal por parte de la AEAT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Artifact ID */}
          <div className="space-y-1.5">
            <Label className="text-xs">ID del artefacto</Label>
            <Input value={artifactId} onChange={e => setArtifactId(e.target.value)} placeholder="M111-xxx o M190-xxx" className="text-sm" />
          </div>

          {/* Artifact type + Periodicity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de modelo</Label>
              <Select value={artifactType} onValueChange={v => setArtifactType(v as AEATArtifactType)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modelo_111">Modelo 111</SelectItem>
                  <SelectItem value="modelo_190">Modelo 190</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {artifactType === 'modelo_111' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Periodicidad</Label>
                <Select value={periodicity} onValueChange={v => setPeriodicity(v as 'trimestral' | 'mensual')}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual (grandes empresas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Response type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Respuesta AEAT</Label>
            <Select value={responseType} onValueChange={v => setResponseType(v as AEATResponseType)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted">✅ Aceptado</SelectItem>
                <SelectItem value="rejected">❌ Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference + CSV */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Referencia AEAT</Label>
              <Input value={aeatReference} onChange={e => setAeatReference(e.target.value)} placeholder="Ej: 202600001234" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Código CSV</Label>
              <Input value={csvCode} onChange={e => setCsvCode(e.target.value)} placeholder="Opcional" className="text-sm font-mono" />
            </div>
          </div>

          {/* Fiscal year + period + date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ejercicio</Label>
              <Input type="number" value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))} className="text-sm" />
            </div>
            {artifactType === 'modelo_111' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{periodicity === 'mensual' ? 'Mes' : 'Trimestre'}</Label>
                <Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min={1} max={periodicity === 'mensual' ? 12 : 4} className="text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha recepción</Label>
              <Input type="date" value={receptionDate} onChange={e => setReceptionDate(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Rejection reason */}
          {responseType === 'rejected' && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Motivo del rechazo
              </Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Detallar motivo de rechazo AEAT..." className="text-sm" rows={2} />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones adicionales..." className="text-sm" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !artifactId || !aeatReference}>
            {isSubmitting ? 'Registrando...' : 'Registrar respuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AEATResponseDialog;
