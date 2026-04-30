/**
 * B11.2C.2 — Write actions hook for the TIC-NAC staging edge function.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-staging', ...)`.
 *  - NEVER uses `.from(...).insert/.update/.delete/.upsert`.
 *  - NEVER uses any privileged service key.
 *  - Auth-safe: when no session token, returns AUTH_REQUIRED without throwing.
 *  - 401/403 are mapped via authSafeInvoke to UNAUTHORIZED / FORBIDDEN
 *    without ever throwing into React.
 *  - Reject / mark_needs_correction enforce min reason length client-side
 *    before calling the edge.
 *  - No imports from the payroll bridge, payroll/payslip engines,
 *    salary normalizer, or agreement salary resolver modules.
 */

import { useCallback, useState } from 'react';
import { authSafeInvoke } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-agreement-staging';

export type StagingActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      reason?: 'auth_required' | 'unauthorized' | 'forbidden' | 'edge_error' | 'client_validation';
      skipped?: true;
      error: { code: string; message: string };
    };

export type ApprovalMode =
  | 'ocr_single_human_approval'
  | 'ocr_dual_human_approval'
  | 'manual_upload_single_approval'
  | 'manual_upload_dual_approval';

export interface RawStagingRowInput {
  source_page: string | number;
  source_excerpt: string;
  source_article?: string | null;
  source_annex?: string | null;
  ocr_raw_text?: string | null;
  year: number;
  area_code?: string | null;
  area_name?: string | null;
  professional_group: string;
  level?: string | null;
  category?: string | null;
  concept_literal_from_agreement: string;
  normalized_concept_key: string;
  payroll_label: string;
  payslip_label: string;
  cra_code_suggested?: string | null;
  taxable_irpf_hint?: boolean | null;
  cotization_included_hint?: boolean | null;
  salary_base_annual?: number | null;
  salary_base_monthly?: number | null;
  extra_pay_amount?: number | null;
  plus_convenio_annual?: number | null;
  plus_convenio_monthly?: number | null;
  plus_transport?: number | null;
  plus_antiguedad?: number | null;
  other_amount?: number | null;
  currency?: string;
  row_confidence?: string | null;
  review_notes?: string | null;
}

export interface StageOcrBatchPayload {
  agreementId: string;
  versionId: string;
  approvalMode: 'ocr_single_human_approval' | 'ocr_dual_human_approval';
  rawRows: RawStagingRowInput[];
}

export interface StageManualBatchPayload {
  agreementId: string;
  versionId: string;
  approvalMode: 'manual_upload_single_approval' | 'manual_upload_dual_approval';
  rows: RawStagingRowInput[];
  extraction?: 'manual_csv' | 'manual_form';
}

export interface EditRowPayload {
  rowId: string;
  patch: Partial<RawStagingRowInput>;
}

async function invoke<T>(
  action: string,
  payload: Record<string, unknown>,
): Promise<StagingActionResult<T>> {
  const r = await authSafeInvoke<T>(EDGE_FN, { action, ...payload });
  if (r.success === true) {
    return { success: true, data: r.data };
  }
  // Map authSafeInvoke failure to our public shape (never throws)
  return {
    success: false,
    reason: r.reason,
    skipped: r.skipped,
    error: r.error,
  };
}

export function useTicNacSalaryTableStagingActions() {
  const [isPending, setIsPending] = useState(false);

  const stageOcrBatch = useCallback(async (p: StageOcrBatchPayload) => {
    setIsPending(true);
    try {
      return await invoke<{ inserted_count: number; rows: unknown[] }>(
        'stage_ocr_batch',
        {
          agreement_id: p.agreementId,
          version_id: p.versionId,
          approval_mode: p.approvalMode,
          raw_rows: p.rawRows,
        },
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  const stageManualBatch = useCallback(async (p: StageManualBatchPayload) => {
    setIsPending(true);
    try {
      return await invoke<{ inserted_count: number; rows: unknown[] }>(
        'stage_manual_batch',
        {
          agreement_id: p.agreementId,
          version_id: p.versionId,
          approval_mode: p.approvalMode,
          rows: p.rows,
          ...(p.extraction ? { extraction: p.extraction } : {}),
        },
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  const editRow = useCallback(async (p: EditRowPayload) => {
    setIsPending(true);
    try {
      return await invoke<{ row: unknown }>('edit_row', {
        row_id: p.rowId,
        patch: p.patch,
      });
    } finally {
      setIsPending(false);
    }
  }, []);

  const approveSingle = useCallback(async (rowId: string) => {
    setIsPending(true);
    try {
      return await invoke<{ row: unknown; approval_hash: string }>(
        'approve_single',
        { row_id: rowId },
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  const approveFirst = useCallback(async (rowId: string) => {
    setIsPending(true);
    try {
      return await invoke<{ row: unknown; approval_hash: string }>(
        'approve_first',
        { row_id: rowId },
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  const approveSecond = useCallback(async (rowId: string) => {
    setIsPending(true);
    try {
      return await invoke<{ row: unknown; approval_hash: string }>(
        'approve_second',
        { row_id: rowId },
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  const rejectRow = useCallback(
    async (rowId: string, reason: string): Promise<StagingActionResult<{ row: unknown }>> => {
      const r = (reason ?? '').trim();
      if (r.length < 5) {
        return {
          success: false,
          reason: 'client_validation',
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'El motivo debe tener al menos 5 caracteres.',
          },
        };
      }
      setIsPending(true);
      try {
        return await invoke<{ row: unknown }>('reject', {
          row_id: rowId,
          reason: r,
        });
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  const markNeedsCorrection = useCallback(
    async (rowId: string, reason: string): Promise<StagingActionResult<{ row: unknown }>> => {
      const r = (reason ?? '').trim();
      if (r.length < 5) {
        return {
          success: false,
          reason: 'client_validation',
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'El motivo debe tener al menos 5 caracteres.',
          },
        };
      }
      setIsPending(true);
      try {
        return await invoke<{ row: unknown }>('mark_needs_correction', {
          row_id: rowId,
          reason: r,
        });
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return {
    isPending,
    stageOcrBatch,
    stageManualBatch,
    editRow,
    approveSingle,
    approveFirst,
    approveSecond,
    rejectRow,
    markNeedsCorrection,
  };
}

export default useTicNacSalaryTableStagingActions;