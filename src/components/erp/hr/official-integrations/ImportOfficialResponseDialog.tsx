/**
 * ImportOfficialResponseDialog — LM1+LM2
 * Dialog for importing official responses (acuse/receipt) from organisms
 * 
 * Supports: TGSS, SEPE (Contrat@/Certific@2), AEAT
 * Invokes parser → creates receipt → transitions state → evidence + ledger
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseUniversal, type RawResponseInput } from '@/engines/erp/hr/officialResponseParserEngine';

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSubmissionId?: string | null;
}

export function ImportOfficialResponseDialog({ companyId, open, onOpenChange, preselectedSubmissionId }: Props) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [organism, setOrganism] = useState('');
  const [responseType, setResponseType] = useState('');
  const [reference, setReference] = useState('');
  const [csvCode, setCsvCode] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().slice(0, 10));
  const [errorsText, setErrorsText] = useState('');
  const [submissionId, setSubmissionId] = useState(preselectedSubmissionId || '');

  const resetForm = useCallback(() => {
    setOrganism('');
    setResponseType('');
    setReference('');
    setCsvCode('');
    setReceptionDate(new Date().toISOString().slice(0, 10));
    setErrorsText('');
    setSubmissionId(preselectedSubmissionId || '');
  }, [preselectedSubmissionId]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id) { toast.error('No autenticado'); return; }
    if (!organism || !responseType) { toast.error('Selecciona organismo y tipo de respuesta'); return; }

    setIsSubmitting(true);
    try {
      // 1. Parse response
      const rawInput: RawResponseInput = {
        organism,
        responseType,
        reference: reference || undefined,
        csvCode: csvCode || undefined,
        errorsText: errorsText || undefined,
      };
      const parsed = parseUniversal(rawInput);

      // 2. Create receipt record
      const receiptData = {
        company_id: companyId,
        submission_id: submissionId || null,
        receipt_type: parsed.receiptType,
        organism: parsed.organism,
        reference_code: parsed.reference,
        csv_code: parsed.csvCode || null,
        received_at: receptionDate ? new Date(receptionDate).toISOString() : new Date().toISOString(),
        raw_response: parsed.rawData,
        parsed_status: parsed.status,
        errors: parsed.errors.length > 0 ? parsed.errors : null,
        warnings: parsed.warnings.length > 0 ? parsed.warnings : null,
        registered_by: user.id,
        metadata: {
          parser_version: 'lm2',
          sub_channel: parsed.subChannel,
          imported_manually: true,
        },
      };

      const { error: receiptError } = await (supabase as any)
        .from('hr_official_submission_receipts')
        .insert(receiptData);

      if (receiptError) {
        console.error('[ImportResponse] receipt insert error:', receiptError);
        toast.error('Error al registrar acuse');
        return;
      }

      // 3. Update submission status if linked
      if (submissionId) {
        const newStatus = parsed.status === 'accepted' ? 'accepted'
          : parsed.status === 'rejected' ? 'rejected'
          : parsed.status === 'partial' ? 'partially_accepted'
          : 'processing';

        await (supabase as any)
          .from('hr_official_submissions')
          .update({
            status: newStatus,
            metadata: {
              last_receipt_reference: parsed.reference,
              last_receipt_status: parsed.status,
              last_receipt_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', submissionId)
          .eq('company_id', companyId);
      }

      // 4. Evidence
      await (supabase as any)
        .from('erp_hr_evidence')
        .insert({
          company_id: companyId,
          evidence_type: 'external_receipt',
          evidence_label: `Acuse ${organism.toUpperCase()} - ${reference || 'sin ref'}`,
          ref_entity_type: 'official_submission',
          ref_entity_id: submissionId || 'manual_import',
          evidence_snapshot: {
            parsed,
            receptionDate,
            importedBy: user.id,
          },
          captured_by: user.id,
          metadata: {
            process: 'response_import',
            organism,
            version: 'lm2',
          },
        });

      // 5. Ledger
      await (supabase as any)
        .from('erp_hr_ledger')
        .insert({
          company_id: companyId,
          event_type: 'official_response_imported',
          event_label: `Respuesta ${organism.toUpperCase()} importada: ${parsed.status}`,
          entity_type: 'official_submission',
          entity_id: submissionId || 'manual_import',
          actor_id: user.id,
          actor_role: 'hr_admin',
          after_snapshot: parsed,
          metadata: {
            organism,
            response_type: responseType,
            reference,
            process: 'last_mile',
          },
        });

      toast.success('Respuesta oficial importada correctamente');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('[ImportResponse] error:', err);
      toast.error('Error al importar respuesta');
    } finally {
      setIsSubmitting(false);
    }
  }, [organism, responseType, reference, csvCode, receptionDate, errorsText, submissionId, companyId, user, resetForm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Importar respuesta oficial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Organismo *</Label>
              <Select value={organism} onValueChange={setOrganism}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tgss">TGSS / RED / SILTRA</SelectItem>
                  <SelectItem value="sepe_contrata">SEPE / Contrat@</SelectItem>
                  <SelectItem value="sepe_certifica">SEPE / Certific@2</SelectItem>
                  <SelectItem value="aeat">AEAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo respuesta *</Label>
              <Select value={responseType} onValueChange={setResponseType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acceptance">Aceptación</SelectItem>
                  <SelectItem value="rejection">Rechazo</SelectItem>
                  <SelectItem value="partial">Aceptación parcial</SelectItem>
                  <SelectItem value="correction">Corrección requerida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Referencia oficial</Label>
              <Input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Nº referencia / ID"
                className="h-9"
              />
            </div>

            {(organism === 'aeat') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Código CSV</Label>
                <Input
                  value={csvCode}
                  onChange={e => setCsvCode(e.target.value)}
                  placeholder="CSV justificante"
                  className="h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Fecha recepción</Label>
              <Input
                type="date"
                value={receptionDate}
                onChange={e => setReceptionDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ID Envío vinculado (opcional)</Label>
            <Input
              value={submissionId}
              onChange={e => setSubmissionId(e.target.value)}
              placeholder="UUID del envío original"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Errores / Observaciones</Label>
            <Textarea
              value={errorsText}
              onChange={e => setErrorsText(e.target.value)}
              placeholder="Un error por línea (si aplica)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !organism || !responseType}>
            {isSubmitting ? 'Importando...' : 'Importar respuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
