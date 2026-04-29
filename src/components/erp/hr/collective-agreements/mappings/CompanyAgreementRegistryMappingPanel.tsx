/**
 * B10C.2B.2C — Internal management UI for company/contract/employee →
 * registry agreement mappings.
 *
 * Hard rules (mirrored by static tests):
 *   - Permanent banner: "Mapping interno — no activa nómina."
 *   - NO references to: useESPayrollBridge, registryShadowFlag,
 *     agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *     payslipEngine, operative table erp_hr_collective_agreements
 *     (without _registry).
 *   - NO direct .from(...).insert/.update/.upsert/.delete; all writes
 *     go through the edge function via the actions hook.
 *   - NO forbidden CTAs (see FORBIDDEN_CTA_STRINGS).
 *   - NO ready_for_payroll mutations.
 *   - Approving here does NOT execute payroll. Real activation = B10D.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  useCompanyAgreementRegistryMappingActions,
  type ListPayload,
} from '@/hooks/erp/hr/useCompanyAgreementRegistryMappingActions';

import {
  MappingStatusBadge,
  type MappingStatus,
} from './MappingStatusBadge';
import { MappingRationaleCard } from './MappingRationaleCard';
import {
  MappingHistoryList,
  type MappingHistoryEntry,
} from './MappingHistoryList';
import {
  MappingActionDialog,
  type MappingActionKind,
} from './MappingActionDialog';

export interface MappingRecord extends MappingHistoryEntry {
  rationale_json?: Record<string, unknown> | null;
  evidence_urls?: string[] | null;
  confidence_score?: number | null;
}

export interface CompanyAgreementRegistryMappingPanelProps {
  companyId: string;
  employeeId?: string;
  contractId?: string;
  canManage?: boolean;
  initialMappings?: MappingRecord[];
}

/**
 * The UI must not render any of these strings. Static tests enforce
 * this list against the source files in this directory.
 */
export const FORBIDDEN_CTA_STRINGS = [
  'Aplicar en nómina',
  'Activar payroll',
  'Usar en nómina',
  'Cambiar nómina',
  'Activar flag',
  'Activar para nómina',
  'ready_for_payroll',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
] as const;

function extractBlockers(rationale?: Record<string, unknown> | null): string[] {
  const blockers = (rationale?.blockers ?? rationale?.blockers_list) as
    | unknown
    | undefined;
  if (Array.isArray(blockers)) return blockers.map((b) => String(b));
  return [];
}

function extractWarnings(rationale?: Record<string, unknown> | null): string[] {
  const warnings = (rationale?.warnings ?? rationale?.warnings_list) as
    | unknown
    | undefined;
  if (Array.isArray(warnings)) return warnings.map((w) => String(w));
  return [];
}

