/**
 * B10D.4 — Action hook for the internal runtime-apply UI.
 *
 * ALL writes/reads are routed through the admin-gated edge function
 * `erp-hr-company-agreement-runtime-apply` (B10D.3) which wraps the
 * pure service B10D.2 over the schema B10D.1.
 *
 * This hook NEVER:
 *   - calls .from(...).insert/.update/.upsert/.delete on apply tables
 *   - uses service_role
 *   - touches useESPayrollBridge / registryShadowFlag / payroll engines
 *   - sends forbidden flags in the payload (FORBIDDEN_PAYLOAD_KEYS)
 *
 * Activating a request here registers the scope as eligible for the
 * registry in payroll runtime, but the effective change in nómina
 * requires a later phase B10E.
 */

import { useCallback, useState } from 'react';
import { authSafeInvoke } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-company-agreement-runtime-apply';

export const FORBIDDEN_PAYLOAD_KEYS = [
  'second_approved_by',
  'second_approved_at',
  'is_current',
  'activation_run_id',
  'rollback_run_id',
  'request_status',
  'use_registry_for_payroll',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
  'signature_hash',
  'run_signature_hash',
  'executed_by',
  'executed_at',
  'activated_by',
  'activated_at',
  'requested_by',
  'requested_at',
  'comparison_critical_diffs_count',
] as const;

export type RuntimeApplyActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type RuntimeRequestStatus =
  | 'draft'
  | 'pending_second_approval'
  | 'approved_for_runtime'
  | 'activated'
  | 'rejected'
  | 'rolled_back'
  | 'superseded';

export interface CreateRequestPayload {
  mappingId: string;
  companyId: string;
  comparisonReportJson: Record<string, unknown>;
  comparisonCriticalDiffsCount: number;
  payrollImpactPreviewJson?: Record<string, unknown>;
}

export interface SubmitForSecondApprovalPayload {
  requestId: string;
  companyId: string;
}

export interface SecondApproveAcknowledgements {
  understands_runtime_enable: true;
  reviewed_comparison_report: true;
  reviewed_payroll_impact: true;
  confirms_rollback_available: true;
}

export interface SecondApprovePayload {
  requestId: string;
  companyId: string;
  acknowledgements: SecondApproveAcknowledgements;
}

export interface RejectPayload {
  requestId: string;
  companyId: string;
  reason: string;
}

export interface ActivatePayload {
  requestId: string;
  companyId: string;
}

export interface RollbackPayload {
  requestId: string;
  companyId: string;
  reason: string;
}

export interface ListPayload {
  companyId: string;
  mappingId?: string;
  requestStatus?: RuntimeRequestStatus;
}

function sanitize<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if ((FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

async function invoke<T = unknown>(
  action: string,
  payload: Record<string, unknown>,
): Promise<RuntimeApplyActionResult<T>> {
  const body = { action, ...sanitize(payload) };
  const r = await authSafeInvoke<T>(EDGE_FN, body);
  if (r.success === true) return { success: true, data: r.data };
  return { success: false, error: r.error };
}

export function useCompanyAgreementRuntimeApplyActions() {
  const [isPending, setIsPending] = useState(false);

  const wrap = useCallback(
    async <T,>(fn: () => Promise<RuntimeApplyActionResult<T>>) => {
      setIsPending(true);
      try {
        return await fn();
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  const createRequest = useCallback(
    (p: CreateRequestPayload) =>
      wrap(() => invoke('create_request', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const submitForSecondApproval = useCallback(
    (p: SubmitForSecondApprovalPayload) =>
      wrap(() =>
        invoke('submit_for_second_approval', p as unknown as Record<string, unknown>),
      ),
    [wrap],
  );
  const secondApprove = useCallback(
    (p: SecondApprovePayload) =>
      wrap(() => invoke('second_approve', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const reject = useCallback(
    (p: RejectPayload) =>
      wrap(() => invoke('reject', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const activate = useCallback(
    (p: ActivatePayload) =>
      wrap(() => invoke('activate', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const rollback = useCallback(
    (p: RollbackPayload) =>
      wrap(() => invoke('rollback', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const list = useCallback(
    <T = unknown>(p: ListPayload) =>
      wrap<T>(() => invoke<T>('list', p as unknown as Record<string, unknown>)),
    [wrap],
  );

  return {
    isPending,
    createRequest,
    submitForSecondApproval,
    secondApprove,
    reject,
    activate,
    rollback,
    list,
  };
}

export default useCompanyAgreementRuntimeApplyActions;