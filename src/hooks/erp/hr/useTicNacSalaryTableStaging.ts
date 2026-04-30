/**
 * B11.2C.2 — Read-only hook over the TIC-NAC staging tables.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-staging', ...)`.
 *  - NEVER uses `.from(...).insert/.update/.delete/.upsert`.
 *  - NEVER uses service_role.
 *  - Auth-safe: when no session token, returns `authRequired=true`
 *    with empty data, never throws.
 *  - No imports from useESPayrollBridge / payrollEngine / payslipEngine
 *    / salaryNormalizer / agreementSalaryResolver.
 */

import { useCallback, useEffect, useState } from 'react';
import { authSafeInvoke, isAuthRequiredResult } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-agreement-staging';

export interface StagingRowSummary {
  id: string;
  agreement_id: string;
  version_id: string;
  year: number;
  professional_group: string;
  level: string | null;
  category: string | null;
  concept_literal_from_agreement: string;
  normalized_concept_key: string;
  payslip_label: string;
  validation_status: string;
  approval_mode: string;
  extraction_method: string;
  source_page: string;
  source_excerpt: string;
  row_confidence: string | null;
  first_reviewed_by: string | null;
  first_reviewed_at: string | null;
  second_reviewed_by: string | null;
  second_reviewed_at: string | null;
  content_hash: string;
  [k: string]: unknown;
}

export interface StagingAuditEntry {
  id: string;
  staging_row_id: string | null;
  action: string;
  actor_id: string | null;
  created_at: string;
}

export interface UseTicNacSalaryTableStagingArgs {
  agreementId: string | null;
  versionId: string | null;
  status?: string;
}

export interface UseTicNacSalaryTableStagingResult {
  rows: StagingRowSummary[];
  audit: StagingAuditEntry[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
  authRequired: boolean;
  refresh: () => Promise<void>;
}

export function useTicNacSalaryTableStaging(
  args: UseTicNacSalaryTableStagingArgs,
): UseTicNacSalaryTableStagingResult {
  const [rows, setRows] = useState<StagingRowSummary[]>([]);
  const [audit, setAudit] = useState<StagingAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    if (!args.agreementId || !args.versionId) {
      setRows([]);
      setAudit([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    const r = await authSafeInvoke<{
      rows: StagingRowSummary[];
      audit: StagingAuditEntry[];
    }>(EDGE_FN, {
      action: 'list_for_review',
      agreement_id: args.agreementId,
      version_id: args.versionId,
      ...(args.status ? { status: args.status } : {}),
    });
    if (isAuthRequiredResult(r)) {
      setAuthRequired(true);
      setRows([]);
      setAudit([]);
      setError(null);
    } else if (r.success) {
      setAuthRequired(false);
      setRows(r.data?.rows ?? []);
      setAudit(r.data?.audit ?? []);
    } else {
      const fail = r as { success: false; error: { code: string; message: string } };
      setAuthRequired(false);
      setRows([]);
      setAudit([]);
      setError(fail.error);
    }
    setIsLoading(false);
  }, [args.agreementId, args.versionId, args.status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, audit, isLoading, error, authRequired, refresh };
}

export default useTicNacSalaryTableStaging;