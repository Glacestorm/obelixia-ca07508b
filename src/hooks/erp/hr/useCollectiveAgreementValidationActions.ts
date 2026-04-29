/**
 * B8A.3 — Write actions hook. ALL writes are routed through the
 * admin-gated edge function `erp-hr-collective-agreement-validation`
 * (B8A.2). This hook NEVER:
 *   - calls .from(...).insert/.update/.upsert/.delete on validation tables
 *   - uses service_role
 *   - includes forbidden flags in the payload
 *     (ready_for_payroll, data_completeness, salary_tables_loaded,
 *      requires_human_review, official_submission_blocked,
 *      validation_status, signature_hash, validated_at, is_current)
 */

import { useCallback, useState } from 'react';
import { authSafeInvoke } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-collective-agreement-validation';

export type ValidationActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface CreateDraftPayload {
  agreementId: string;
  versionId: string;
  sourceId: string;
  validationScope: Array<'metadata' | 'salary_tables' | 'rules' | 'full_payroll_readiness'>;
  triggeredByImportRunId?: string;
}

export interface UpdateChecklistItemPayload {
  validationId: string;
  itemKey: string;
  itemStatus: 'pending' | 'verified' | 'accepted_with_caveat' | 'rejected' | 'not_applicable';
  comment?: string;
  evidenceUrl?: string;
  evidenceExcerpt?: string;
}

export interface SubmitForReviewPayload {
  validationId: string;
}

export interface ApprovePayload {
  validationId: string;
  notes?: string;
}

export interface RejectPayload {
  validationId: string;
  notes: string;
}

export interface SupersedePayload {
  validationId: string;
  reason: string;
}

async function invoke(action: string, payload: object) {
  const r = await authSafeInvoke<unknown>(EDGE_FN, { action, ...(payload as Record<string, unknown>) });
  if (r.success) return { success: true as const, data: r.data };
  return { success: false as const, error: r.error };
}

export function useCollectiveAgreementValidationActions() {
  const [isPending, setIsPending] = useState(false);

  const createDraft = useCallback(async (p: CreateDraftPayload) => {
    setIsPending(true);
    try {
      return await invoke('create_draft', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  const updateChecklistItem = useCallback(async (p: UpdateChecklistItemPayload) => {
    setIsPending(true);
    try {
      return await invoke('update_checklist_item', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  const submitForReview = useCallback(async (p: SubmitForReviewPayload) => {
    setIsPending(true);
    try {
      return await invoke('submit_for_review', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  const approve = useCallback(async (p: ApprovePayload) => {
    setIsPending(true);
    try {
      return await invoke('approve', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  const reject = useCallback(async (p: RejectPayload) => {
    setIsPending(true);
    try {
      return await invoke('reject', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  const supersede = useCallback(async (p: SupersedePayload) => {
    setIsPending(true);
    try {
      return await invoke('supersede', p);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { isPending, createDraft, updateChecklistItem, submitForReview, approve, reject, supersede };
}

export default useCollectiveAgreementValidationActions;