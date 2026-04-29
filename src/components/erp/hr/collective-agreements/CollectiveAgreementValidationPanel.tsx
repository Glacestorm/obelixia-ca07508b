/**
 * B8A.3 — Internal human validation panel for collective agreements.
 *
 * - Reads via `useCollectiveAgreementValidation` (RLS, user client).
 * - Writes EXCLUSIVELY through the edge function B8A.2 via
 *   `useCollectiveAgreementValidationActions`.
 * - NEVER activates ready_for_payroll.
 * - NEVER touches the operational table or payroll engines.
 * - The "Validación interna — no oficial." banner is always visible.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useCollectiveAgreementValidation,
} from '@/hooks/erp/hr/useCollectiveAgreementValidation';
import {
  useCollectiveAgreementValidationActions,
} from '@/hooks/erp/hr/useCollectiveAgreementValidationActions';
import { NotOfficialBanner } from './internal/NotOfficialBanner';
import { AgreementValidationHeader } from './AgreementValidationHeader';
import { AgreementSourceHashCard } from './AgreementSourceHashCard';
import { AgreementSalaryRowsReviewTable } from './AgreementSalaryRowsReviewTable';
import { AgreementRulesReviewCard } from './AgreementRulesReviewCard';
import { AgreementParserWarningsPanel } from './AgreementParserWarningsPanel';
import { AgreementDiscardedRowsPanel } from './AgreementDiscardedRowsPanel';
import { AgreementValidationChecklist } from './AgreementValidationChecklist';
import { AgreementSignatureCard } from './AgreementSignatureCard';
import { AgreementValidationHistory } from './AgreementValidationHistory';

const AUTHORIZED_ROLES = new Set(['admin', 'superadmin', 'hr_manager', 'legal_manager']);

export interface CollectiveAgreementValidationPanelProps {
  agreementId: string;
  versionId: string;
  sourceId: string;
  onClose?: () => void;
}

function isCritical(w: unknown): boolean {
  const sev = (w as { severity?: string })?.severity;
  return sev === 'critical' || sev === 'CRITICAL';
}

export function CollectiveAgreementValidationPanel(
  props: CollectiveAgreementValidationPanelProps,
) {
  const { userRole } = useAuth();
  const canWrite = !!userRole && AUTHORIZED_ROLES.has(userRole);

  const read = useCollectiveAgreementValidation({
    agreementId: props.agreementId,
    versionId: props.versionId,
    sourceId: props.sourceId,
  });
  const actions = useCollectiveAgreementValidationActions();

  const [confirmDialog, setConfirmDialog] = useState<null | 'approve' | 'reject' | 'supersede'>(null);
  const [notes, setNotes] = useState('');

  const validation = read.currentValidation;
  const status = (validation?.validation_status as string | undefined) ?? null;

  const sourceHash = (read.data?.source?.document_hash as string | null) ?? null;
  const versionHash = (read.data?.version?.source_hash as string | null) ?? null;
  const shaMismatch = !!sourceHash && !!versionHash && sourceHash !== versionHash;

  const criticalUnresolved = useMemo(
    () => (read.data?.parserWarnings.unresolved ?? []).some(isCritical),
    [read.data?.parserWarnings.unresolved],
  );

  const checklistByKey = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const it of read.items) m.set(it.item_key as string, it);
    return m;
  }, [read.items]);

  const noPayrollAck = checklistByKey.get('no_payroll_use_acknowledged');
  const noPayrollAckOk = (noPayrollAck?.item_status as string | undefined) === 'verified';

  const anyPending = Array.from(checklistByKey.values()).some(
    (it) => (it.item_status as string) === 'pending',
  );
  const anyRejected = Array.from(checklistByKey.values()).some(
    (it) => (it.item_status as string) === 'rejected',
  );

  const approveBlocked =
    !canWrite ||
    !validation ||
    status !== 'pending_review' ||
    !noPayrollAckOk ||
    anyPending ||
    anyRejected ||
    criticalUnresolved ||
    shaMismatch;

  const handleResult = async (
    res: { success: boolean; error?: { code: string; message: string } },
    successMsg: string,
  ) => {
    if (res.success) {
      toast.success(successMsg);
      await read.refresh();
    } else {
      toast.error(res.error?.message ?? 'Error');
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <NotOfficialBanner />
        <AgreementValidationHeader
          agreementName={(read.data?.agreement?.name as string) ?? null}
          internalCode={(read.data?.agreement?.internal_code as string) ?? null}
          status={status}
        />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="tables">Tablas</TabsTrigger>
            <TabsTrigger value="rules">Reglas</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="discarded">Descartadas</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="signature">Firma</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="pt-3 space-y-3">
            <AgreementSourceHashCard source={read.data?.source ?? null} version={read.data?.version ?? null} />
          </TabsContent>

          <TabsContent value="tables" className="pt-3">
            <AgreementSalaryRowsReviewTable rows={read.data?.salaryRows ?? []} />
          </TabsContent>

          <TabsContent value="rules" className="pt-3">
            <AgreementRulesReviewCard rules={read.data?.rules ?? null} />
          </TabsContent>

          <TabsContent value="warnings" className="pt-3">
            <AgreementParserWarningsPanel
              unresolved={read.data?.parserWarnings.unresolved ?? []}
              resolved={read.data?.parserWarnings.resolved ?? []}
            />
          </TabsContent>

          <TabsContent value="discarded" className="pt-3">
            <AgreementDiscardedRowsPanel rows={read.data?.discardedRows ?? []} />
          </TabsContent>

          <TabsContent value="checklist" className="pt-3">
            <AgreementValidationChecklist
              items={read.items}
              disabled={!canWrite || !validation}
              onSaveItem={async (data) => {
                if (!validation) return;
                const res = await actions.updateChecklistItem({
                  validationId: validation.id as string,
                  itemKey: data.itemKey,
                  itemStatus: data.itemStatus,
                  comment: data.comment,
                  evidenceUrl: data.evidenceUrl,
                  evidenceExcerpt: data.evidenceExcerpt,
                });
                await handleResult(res, 'Item guardado');
              }}
            />
          </TabsContent>

          <TabsContent value="signature" className="pt-3">
            <AgreementSignatureCard signatures={read.signatures} />
          </TabsContent>

          <TabsContent value="history" className="pt-3">
            <AgreementValidationHistory history={read.history} />
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {canWrite && !validation && (
            <Button
              size="sm"
              onClick={async () => {
                const res = await actions.createDraft({
                  agreementId: props.agreementId,
                  versionId: props.versionId,
                  sourceId: props.sourceId,
                  validationScope: ['metadata', 'salary_tables', 'rules'],
                });
                await handleResult(res, 'Borrador creado');
              }}
            >
              Crear borrador
            </Button>
          )}
          {canWrite && validation && status === 'draft' && (
            <Button
              size="sm"
              onClick={async () => {
                const res = await actions.submitForReview({ validationId: validation.id as string });
                await handleResult(res, 'Enviado a revisión');
              }}
            >
              Enviar a revisión
            </Button>
          )}
          {canWrite && validation && status === 'pending_review' && (
            <>
              <Button
                size="sm"
                disabled={approveBlocked}
                onClick={() => setConfirmDialog('approve')}
                title={approveBlocked ? 'Revise checklist, warnings y SHA antes de aprobar' : ''}
              >
                Aprobar internamente
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmDialog('reject')}>
                Rechazar
              </Button>
            </>
          )}
          {canWrite && validation && status === 'approved_internal' && (
            <Button size="sm" variant="outline" onClick={() => setConfirmDialog('supersede')}>
              Superseder
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === 'approve' && 'Aprobar internamente'}
              {confirmDialog === 'reject' && 'Rechazar validación'}
              {confirmDialog === 'supersede' && 'Superseder validación'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              confirmDialog === 'approve'
                ? 'Notas (opcional)'
                : confirmDialog === 'reject'
                  ? 'Motivo del rechazo (mínimo 10 caracteres)'
                  : 'Razón para superseder (mínimo 5 caracteres)'
            }
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmDialog(null); setNotes(''); }}>
              Cancelar
            </Button>
            <Button
              disabled={
                (confirmDialog === 'reject' && notes.trim().length < 10) ||
                (confirmDialog === 'supersede' && notes.trim().length < 5)
              }
              onClick={async () => {
                if (!validation) return;
                const validationId = validation.id as string;
                let res;
                if (confirmDialog === 'approve') {
                  res = await actions.approve({ validationId, notes: notes.trim() || undefined });
                  await handleResult(res, 'Aprobada internamente');
                } else if (confirmDialog === 'reject') {
                  res = await actions.reject({ validationId, notes: notes.trim() });
                  await handleResult(res, 'Validación rechazada');
                } else if (confirmDialog === 'supersede') {
                  res = await actions.supersede({ validationId, reason: notes.trim() });
                  await handleResult(res, 'Validación superseded');
                }
                setConfirmDialog(null);
                setNotes('');
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CollectiveAgreementValidationPanel;