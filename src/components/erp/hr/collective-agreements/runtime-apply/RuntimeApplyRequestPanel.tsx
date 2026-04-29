/**
 * B10D.4 — Internal management UI for runtime-apply requests of the
 * registry mapping (per scope: company / contract / employee).
 *
 * Hard rules (mirrored by static tests):
 *   - Permanent banner:
 *       "Activación interna del registry por scope —
 *        el bridge sigue desactivado globalmente."
 *     and subtext referencing that the effective change in nómina
 *     requires a later phase B10E.
 *   - NO references to: useESPayrollBridge, registryShadowFlag,
 *     agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *     payslipEngine, agreementSafetyGate, operative table
 *     erp_hr_collective_agreements (without _registry).
 *   - NO direct .from(...).insert/.update/.upsert/.delete; all writes
 *     go through the edge function via the actions hook.
 *   - NO forbidden CTAs (see FORBIDDEN_CTA_STRINGS).
 *   - NO ready_for_payroll mutations.
 *   - Activating here does NOT execute payroll. Effective bridge
 *     integration is reserved for B10E.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  useCompanyAgreementRuntimeApplyActions,
  type ListPayload,
} from '@/hooks/erp/hr/useCompanyAgreementRuntimeApplyActions';

import {
  RuntimeApplyStatusBadge,
  type RuntimeApplyStatus,
} from './RuntimeApplyStatusBadge';
import {
  RuntimeApplyHistoryList,
  type RuntimeApplyHistoryEntry,
} from './RuntimeApplyHistoryList';
import {
  RuntimeApplyInvariantsCard,
  type RuntimeApplyInvariantsState,
} from './RuntimeApplyInvariantsCard';
import { RuntimeApplyComparisonReportCard } from './RuntimeApplyComparisonReportCard';
import { RuntimeApplyImpactPreviewCard } from './RuntimeApplyImpactPreviewCard';
import { RuntimeApplySecondApprovalDialog } from './RuntimeApplySecondApprovalDialog';
import {
  RuntimeRollbackDialog,
  type RuntimeRollbackDialogKind,
} from './RuntimeRollbackDialog';

export interface RuntimeApplyRequestRecord extends RuntimeApplyHistoryEntry {
  comparison_report_json?: Record<string, unknown> | null;
  payroll_impact_preview_json?: Record<string, unknown> | null;
  invariants_snapshot?: RuntimeApplyInvariantsState | null;
}

export interface RuntimeApplyRequestPanelProps {
  companyId: string;
  canManage?: boolean;
  initialRequests?: RuntimeApplyRequestRecord[];
}

/**
 * Forbidden UI strings. Static tests enforce this list against the
 * source files in this directory.
 */
export const FORBIDDEN_CTA_STRINGS = [
  'Aplicar en nómina ya',
  'Activar payroll global',
  'Activar flag global',
  'Cambiar nómina ahora',
  'Usar registry en nómina ahora',
  'Ejecutar nómina con registry',
  'Activar nómina registry',
] as const;

