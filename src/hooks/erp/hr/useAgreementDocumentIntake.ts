/**
 * B13.2 — Read + safe-action hook over the Document Intake queue.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-document-intake', ...)`
 *    via authSafeInvoke.
 *  - NEVER uses `.from(...).insert/.update/.delete/.upsert`.
 *  - NEVER uses any privileged service key.
 *  - Auth-safe: when no session token, returns `authRequired=true`
 *    with empty data, never throws.
 *  - No imports from the payroll bridge / payroll engine / payslip engine /
 *    salary normalizer / agreement salary resolver.
 *  - No imports from the operative `erp_hr_collective_agreements` table.
 */

import { useCallback, useEffect, useState } from 'react';
import { authSafeInvoke, isAuthRequiredResult } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-agreement-document-intake';

export type DocumentIntakeStatus =
  | 'pending_review'
  | 'claimed_for_review'
  | 'classified'
  | 'duplicate'
  | 'blocked'
  | 'ready_for_extraction'
  | 'dismissed';

export type DocumentIntakeSourceType =
  | 'boe'
  | 'regcon'
  | 'boletin_autonomico'
  | 'bop_provincial'
  | 'manual_official_url'
  | 'other_official';

export type DocumentIntakeClassification =
  | 'new_agreement'
  | 'salary_revision'
  | 'errata'
  | 'paritaria_act'
  | 'scope_clarification'
  | 'unknown';

export interface DocumentIntakeItem {
  id: string;
  watch_queue_id: string | null;
  source_type: DocumentIntakeSourceType;
  source_url: string;
  document_url: string | null;
  jurisdiction: string | null;
  territorial_scope: string | null;
  publication_date: string | null;
  document_hash: string | null;
  detected_agreement_name: string | null;
  detected_regcon: string | null;
  detected_cnae: string[] | null;
  detected_sector: string | null;
  confidence: number | null;
  status: DocumentIntakeStatus;
  classification: DocumentIntakeClassification | null;
  candidate_registry_agreement_id: string | null;
  candidate_registry_version_id: string | null;
  duplicate_of: string | null;
  human_reviewer: string | null;
  claimed_at: string | null;
  classified_by: string | null;
  classified_at: string | null;
  blocked_by: string | null;
  blocked_at: string | null;
  block_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseAgreementDocumentIntakeArgs {
  status?: DocumentIntakeStatus;
  source_type?: DocumentIntakeSourceType;
  classification?: DocumentIntakeClassification;
  candidate_registry_agreement_id?: string;
  date_from?: string;
  date_to?: string;
  text?: string;
  limit?: number;
}

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: { code: string; message: string } };

export interface UseAgreementDocumentIntakeResult {
  items: DocumentIntakeItem[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
  authRequired: boolean;
  refresh: () => Promise<void>;
  createFromWatchHit: (input: {
    watch_queue_id: string;
    source_type: DocumentIntakeSourceType;
    notes?: string;
  }) => Promise<ActionResult<{ item: DocumentIntakeItem }>>;
  claimForReview: (id: string) => Promise<ActionResult>;
  classify: (input: {
    id: string;
    classification: DocumentIntakeClassification;
    candidate_registry_agreement_id?: string | null;
    candidate_registry_version_id?: string | null;
    notes?: string | null;
  }) => Promise<ActionResult>;
  markDuplicate: (input: {
    id: string;
    duplicate_of: string;
    reason: string;
  }) => Promise<ActionResult>;
  markBlocked: (input: { id: string; reason: string }) => Promise<ActionResult>;
  promoteToExtraction: (id: string) => Promise<ActionResult>;
  dismiss: (input: { id: string; reason: string }) => Promise<ActionResult>;
}

function unauthorized(): { ok: false; error: { code: string; message: string } } {
  return {
    ok: false,
    error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
  };
}

export function useAgreementDocumentIntake(
  args: UseAgreementDocumentIntakeArgs = {},
): UseAgreementDocumentIntakeResult {
  const [items, setItems] = useState<DocumentIntakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const r = await authSafeInvoke<{ items: DocumentIntakeItem[] }>(EDGE_FN, {
      action: 'list',
      ...(args.status ? { status: args.status } : {}),
      ...(args.source_type ? { source_type: args.source_type } : {}),
      ...(args.classification ? { classification: args.classification } : {}),
      ...(args.candidate_registry_agreement_id
        ? { candidate_registry_agreement_id: args.candidate_registry_agreement_id }
        : {}),
      ...(args.date_from ? { date_from: args.date_from } : {}),
      ...(args.date_to ? { date_to: args.date_to } : {}),
      ...(args.text ? { text: args.text } : {}),
      ...(args.limit ? { limit: args.limit } : {}),
    });
    if (isAuthRequiredResult(r)) {
      setAuthRequired(true);
      setItems([]);
      setError(null);
    } else if (r.success) {
      setAuthRequired(false);
      setItems(r.data?.items ?? []);
    } else {
      const fail = r as { success: false; error: { code: string; message: string } };
      setAuthRequired(false);
      setItems([]);
      setError(fail.error);
    }
    setIsLoading(false);
  }, [
    args.status,
    args.source_type,
    args.classification,
    args.candidate_registry_agreement_id,
    args.date_from,
    args.date_to,
    args.text,
    args.limit,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const callAndRefresh = useCallback(
    async <T,>(payload: Record<string, unknown>): Promise<ActionResult<T>> => {
      const r = await authSafeInvoke<T>(EDGE_FN, payload);
      if (isAuthRequiredResult(r)) return unauthorized() as ActionResult<T>;
      if (r.success) {
        await refresh();
        return { ok: true, data: r.data } as ActionResult<T>;
      }
      const fail = r as { success: false; error: { code: string; message: string } };
      return { ok: false, error: fail.error };
    },
    [refresh],
  );

  const createFromWatchHit = useCallback(
    (input: { watch_queue_id: string; source_type: DocumentIntakeSourceType; notes?: string }) =>
      callAndRefresh<{ item: DocumentIntakeItem }>({
        action: 'create_from_watch_hit',
        ...input,
      }),
    [callAndRefresh],
  );

  const claimForReview = useCallback(
    async (id: string) => {
      const r = await callAndRefresh<unknown>({ action: 'claim_for_review', id });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const classify = useCallback(
    async (input: {
      id: string;
      classification: DocumentIntakeClassification;
      candidate_registry_agreement_id?: string | null;
      candidate_registry_version_id?: string | null;
      notes?: string | null;
    }) => {
      const r = await callAndRefresh<unknown>({ action: 'classify', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const markDuplicate = useCallback(
    async (input: { id: string; duplicate_of: string; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'Reason must be at least 5 characters' },
        };
      }
      const r = await callAndRefresh<unknown>({ action: 'mark_duplicate', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const markBlocked = useCallback(
    async (input: { id: string; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'Reason must be at least 5 characters' },
        };
      }
      const r = await callAndRefresh<unknown>({ action: 'mark_blocked', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const promoteToExtraction = useCallback(
    async (id: string) => {
      const r = await callAndRefresh<unknown>({ action: 'promote_to_extraction', id });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const dismiss = useCallback(
    async (input: { id: string; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'Reason must be at least 5 characters' },
        };
      }
      const r = await callAndRefresh<unknown>({ action: 'dismiss', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  return {
    items,
    isLoading,
    error,
    authRequired,
    refresh,
    createFromWatchHit,
    claimForReview,
    classify,
    markDuplicate,
    markBlocked,
    promoteToExtraction,
    dismiss,
  };
}

export default useAgreementDocumentIntake;