/**
 * B13.3A — Auth-safe hook over the Extraction Runner edge.
 *
 * Hard rules:
 *  - Calls only `supabase.functions.invoke('erp-hr-agreement-extraction-runner', ...)`
 *    via authSafeInvoke.
 *  - NEVER uses `.from(...).insert/.update/.delete/.upsert`.
 *  - NEVER uses any privileged service key.
 *  - Auth-safe: when no session token, returns `authRequired=true` and
 *    empty data; never throws.
 *  - No imports from the payroll bridge / payroll engine / payslip engine /
 *    salary normalizer / agreement salary resolver.
 *  - acceptFindingToStaging (B13.3B.1) creates a staging row PENDING
 *    human review via the edge. NEVER writes salary_tables real, NEVER
 *    sets ready_for_payroll, NEVER auto-approves.
 */

import { useCallback, useEffect, useState } from 'react';
import { authSafeInvoke, isAuthRequiredResult } from './_authSafeInvoke';

const EDGE_FN = 'erp-hr-agreement-extraction-runner';

export type ExtractionRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'blocked';

export type ExtractionMode =
  | 'html_text'
  | 'pdf_text'
  | 'ocr_assisted'
  | 'manual_csv'
  | 'metadata_only';

export type ExtractionFindingType =
  | 'salary_table_candidate'
  | 'rule_candidate'
  | 'concept_candidate'
  | 'classification_candidate'
  | 'metadata_candidate'
  | 'ocr_required'
  | 'manual_review_required';

export type ExtractionFindingStatus =
  | 'pending_review'
  | 'accepted_to_staging'
  | 'rejected'
  | 'needs_correction'
  | 'blocked';

/**
 * B13.4 — Candidate Review state stored inside `payload_json.candidate_review`.
 * This is INDEPENDENT from `finding_status` (which the existing pipeline owns)
 * and reflects the OCR-candidate-only review workflow.
 */
export type OcrCandidateReviewState =
  | 'extracted'
  | 'needs_review'
  | 'rejected'
  | 'approved_candidate'
  | 'promoted';

export type OcrCandidatePromotedTarget = 'staging_review_only';