export function CompanyAgreementRegistryMappingPanel({
  companyId,
  employeeId,
  contractId,
  canManage = false,
  initialMappings = [],
}: CompanyAgreementRegistryMappingPanelProps) {
  const actions = useCompanyAgreementRegistryMappingActions();

  const [mappings, setMappings] = useState<MappingRecord[]>(initialMappings);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMappings[0]?.id ?? null,
  );
  const [dialogAction, setDialogAction] = useState<MappingActionKind | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const selected = useMemo(
    () => mappings.find((m) => m.id === selectedId) ?? null,
    [mappings, selectedId],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const payload: ListPayload = { companyId, employeeId, contractId };
    const res = await actions.list<MappingRecord[]>(payload);
    setIsLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setAuthRequired(false);
      setMappings(res.data);
      if (!res.data.find((m) => m.id === selectedId)) {
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
  }, [actions, companyId, employeeId, contractId, selectedId]);

  useEffect(() => {
    if (initialMappings.length === 0) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, employeeId, contractId]);

  const handleAction = useCallback(
    async (input: { reason?: string; humanConfirmed?: boolean }) => {
      if (!selected || !dialogAction) return;
      let res;
      if (dialogAction === 'approve') {
        res = await actions.approve({
          mappingId: selected.id,
          companyId,
          humanConfirmed: input.humanConfirmed,
        });
      } else if (dialogAction === 'reject') {
        res = await actions.reject({
          mappingId: selected.id,
          companyId,
          reason: input.reason ?? '',
        });
      } else {
        res = await actions.supersede({
          mappingId: selected.id,
          companyId,
          reason: input.reason ?? '',
        });
      }
      if (res.success) {
        toast.success('Operación interna completada');
        setDialogAction(null);
        await refresh();
      } else if (res.success === false) {
        toast.error(res.error.message);
      }
    },
    [actions, selected, dialogAction, companyId, refresh],
  );

  const handleSubmitForReview = useCallback(async () => {
    if (!selected) return;
    const res = await actions.submitForReview({
      mappingId: selected.id,
      companyId,
    });
    if (res.success) {
      toast.success('Enviado a revisión');
      await refresh();
    } else if (res.success === false) {
      toast.error(res.error.message);
    }
  }, [actions, selected, companyId, refresh]);

  const blockers = extractBlockers(selected?.rationale_json);
  const warnings = extractWarnings(selected?.rationale_json);
  const hasBlockers = blockers.length > 0;

  const status: MappingStatus | undefined = selected?.mapping_status;

  // Action gating
  const canSubmit =
    canManage && status === 'draft' && !actions.isPending;
  const canApprove =
    canManage && status === 'pending_review' && !actions.isPending;
  const canReject =
    canManage &&
    (status === 'draft' || status === 'pending_review') &&
    !actions.isPending;
  const canSupersede =
    canManage &&
    (status === 'approved_internal' || status === 'pending_review') &&
    !actions.isPending;

  return (
    <div className="space-y-3" data-testid="company-agreement-registry-mapping-panel">
      {/* Mandatory permanent banner */}
      <div
        data-testid="mapping-internal-banner"
        className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-2"
      >
        <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Mapping interno — no activa nómina.
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            Aprobar un mapping aquí no ejecuta nómina con ese convenio. La
            activación real requiere una fase posterior.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              Mappings convenio del Registro
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refresh()}
                disabled={isLoading || actions.isPending}
                data-testid="mapping-refresh"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refrescar
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="mapping-create-draft"
                  disabled
                  title="La creación de borradores se realiza desde el flujo de selección de candidatos"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo borrador
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <MappingHistoryList entries={mappings} />

          {selected && (
            <div className="space-y-3" data-testid="mapping-detail">
              <div className="flex items-center gap-2 flex-wrap">
                <MappingStatusBadge status={selected.mapping_status} />
                {selected.confidence_score != null && (
                  <span className="text-xs text-muted-foreground">
                    Confianza:{' '}
                    <span className="font-mono">
                      {selected.confidence_score.toFixed(2)}
                    </span>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Origen: {selected.source_type}
                </span>
              </div>

              <MappingRationaleCard
                rationaleJson={selected.rationale_json ?? undefined}
                evidenceUrls={selected.evidence_urls ?? undefined}
                blockers={blockers}
                warnings={warnings}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="mapping-submit-for-review"
                  disabled={!canSubmit}
                  onClick={() => void handleSubmitForReview()}
                >
                  Enviar a revisión
                </Button>
                <Button
                  size="sm"
                  data-testid="mapping-open-approve"
                  disabled={!canApprove || hasBlockers}
                  onClick={() => setDialogAction('approve')}
                  title={
                    hasBlockers
                      ? 'Existen bloqueos pendientes en el rationale'
                      : undefined
                  }
                >
                  Aprobar interno
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  data-testid="mapping-open-reject"
                  disabled={!canReject}
                  onClick={() => setDialogAction('reject')}
                >
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="mapping-open-supersede"
                  disabled={!canSupersede}
                  onClick={() => setDialogAction('supersede')}
                >
                  Superar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {dialogAction && selected && (
        <MappingActionDialog
          open={true}
          onOpenChange={(v) => !v && setDialogAction(null)}
          action={dialogAction}
          sourceType={selected.source_type}
          hasBlockers={hasBlockers}
          isPending={actions.isPending}
          onConfirm={handleAction}
        />
      )}
    </div>
  );
}

export default CompanyAgreementRegistryMappingPanel;