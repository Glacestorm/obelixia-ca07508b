import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Lock, FileSearch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import {
  useTicNacSalaryTableStaging,
  type StagingRowSummary,
} from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { useTicNacSalaryTableStagingActions } from '@/hooks/erp/hr/useTicNacSalaryTableStagingActions';
import { useAuth } from '@/hooks/useAuth';

import { StagingRowsTable, type StagingRowAction } from './StagingRowsTable';
import { OcrRowsTable } from './OcrRowsTable';
import { ManualRowsTable } from './ManualRowsTable';
import { StagingRowDetailDrawer } from './StagingRowDetailDrawer';
import { StagingRowEditForm } from './StagingRowEditForm';
import { StagingApprovalDialog, type ApprovalAction } from './StagingApprovalDialog';
import { StagingReasonDialog } from './StagingReasonDialog';
import { StagingAuditTrail } from './StagingAuditTrail';
import { OcrVsManualComparator } from './OcrVsManualComparator';

export interface TicNacSalaryTableReviewPanelProps {
  agreementId: string;
  versionId: string;
}

const COUNT_KEYS = [
  'ocr_pending_review',
  'manual_pending_review',
  'human_approved_single',
  'human_approved_first',
  'human_approved_second',
  'needs_correction',
  'rejected',
] as const;