export interface ExtractionRun {
  id: string;
  intake_id: string;
  agreement_id: string | null;
  version_id: string | null;
  run_status: ExtractionRunStatus;
  extraction_mode: ExtractionMode;
  source_url: string;
  document_url: string | null;
  document_hash: string | null;
  started_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  summary_json: Record<string, unknown>;
  warnings_json: unknown[];
  blockers_json: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ExtractionFinding {
  id: string;
  extraction_run_id: string;
  intake_id: string;
  agreement_id: string | null;
  version_id: string | null;
  finding_type: ExtractionFindingType;
  concept_literal_from_agreement: string | null;
  normalized_concept_key: string | null;
  payroll_label: string | null;
  payslip_label: string | null;
  source_page: string | null;
  source_excerpt: string | null;
  source_article: string | null;
  source_annex: string | null;
  raw_text: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
  requires_human_review: true;
  finding_status: ExtractionFindingStatus;
  payload_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UseAgreementExtractionRunnerArgs {
  intake_id?: string;
  run_status?: ExtractionRunStatus;
  extraction_mode?: ExtractionMode;
  limit?: number;
  include_findings?: boolean;
}

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: { code: string; message: string } };

export interface UseAgreementExtractionRunnerResult {
  runs: ExtractionRun[];
  findings: ExtractionFinding[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
  authRequired: boolean;
  refresh: () => Promise<void>;
  createRun: (input: {
    intake_id: string;
    extraction_mode: ExtractionMode;
  }) => Promise<ActionResult<{ run: ExtractionRun }>>;
  runMetadataExtraction: (
    run_id: string,
  ) => Promise<ActionResult<{ run_id: string; run_status: ExtractionRunStatus; findings_count: number }>>;
  runTextExtraction: (input: {
    run_id: string;
    text_content: string;
    source_page?: string;
    source_article?: string;
    source_annex?: string;
  }) => Promise<ActionResult<{ run_id: string; run_status: ExtractionRunStatus; findings_count: number }>>;
  markRunBlocked: (input: { run_id: string; reason: string }) => Promise<ActionResult>;
  acceptFindingToStaging: (
    finding_id: string,
    options?: { approval_dual?: boolean },
  ) => Promise<
    ActionResult<{
      finding_id: string;
      staging_row_id: string;
      validation_status: string;
      approval_mode: string;
    }>
  >;
  rejectFinding: (input: { finding_id: string; reason: string }) => Promise<ActionResult>;
  /**
   * B13.4 — Marks an OCR candidate as `needs_review`. Behind the
   * `agreement_ocr_candidate_review_enabled` server flag. With the flag off,
   * the edge returns `FEATURE_DISABLED` and this hook surfaces the error
   * untouched. NEVER touches payroll, salary_tables real, or registry.
   */
  reviewOcrCandidate: (input: {
    finding_id: string;
    reason?: string;
  }) => Promise<
    ActionResult<{
      finding_id: string;
      candidate_review_state: OcrCandidateReviewState;
      previous_state: OcrCandidateReviewState;
    }>
  >;
  approveOcrCandidate: (input: {
    finding_id: string;
    reason?: string;
  }) => Promise<
    ActionResult<{
      finding_id: string;
      candidate_review_state: OcrCandidateReviewState;
      previous_state: OcrCandidateReviewState;
    }>
  >;
  rejectOcrCandidate: (input: {
    finding_id: string;
    reason: string;
  }) => Promise<
    ActionResult<{
      finding_id: string;
      candidate_review_state: OcrCandidateReviewState;
      previous_state: OcrCandidateReviewState;
    }>
  >;
  /**
   * B13.4 — Promote an `approved_candidate` to `promoted` (read-only marker).
   * `promoted_target` is restricted to `'staging_review_only'`. Promotion
   * NEVER writes to salary_tables real, payroll, or registry.
   */
  promoteOcrCandidate: (input: {
    finding_id: string;
    promoted_target: OcrCandidatePromotedTarget;
    reason?: string;
  }) => Promise<
    ActionResult<{
      finding_id: string;
      candidate_review_state: OcrCandidateReviewState;
      previous_state: OcrCandidateReviewState;
      promoted_target: OcrCandidatePromotedTarget;
    }>
  >;
  runOcrOrTextExtraction: (
    input:
      | {
          run_id: string;
          extraction_input_type: 'text_content';
          text_content: string;
          source_page?: string;
          source_article?: string;
          source_annex?: string;
        }
      | {
          run_id: string;
          extraction_input_type: 'document_url';
          document_url: string;
          source_page?: string;
          source_article?: string;
          source_annex?: string;
        }
      | {
          run_id: string;
          extraction_input_type: 'manual_pasted_table';
          rows: Array<Record<string, unknown>>;
          source_page?: string;
          source_article?: string;
          source_annex?: string;
        },
  ) => Promise<
    ActionResult<{
      run_id: string;
      run_status: ExtractionRunStatus;
      findings_count: number;
    }>
  >;
}

function unauthorized(): { ok: false; error: { code: string; message: string } } {
  return {
    ok: false,
    error: { code: 'AUTH_REQUIRED', message: 'Requires authenticated session' },
  };
}

export function useAgreementExtractionRunner(
  args: UseAgreementExtractionRunnerArgs = {},
): UseAgreementExtractionRunnerResult {
  const [runs, setRuns] = useState<ExtractionRun[]>([]);
  const [findings, setFindings] = useState<ExtractionFinding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const r = await authSafeInvoke<{ runs: ExtractionRun[]; findings: ExtractionFinding[] }>(
      EDGE_FN,
      {
        action: 'list_runs',
        ...(args.intake_id ? { intake_id: args.intake_id } : {}),
        ...(args.run_status ? { run_status: args.run_status } : {}),
        ...(args.extraction_mode ? { extraction_mode: args.extraction_mode } : {}),
        ...(args.limit ? { limit: args.limit } : {}),
        include_findings: args.include_findings ?? true,
      },
    );
    if (isAuthRequiredResult(r)) {
      setAuthRequired(true);
      setRuns([]);
      setFindings([]);
      setError(null);
    } else if (r.success) {
      setAuthRequired(false);
      setRuns(r.data?.runs ?? []);
      setFindings(r.data?.findings ?? []);
    } else {
      const fail = r as { success: false; error: { code: string; message: string } };
      setAuthRequired(false);
      setRuns([]);
      setFindings([]);
      setError(fail.error);
    }
    setIsLoading(false);
  }, [
    args.intake_id,
    args.run_status,
    args.extraction_mode,
    args.limit,
    args.include_findings,
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

  const createRun = useCallback(
    (input: { intake_id: string; extraction_mode: ExtractionMode }) =>
      callAndRefresh<{ run: ExtractionRun }>({ action: 'create_run', ...input }),
    [callAndRefresh],
  );

  const runMetadataExtraction = useCallback(
    (run_id: string) =>
      callAndRefresh<{
        run_id: string;
        run_status: ExtractionRunStatus;
        findings_count: number;
      }>({ action: 'run_metadata_extraction', run_id }),
    [callAndRefresh],
  );

  const runTextExtraction = useCallback(
    async (input: {
      run_id: string;
      text_content: string;
      source_page?: string;
      source_article?: string;
      source_annex?: string;
    }) => {
      if (!input.text_content || input.text_content.trim().length === 0) {
        return {
          ok: false as const,
          error: {
            code: 'client_validation',
            message: 'text_content is required (paste the agreement text).',
          },
        };
      }
      return callAndRefresh<{
        run_id: string;
        run_status: ExtractionRunStatus;
        findings_count: number;
      }>({ action: 'run_text_extraction', ...input });
    },
    [callAndRefresh],
  );

  const markRunBlocked = useCallback(
    async (input: { run_id: string; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'Reason must be at least 5 characters' },
        };
      }
      const r = await callAndRefresh<unknown>({ action: 'mark_run_blocked', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const acceptFindingToStaging = useCallback(
    (finding_id: string, options?: { approval_dual?: boolean }) =>
      callAndRefresh<{
        finding_id: string;
        staging_row_id: string;
        validation_status: string;
        approval_mode: string;
      }>({
        action: 'accept_finding_to_staging',
        finding_id,
        ...(options ? { options } : {}),
      }),
    [callAndRefresh],
  );

  const rejectFinding = useCallback(
    async (input: { finding_id: string; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'Reason must be at least 5 characters' },
        };
      }
      const r = await callAndRefresh<unknown>({ action: 'reject_finding', ...input });
      return r.ok ? { ok: true as const } : r;
    },
    [callAndRefresh],
  );

  const runOcrOrTextExtraction = useCallback(
    async (
      input:
        | {
            run_id: string;
            extraction_input_type: 'text_content';
            text_content: string;
            source_page?: string;
            source_article?: string;
            source_annex?: string;
          }
        | {
            run_id: string;
            extraction_input_type: 'document_url';
            document_url: string;
            source_page?: string;
            source_article?: string;
            source_annex?: string;
          }
        | {
            run_id: string;
            extraction_input_type: 'manual_pasted_table';
            rows: Array<Record<string, unknown>>;
            source_page?: string;
            source_article?: string;
            source_annex?: string;
          },
    ) => {
      if (input.extraction_input_type === 'text_content' && (!input.text_content || input.text_content.trim().length === 0)) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'text_content is required' },
        };
      }
      if (input.extraction_input_type === 'document_url' && !input.document_url) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'document_url is required' },
        };
      }
      if (input.extraction_input_type === 'manual_pasted_table' && (!Array.isArray(input.rows) || input.rows.length === 0)) {
        return {
          ok: false as const,
          error: { code: 'client_validation', message: 'rows are required' },
        };
      }
      return callAndRefresh<{
        run_id: string;
        run_status: ExtractionRunStatus;
        findings_count: number;
      }>({ action: 'run_ocr_or_text_extraction', ...input });
    },
    [callAndRefresh],
  );

  return {
    runs,
    findings,
    isLoading,
    error,
    authRequired,
    refresh,
    createRun,
    runMetadataExtraction,
    runTextExtraction,
    markRunBlocked,
    acceptFindingToStaging,
    rejectFinding,
    runOcrOrTextExtraction,
  };
}

export default useAgreementExtractionRunner;