export function RuntimeApplyRequestPanel({
  companyId,
  canManage = false,
  initialRequests = [],
}: RuntimeApplyRequestPanelProps) {
  const actions = useCompanyAgreementRuntimeApplyActions();

  const [requests, setRequests] = useState<RuntimeApplyRequestRecord[]>(initialRequests);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRequests[0]?.id ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [secondApprovalOpen, setSecondApprovalOpen] = useState(false);
  const [rollbackKind, setRollbackKind] = useState<RuntimeRollbackDialogKind | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const payload: ListPayload = { companyId };
    const res = await actions.list<RuntimeApplyRequestRecord[]>(payload);
    setIsLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setAuthRequired(false);
      setRequests(res.data);
      if (!res.data.find((r) => r.id === selectedId)) {
        setSelectedId(res.data[0]?.id ?? null);
      }
    } else if (res.success === false) {
      if (res.error.code === 'AUTH_REQUIRED' || res.error.code === 'UNAUTHORIZED') {
        setAuthRequired(true);
      } else {
        setAuthRequired(false);
        toast.error(res.error.message);
      }
    }
  }, [actions, companyId, selectedId]);

  useEffect(() => {
    if (initialRequests.length === 0) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleSubmitForSecondApproval = useCallback(async () => {
    if (!selected) return;
    const res = await actions.submitForSecondApproval({
      requestId: selected.id,
      companyId,
    });
    if (res.success) {
      toast.success('Enviado a 2ª aprobación');
      await refresh();
    } else if (res.success === false) {
      toast.error(res.error.message);
    }
  }, [actions, selected, companyId, refresh]);

  const handleSecondApprove = useCallback(
    async (input: {
      acknowledgements: {
        understands_runtime_enable: true;
        reviewed_comparison_report: true;
        reviewed_payroll_impact: true;
        confirms_rollback_available: true;
      };
    }) => {
      if (!selected) return;
      const res = await actions.secondApprove({
        requestId: selected.id,
        companyId,
        acknowledgements: input.acknowledgements,
      });
      if (res.success) {
        toast.success('2ª aprobación registrada');
        setSecondApprovalOpen(false);
        await refresh();
      } else if (res.success === false) {
        toast.error(res.error.message);
      }
    },
    [actions, selected, companyId, refresh],
  );

  const handleActivate = useCallback(async () => {
    if (!selected) return;
    const res = await actions.activate({
      requestId: selected.id,
      companyId,
    });
    if (res.success) {
      toast.success('Scope activado (sin tocar nómina)');
      await refresh();
    } else if (res.success === false) {
      toast.error(res.error.message);
    }
  }, [actions, selected, companyId, refresh]);

  const handleRollbackOrReject = useCallback(
    async (input: { reason: string }) => {
      if (!selected || !rollbackKind) return;
      const res =
        rollbackKind === 'rollback'
          ? await actions.rollback({
              requestId: selected.id,
              companyId,
              reason: input.reason,
            })
          : await actions.reject({
              requestId: selected.id,
              companyId,
              reason: input.reason,
            });
      if (res.success) {
        toast.success(rollbackKind === 'rollback' ? 'Rollback registrado' : 'Rechazo registrado');
        setRollbackKind(null);
        await refresh();
      } else if (res.success === false) {
        toast.error(res.error.message);
      }
    },
    [actions, selected, companyId, rollbackKind, refresh],
  );

  const status: RuntimeApplyStatus | undefined = selected?.request_status;

  // Action gating
  const canSubmit = canManage && status === 'draft' && !actions.isPending;
  const canSecondApprove =
    canManage && status === 'pending_second_approval' && !actions.isPending;
  const canActivate =
    canManage && status === 'approved_for_runtime' && !actions.isPending;
  const canRollback = canManage && status === 'activated' && !actions.isPending;
  const canReject =
    canManage &&
    (status === 'draft' || status === 'pending_second_approval') &&
    !actions.isPending;

  return (
    <div className="space-y-3" data-testid="runtime-apply-panel">
      {/* Mandatory permanent banner */}
      <div
        data-testid="runtime-apply-banner"
        className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-2"
      >
        <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Activación interna del registry por scope — el bridge sigue desactivado globalmente.
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            Activar aquí registra el scope como elegible para registry en
            payroll runtime, pero el cambio efectivo en nómina requiere
            una fase posterior B10E.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              Runtime apply requests del scope
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refresh()}
                disabled={isLoading || actions.isPending}
                data-testid="runtime-apply-refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refrescar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RuntimeApplyHistoryList
            entries={requests}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selected && (
            <div className="space-y-3" data-testid="runtime-apply-detail">
              <div className="flex items-center gap-2 flex-wrap">
                <RuntimeApplyStatusBadge status={selected.request_status} />
                <span className="text-xs text-muted-foreground">
                  Mapping:{' '}
                  <span className="font-mono">{selected.mapping_id.slice(0, 8)}</span>
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <RuntimeApplyInvariantsCard
                  invariants={selected.invariants_snapshot ?? undefined}
                />
                <RuntimeApplyComparisonReportCard
                  report={selected.comparison_report_json ?? undefined}
                  criticalDiffsCount={selected.comparison_critical_diffs_count ?? 0}
                />
              </div>

              <RuntimeApplyImpactPreviewCard
                impact={selected.payroll_impact_preview_json ?? undefined}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="runtime-apply-submit"
                  disabled={!canSubmit}
                  onClick={() => void handleSubmitForSecondApproval()}
                >
                  Enviar a 2ª aprobación
                </Button>
                <Button
                  size="sm"
                  data-testid="runtime-apply-open-second-approve"
                  disabled={!canSecondApprove}
                  onClick={() => setSecondApprovalOpen(true)}
                >
                  2ª aprobación
                </Button>
                <Button
                  size="sm"
                  data-testid="runtime-apply-activate"
                  disabled={!canActivate}
                  onClick={() => void handleActivate()}
                  title="Activa scope para registry — no toca nómina"
                >
                  Activar scope
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  data-testid="runtime-apply-open-rollback"
                  disabled={!canRollback}
                  onClick={() => setRollbackKind('rollback')}
                >
                  Revertir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="runtime-apply-open-reject"
                  disabled={!canReject}
                  onClick={() => setRollbackKind('reject')}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {secondApprovalOpen && (
        <RuntimeApplySecondApprovalDialog
          open
          onOpenChange={(v) => !v && setSecondApprovalOpen(false)}
          isPending={actions.isPending}
          onConfirm={handleSecondApprove}
        />
      )}

      {rollbackKind && (
        <RuntimeRollbackDialog
          open
          onOpenChange={(v) => !v && setRollbackKind(null)}
          kind={rollbackKind}
          isPending={actions.isPending}
          onConfirm={handleRollbackOrReject}
        />
      )}
    </div>
  );
}

export default RuntimeApplyRequestPanel;