export function TicNacSalaryTableReviewPanel({
  agreementId,
  versionId,
}: TicNacSalaryTableReviewPanelProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { rows, audit, isLoading, error, authRequired, refresh } =
    useTicNacSalaryTableStaging({ agreementId, versionId });

  const actions = useTicNacSalaryTableStagingActions();

  const [tab, setTab] = useState<string>('all');
  const [detailRow, setDetailRow] = useState<StagingRowSummary | null>(null);
  const [editRow, setEditRow] = useState<StagingRowSummary | null>(null);
  const [approvalRow, setApprovalRow] = useState<StagingRowSummary | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>('approve_single');
  const [rejectRow, setRejectRow] = useState<StagingRowSummary | null>(null);
  const [needsRow, setNeedsRow] = useState<StagingRowSummary | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    for (const k of COUNT_KEYS) c[k] = 0;
    for (const r of rows) {
      if (r.validation_status in c) c[r.validation_status] += 1;
    }
    return c;
  }, [rows]);

  const pendingRows = rows.filter(
    (r) =>
      r.validation_status === 'ocr_pending_review' ||
      r.validation_status === 'manual_pending_review' ||
      r.validation_status === 'needs_correction' ||
      r.validation_status === 'human_approved_first',
  );
  const approvedRows = rows.filter(
    (r) =>
      r.validation_status === 'human_approved_single' ||
      r.validation_status === 'human_approved_second',
  );
  const rejectedRows = rows.filter((r) => r.validation_status === 'rejected');

  const handleAction = (action: StagingRowAction, row: StagingRowSummary) => {
    switch (action) {
      case 'view':
        setDetailRow(row);
        return;
      case 'edit':
        setEditRow(row);
        return;
      case 'approve_single':
      case 'approve_first':
      case 'approve_second':
        setApprovalAction(action);
        setApprovalRow(row);
        return;
      case 'reject':
        setRejectRow(row);
        return;
      case 'mark_needs_correction':
        setNeedsRow(row);
        return;
    }
  };

  const runApproval = async () => {
    if (!approvalRow) return;
    let res;
    if (approvalAction === 'approve_single') res = await actions.approveSingle(approvalRow.id);
    else if (approvalAction === 'approve_first') res = await actions.approveFirst(approvalRow.id);
    else res = await actions.approveSecond(approvalRow.id);
    if (res?.success) {
      toast.success('Aprobación registrada');
      setApprovalRow(null);
      void refresh();
    } else {
      toast.error(res?.error?.message ?? 'No se pudo aprobar');
    }
  };

  const runReject = async (reason: string) => {
    if (!rejectRow) return;
    const res = await actions.rejectRow(rejectRow.id, reason);
    if (res.success) {
      toast.success('Fila rechazada');
      setRejectRow(null);
      void refresh();
    } else {
      toast.error(res.error?.message ?? 'No se pudo rechazar');
    }
  };

  const runNeedsCorrection = async (reason: string) => {
    if (!needsRow) return;
    const res = await actions.markNeedsCorrection(needsRow.id, reason);
    if (res.success) {
      toast.success('Marcada como necesita corrección');
      setNeedsRow(null);
      void refresh();
    } else {
      toast.error(res.error?.message ?? 'No se pudo marcar');
    }
  };

  const runEditSave = async (patch: Record<string, unknown>) => {
    if (!editRow) return;
    const res = await actions.editRow({ rowId: editRow.id, patch: patch as any });
    if (res.success) {
      toast.success('Propuesta guardada');
      setEditRow(null);
      void refresh();
    } else {
      toast.error(res.error?.message ?? 'No se pudo guardar');
    }
  };

  return (
    <div className="space-y-4" data-testid="tic-nac-staging-review-panel">
      {/* Permanent staging banner */}
      <div
        role="alert"
        data-testid="staging-banner"
        className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-amber-900 dark:text-amber-200">
          Validación staging — no activa nómina ni marca el convenio como listo.
        </p>
      </div>

      {authRequired ? (
        <Card data-testid="staging-auth-required">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            Requiere sesión autenticada para revisar el staging del convenio.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="h-4 w-4" />
                TIC-NAC · Revisión humana de tablas salariales (staging)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Solo lectura/revisión. No escribe en tablas salariales reales ni en
                payroll.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* counters */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Total: {counts.total}</Badge>
              {COUNT_KEYS.map((k) => (
                <Badge key={k} variant="outline" data-testid={`staging-count-${k}`}>
                  {k}: {counts[k] ?? 0}
                </Badge>
              ))}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {error.message}
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="ocr">OCR</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="approved">Aprobadas</TabsTrigger>
                <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
                <TabsTrigger value="audit">Auditoría</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="pt-3">
                <StagingRowsTable rows={rows} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="ocr" className="pt-3 space-y-3">
                <OcrRowsTable rows={rows} onAction={handleAction} />
                <OcrVsManualComparator rows={rows} />
              </TabsContent>
              <TabsContent value="manual" className="pt-3">
                <ManualRowsTable rows={rows} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="pending" className="pt-3">
                <StagingRowsTable
                  rows={pendingRows}
                  onAction={handleAction}
                  emptyLabel="No hay filas pendientes."
                />
              </TabsContent>
              <TabsContent value="approved" className="pt-3">
                <StagingRowsTable
                  rows={approvedRows}
                  onAction={handleAction}
                  emptyLabel="No hay filas aprobadas todavía."
                />
              </TabsContent>
              <TabsContent value="rejected" className="pt-3">
                <StagingRowsTable
                  rows={rejectedRows}
                  onAction={handleAction}
                  emptyLabel="No hay filas rechazadas."
                />
              </TabsContent>
              <TabsContent value="audit" className="pt-3">
                <StagingAuditTrail entries={audit} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <StagingRowDetailDrawer
        open={!!detailRow}
        onOpenChange={(o) => !o && setDetailRow(null)}
        row={detailRow}
        audit={audit}
      />

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar propuesta de fila staging</DialogTitle>
          </DialogHeader>
          {editRow && (
            <StagingRowEditForm
              row={editRow}
              isPending={actions.isPending}
              onCancel={() => setEditRow(null)}
              onSubmit={(p) => void runEditSave(p)}
            />
          )}
        </DialogContent>
      </Dialog>

      <StagingApprovalDialog
        open={!!approvalRow}
        onOpenChange={(o) => !o && setApprovalRow(null)}
        row={approvalRow}
        action={approvalAction}
        currentUserId={currentUserId}
        isPending={actions.isPending}
        onConfirm={() => void runApproval()}
      />

      <StagingReasonDialog
        open={!!rejectRow}
        onOpenChange={(o) => !o && setRejectRow(null)}
        title="Rechazar fila staging"
        description="Indica el motivo del rechazo. Quedará registrado en la auditoría."
        isPending={actions.isPending}
        onConfirm={(r) => void runReject(r)}
      />

      <StagingReasonDialog
        open={!!needsRow}
        onOpenChange={(o) => !o && setNeedsRow(null)}
        title="Marcar fila como 'necesita corrección'"
        description="Indica qué hay que corregir antes de poder aprobar."
        isPending={actions.isPending}
        onConfirm={(r) => void runNeedsCorrection(r)}
      />
    </div>
  );
}

export default TicNacSalaryTableReviewPanel;