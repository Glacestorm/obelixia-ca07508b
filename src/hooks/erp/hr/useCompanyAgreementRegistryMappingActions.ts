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

  // Explicitly fetch a fresh access token from the current session and
  // forward it as Bearer. `functions.invoke()` can send a stale/missing
  // token if the SDK in-memory state is out of sync with storage,
  // producing a 401 UNAUTHORIZED "Invalid token" from the edge.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return {
      success: false,
      error: {
        code: 'NO_SESSION',
        message: 'No active session. Please sign in again.',
      },
    };
  }

  const { data, error } = await supabase.functions.invoke(EDGE_FN, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (error) {
    return {
      success: false,
      error: {
        code: 'EDGE_INVOKE_ERROR',
        message: error.message ?? 'Edge invocation failed',
      },
    };
  }
  const resp = (data ?? {}) as {
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