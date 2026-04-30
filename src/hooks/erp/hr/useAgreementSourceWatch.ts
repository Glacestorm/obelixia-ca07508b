/**
 * B13.1 — Read + safe-action hook over the Source Watcher queue.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-source-watcher', ...)`
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

const EDGE_FN = 'erp-hr-agreement-source-watcher';

export type SourceWatchStatus =
  | 'pending_intake'
  | 'duplicate_candidate'
  | 'official_source_found'
  | 'needs_human_classification'
  | 'blocked_no_source'
  | 'dismissed';

export type SourceWatchSource =
  | 'BOE' | 'REGCON' | 'BOIB' | 'BOCM' | 'DOGC' | 'DOGV' | 'BOJA'
  | 'BOPV' | 'DOG' | 'BOC' | 'BOR' | 'BON' | 'BOPA' | 'BOCYL'
  | 'DOE' | 'DOCM' | 'BOP' | 'MANUAL' | 'OTHER';

export interface SourceWatchHit {
  id: string;
  source: SourceWatchSource;
  source_url: string;
  document_url: string | null;
  jurisdiction: string | null;
  publication_date: string | null;
  document_hash: string | null;
  detected_agreement_name: string | null;
  detected_regcon: string | null;
  detected_cnae: string[] | null;
  confidence: number | null;
  status: SourceWatchStatus;
  notes: string | null;
  discovered_at: string;
  dismissed_by: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanNowResult {
  scanned: number;
  inserted: number;
  duplicates: number;
  adapters_status: 'WATCHER_ADAPTERS_PENDING' | 'WATCHER_ADAPTERS_READY';
  note?: string;
  timestamp: string;
}

export interface AddManualSourceInput {
  source: SourceWatchSource;
  source_url: string;
  document_url?: string | null;
  jurisdiction?: string | null;
  publication_date?: string | null;
  document_hash?: string | null;
  detected_agreement_name?: string | null;
  detected_regcon?: string | null;
  detected_cnae?: string[] | null;
  confidence?: number | null;
  notes?: string | null;
}

export interface UseAgreementSourceWatchArgs {
  status?: SourceWatchStatus;
  source?: SourceWatchSource;
  limit?: number;
}

export interface UseAgreementSourceWatchResult {
  hits: SourceWatchHit[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
  authRequired: boolean;
  refresh: () => Promise<void>;
  scanNow: () => Promise<
    | { ok: true; data: ScanNowResult }
    | { ok: false; error: { code: string; message: string } }
  >;
  dismissHit: (
    hitId: string,
    reason: string,
  ) => Promise<
    | { ok: true }
    | { ok: false; error: { code: string; message: string } }
  >;
  addManualSource: (
    input: AddManualSourceInput,
  ) => Promise<
    | { ok: true; hit: SourceWatchHit | { duplicate_race: true } }
    | { ok: false; error: { code: string; message: string } }
  >;
}

export function useAgreementSourceWatch(
  args: UseAgreementSourceWatchArgs = {},
): UseAgreementSourceWatchResult {
  const [hits, setHits] = useState<SourceWatchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const r = await authSafeInvoke<{ hits: SourceWatchHit[] }>(EDGE_FN, {
      action: 'list_hits',
      ...(args.status ? { status: args.status } : {}),
      ...(args.source ? { source: args.source } : {}),
      ...(args.limit ? { limit: args.limit } : {}),
    });
    if (isAuthRequiredResult(r)) {
      setAuthRequired(true);
      setHits([]);
      setError(null);
    } else if (r.success) {
      setAuthRequired(false);
      setHits(r.data?.hits ?? []);
    } else {
      const fail = r as { success: false; error: { code: string; message: string } };
      setAuthRequired(false);
      setHits([]);
      setError(fail.error);
    }
    setIsLoading(false);
  }, [args.status, args.source, args.limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scanNow = useCallback(async () => {
    const r = await authSafeInvoke<ScanNowResult>(EDGE_FN, { action: 'scan_now' });
    if (isAuthRequiredResult(r)) {
      return {
        ok: false as const,
        error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
      };
    }
    if (r.success) return { ok: true as const, data: r.data };
    const fail = r as { success: false; error: { code: string; message: string } };
    return { ok: false as const, error: fail.error };
  }, []);

  const dismissHit = useCallback(async (hitId: string, reason: string) => {
    if (typeof reason !== 'string' || reason.trim().length < 5) {
      return {
        ok: false as const,
        error: {
          code: 'client_validation',
          message: 'Reason must be at least 5 characters',
        },
      };
    }
    const r = await authSafeInvoke<{ hit_id: string; status: 'dismissed' }>(EDGE_FN, {
      action: 'dismiss_hit',
      hit_id: hitId,
      reason,
    });
    if (isAuthRequiredResult(r)) {
      return {
        ok: false as const,
        error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
      };
    }
    if (r.success) {
      await refresh();
      return { ok: true as const };
    }
    const fail = r as { success: false; error: { code: string; message: string } };
    return { ok: false as const, error: fail.error };
  }, [refresh]);

  const addManualSource = useCallback(async (input: AddManualSourceInput) => {
    const r = await authSafeInvoke<{ hit: SourceWatchHit | { duplicate_race: true } }>(
      EDGE_FN,
      { action: 'add_manual_source', ...input },
    );
    if (isAuthRequiredResult(r)) {
      return {
        ok: false as const,
        error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
      };
    }
    if (r.success) {
      await refresh();
      return { ok: true as const, hit: r.data?.hit as SourceWatchHit };
    }
    const fail = r as { success: false; error: { code: string; message: string } };
    return { ok: false as const, error: fail.error };
  }, [refresh]);

  return {
    hits,
    isLoading,
    error,
    authRequired,
    refresh,
    scanNow,
    dismissHit,
    addManualSource,
  };
}

export default useAgreementSourceWatch;