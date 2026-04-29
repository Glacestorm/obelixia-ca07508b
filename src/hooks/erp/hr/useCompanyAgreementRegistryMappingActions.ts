/**
 * B10C.2B.2C — Action hook for the internal mapping management UI.
 *
 * ALL writes/reads are routed through the admin-gated edge function
 * `erp-hr-company-agreement-registry-mapping` (B10C.2B.2B).
 *
 * This hook NEVER:
 *   - calls .from(...).insert/.update/.upsert/.delete on mapping tables
 *   - uses service_role
 *   - touches useESPayrollBridge / registryShadowFlag
 *   - sends forbidden flags in the payload
 *     (approved_by, approved_at, is_current, ready_for_payroll,
 *      requires_human_review, data_completeness, salary_tables_loaded,
 *      source_quality, HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL,
 *      persisted_priority_apply, C3B3C2)
 *
 * Approving a mapping here does NOT execute payroll with that
 * agreement. Real activation is reserved for B10D.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EDGE_FN = 'erp-hr-company-agreement-registry-mapping';

export const FORBIDDEN_PAYLOAD_KEYS = [
  'approved_by',
  'approved_at',
  'is_current',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
  'validation_status',
  'signature_hash',
] as const;

export type MappingActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type MappingSourceType =
  | 'manual'
  | 'cnae_suggestion'
  | 'previous_assignment'
  | 'imported';

export interface CreateDraftPayload {
  companyId: string;
  employeeId?: string;
  contractId?: string;
  registryAgreementId: string;
  registryVersionId: string;
  sourceType: MappingSourceType;
  confidenceScore?: number;
  rationaleJson?: Record<string, unknown>;
  evidenceUrls?: string[];
}

export interface SubmitForReviewPayload {
  mappingId: string;
  companyId: string;
}

export interface ApprovePayload {
  mappingId: string;
  companyId: string;
  humanConfirmed?: boolean;
}

export interface RejectPayload {
  mappingId: string;
  companyId: string;
  reason: string;
}

export interface SupersedePayload {
  mappingId: string;
  companyId: string;
  reason: string;
}

export interface ListPayload {
  companyId: string;
  employeeId?: string;
  contractId?: string;
  mappingStatus?:
    | 'draft'
    | 'pending_review'
    | 'approved_internal'
    | 'rejected'
    | 'superseded';
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
): Promise<MappingActionResult<T>> {
  const body = { action, ...sanitize(payload) };

  // Forward a fresh Bearer token. If the first call returns UNAUTHORIZED,
  // refresh the session once and retry — recovers from stale in-memory
  // tokens after a previous refresh-token failure / re-login.
  const callOnce = async (forceRefresh: boolean) => {
    if (forceRefresh) {
      try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return { ok: false, unauthorized: true, data: undefined as unknown, errMsg: 'No active session.' };
    }
    const { data, error } = await supabase.functions.invoke(EDGE_FN, {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const respObj = (data ?? {}) as { success?: boolean; error?: { code?: string; message?: string } };
    const isUnauthorized =
      respObj?.error?.code === 'UNAUTHORIZED' ||
      /invalid token|unauthorized/i.test(error?.message ?? '') ||
      /invalid token|unauthorized/i.test(respObj?.error?.message ?? '');
    return { ok: !error && respObj?.success === true, unauthorized: isUnauthorized, data, errMsg: error?.message };
  };

  let result = await callOnce(false);
  if (!result.ok && result.unauthorized) {
    result = await callOnce(true);
  }
  if (result.errMsg && !result.data) {
    return {
      success: false,
      error: { code: 'EDGE_INVOKE_ERROR', message: result.errMsg },
    };
  }
  const resp = (result.data ?? {}) as {
    success?: boolean;
    data?: T;
    error?: { code: string; message: string };
  };
  if (resp.success) return { success: true, data: resp.data as T };
  return {
    success: false,
    error: resp.error ?? { code: 'UNKNOWN', message: 'Unknown response' },
  };
}

export function useCompanyAgreementRegistryMappingActions() {
  const [isPending, setIsPending] = useState(false);

  const wrap = useCallback(
    async <T,>(fn: () => Promise<MappingActionResult<T>>) => {
      setIsPending(true);
      try {
        return await fn();
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  const createDraft = useCallback(
    (p: CreateDraftPayload) => wrap(() => invoke('create_draft', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const submitForReview = useCallback(
    (p: SubmitForReviewPayload) => wrap(() => invoke('submit_for_review', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const approve = useCallback(
    (p: ApprovePayload) => wrap(() => invoke('approve', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const reject = useCallback(
    (p: RejectPayload) => wrap(() => invoke('reject', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const supersede = useCallback(
    (p: SupersedePayload) => wrap(() => invoke('supersede', p as unknown as Record<string, unknown>)),
    [wrap],
  );
  const list = useCallback(
    <T = unknown>(p: ListPayload) => wrap<T>(() => invoke<T>('list', p as unknown as Record<string, unknown>)),
    [wrap],
  );

  return { isPending, createDraft, submitForReview, approve, reject, supersede, list };
}

export default useCompanyAgreementRegistryMappingActions;