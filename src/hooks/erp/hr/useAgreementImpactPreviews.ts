/**
 * B13.5B — Auth-safe hook over the Agreement Impact Engine edge.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-impact-engine', ...)`
 *    via authSafeInvoke.
 *  - NEVER uses `.from(...).insert/.update/.delete/.upsert`.
 *  - NEVER uses any privileged service key.
 *  - Auth-safe: when no session token, returns `authRequired=true`.
 *  - No imports from payroll bridge / payroll engine / payslip engine /
 *    salary normalizer / agreement salary resolver / agreement safety gate.
 */

import { useCallback, useState } from 'react';
import { authSafeInvoke, isAuthRequiredResult } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-agreement-impact-engine';

export interface ImpactScopeRow {
  id: string;
  agreement_id: string;
  version_id: string;
  company_id: string;
  employee_count_estimated: number;
  computed_at: string;
  summary_json: Record<string, unknown>;
  risk_flags: unknown[];
  blockers_json: unknown[];
  warnings_json: unknown[];
}

export interface ImpactPreviewRow {
  id: string;
  affected_scope_id: string | null;
  agreement_id: string;
  version_id: string;
  company_id: string;
  employee_id: string;
  contract_id: string | null;
  affected: boolean;
  blocked: boolean;
  current_salary_monthly: number | null;
  target_salary_monthly: number | null;
  delta_monthly: number | null;
  delta_annual: number | null;
  arrears_estimate: number | null;
  employer_cost_delta: number | null;
  risk_flags: unknown[];
  blockers_json: unknown[];
  warnings_json: unknown[];
  requires_human_review: true;
  computed_at: string;
}

export interface ImpactComputeOptions {
  target_year: number;
  as_of_date?: string;
  arrears_from?: string;
  arrears_to?: string;
  employer_cost_multiplier?: number;
  require_runtime_setting?: boolean;
  include_inactive_employees?: boolean;
  risk_thresholds?: {
    large_delta_monthly: number;
    arrears_max_months: number;
  };
}

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function unauthorized<T>(): ActionResult<T> {
  return {
    ok: false,
    error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
  };
}

export function useAgreementImpactPreviews() {
  const [scopes, setScopes] = useState<ImpactScopeRow[]>([]);
  const [previews, setPreviews] = useState<ImpactPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refreshScopes = useCallback(
    async (filters: {
      agreement_id?: string;
      version_id?: string;
      company_id?: string;
      computed_after?: string;
    } = {}) => {
      setIsLoading(true);
      setError(null);
      const r = await authSafeInvoke<ImpactScopeRow[]>(EDGE_FN, {
        action: 'list_scopes',
        ...filters,
      });
      if (isAuthRequiredResult(r)) {
        setAuthRequired(true);
        setScopes([]);
      } else if (r.success === true) {
        setAuthRequired(false);
        setScopes(r.data ?? []);
      } else {
        setAuthRequired(false);
        setScopes([]);
        setError((r as { error: { code: string; message: string } }).error);
      }
      setIsLoading(false);
    },
    [],
  );

  const refreshPreviews = useCallback(
    async (filters: {
      agreement_id?: string;
      version_id?: string;
      company_id?: string;
      employee_id?: string;
      contract_id?: string;
      affected?: boolean;
      blocked?: boolean;
    } = {}) => {
      setIsLoading(true);
      setError(null);
      const r = await authSafeInvoke<ImpactPreviewRow[]>(EDGE_FN, {
        action: 'list_previews',
        ...filters,
      });
      if (isAuthRequiredResult(r)) {
        setAuthRequired(true);
        setPreviews([]);
      } else if (r.success === true) {
        setAuthRequired(false);
        setPreviews(r.data ?? []);
      } else {
        setAuthRequired(false);
        setPreviews([]);
        setError((r as { error: { code: string; message: string } }).error);
      }
      setIsLoading(false);
    },
    [],
  );

  const computeScope = useCallback(
    async (input: {
      agreement_id: string;
      version_id: string;
      company_id: string;
      options: ImpactComputeOptions;
    }): Promise<ActionResult<{ scope: ImpactScopeRow; previews: ImpactPreviewRow[] }>> => {
      const r = await authSafeInvoke<{ scope: ImpactScopeRow; previews: ImpactPreviewRow[] }>(
        EDGE_FN,
        { action: 'compute_scope', ...input },
      );
      if (isAuthRequiredResult(r)) return unauthorized();
      if (r.success === true) return { ok: true, data: r.data };
      return { ok: false, error: (r as { error: { code: string; message: string } }).error };
    },
    [],
  );

  const computeImpactPreview = useCallback(
    async (input: {
      agreement_id: string;
      version_id: string;
      company_id: string;
      employee_id?: string;
      contract_id?: string;
      options: ImpactComputeOptions;
    }): Promise<ActionResult<{ scope: ImpactScopeRow; previews: ImpactPreviewRow[] }>> => {
      const r = await authSafeInvoke<{ scope: ImpactScopeRow; previews: ImpactPreviewRow[] }>(
        EDGE_FN,
        { action: 'compute_impact_preview', ...input },
      );
      if (isAuthRequiredResult(r)) return unauthorized();
      if (r.success === true) return { ok: true, data: r.data };
      return { ok: false, error: (r as { error: { code: string; message: string } }).error };
    },
    [],
  );

  const markPreviewStale = useCallback(
    async (input: {
      preview_id: string;
      company_id: string;
      reason: string;
    }): Promise<ActionResult<ImpactPreviewRow>> => {
      const r = await authSafeInvoke<ImpactPreviewRow>(EDGE_FN, {
        action: 'mark_preview_stale',
        ...input,
      });
      if (isAuthRequiredResult(r)) return unauthorized();
      if (r.success === true) return { ok: true, data: r.data };
      return { ok: false, error: (r as { error: { code: string; message: string } }).error };
    },
    [],
  );

  return {
    scopes,
    previews,
    isLoading,
    error,
    authRequired,
    refreshScopes,
    refreshPreviews,
    computeScope,
    computeImpactPreview,
    markPreviewStale,
  };
}

export default useAgreementImpactPreviews;