/**
 * B13.4 — Candidate Review & Promotion Gate (pure engine).
 *
 * Hard rules enforced here:
 *  - States and transitions are EXPLICIT and FINITE.
 *  - `promoted` can ONLY be reached from `approved_candidate`.
 *  - OCR/text extraction NEVER reaches `promoted` automatically. The promote
 *    action requires an explicit, authenticated, role-validated edge call.
 *  - All payload mutations go through `assertPromotionPayloadAllowed` which
 *    rejects payroll/registry/tenant smuggling.
 *  - This module is PURE: no Supabase client, no fetch, no DB writes,
 *    no payroll/registry/bridge imports.
 *
 * The conceptual states for B13.4 (`extracted`, `needs_review`, `rejected`,
 * `approved_candidate`, `promoted`) are STORED INSIDE the existing finding's
 * `payload_json.candidate_review` slot, NOT in `finding_status`. This keeps
 * the existing CHECK constraint untouched and avoids a schema migration.
 */

export type OcrCandidateReviewState =
  | 'extracted'
  | 'needs_review'
  | 'rejected'
  | 'approved_candidate'
  | 'promoted';

export const OCR_CANDIDATE_REVIEW_STATES: readonly OcrCandidateReviewState[] = [
  'extracted',
  'needs_review',
  'rejected',
  'approved_candidate',
  'promoted',
] as const;

/**
 * Allowed transitions. Note that `extracted -> promoted` is NOT allowed
 * and `rejected -> promoted` is NOT allowed.
 */
export const OCR_CANDIDATE_REVIEW_TRANSITIONS: Readonly<
  Record<OcrCandidateReviewState, readonly OcrCandidateReviewState[]>
> = Object.freeze({
  extracted: ['needs_review', 'rejected'],
  needs_review: ['approved_candidate', 'rejected'],
  approved_candidate: ['promoted', 'rejected', 'needs_review'],
  rejected: [], // terminal
  promoted: [], // terminal
});

/**
 * Payload keys that MUST NEVER appear in any review/promote payload.
 * Mirrors the runner edge `FORBIDDEN_PAYLOAD_KEYS` and extends it with
 * payroll-record / VPT / employee-payroll / legal-final vectors.
 */
export const FORBIDDEN_PROMOTION_PAYLOAD_KEYS: readonly string[] = [
  // Activation flags
  'ready_for_payroll',
  'salary_tables_loaded',
  'data_completeness',
  'human_validated',
  'human_approved_single',
  'human_approved_first',
  'human_approved_second',
  'approved_by',
  'approved_at',
  'apply_to_payroll',
  'activation_run_id',
  'runtime_setting',
  // Registry / pilot flags
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'HR_REGISTRY_PILOT_MODE',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST',
  'use_registry_for_payroll',
  // Payroll vectors
  'payroll',
  'payroll_records',
  'payroll_calculation',
  'persisted_incidents',
  'employee_payroll',
  'employee_payroll_data',
  'payslip',
  'vpt_scores',
  // Legal final / registry sensitive
  'legal_status',
  'registry_status',
  'version_status',
  'source_watcher_state',
  // Tenant / privilege
  'service_role',
  'service_role_key',
  'company_id_override',
  'tenant_id_override',
] as const;

export type FeatureFlagSource = Readonly<Record<string, unknown>>;

export const OCR_CANDIDATE_REVIEW_FLAG_KEY =
  'agreement_ocr_candidate_review_enabled';

/**
 * Default behaviour: B13.4 ships behind a feature flag. With OFF (or absent),
 * UI/hook MUST NOT expose mutation actions and the edge MUST refuse the new
 * actions. We default to FALSE so behaviour is unchanged when the flag is
 * not configured.
 */
export function isOcrCandidateReviewEnabled(
  source: FeatureFlagSource | null | undefined,
): boolean {
  if (!source || typeof source !== 'object') return false;
  const v = (source as Record<string, unknown>)[OCR_CANDIDATE_REVIEW_FLAG_KEY];
  return v === true;
}

export interface CandidateReviewSnapshot {
  state: OcrCandidateReviewState;
  source: 'ocr_text_extraction';
  updated_at: string;
  updated_by: string | null;
  reason?: string;
  promoted_target?: string;
}

export interface CandidateReviewHistoryEntry {
  candidate_id: string;
  agreement_id: string | null;
  company_id: string | null;
  previous_state: OcrCandidateReviewState | null;
  next_state: OcrCandidateReviewState;
  action:
    | 'review_ocr_candidate'
    | 'approve_ocr_candidate'
    | 'reject_ocr_candidate'
    | 'promote_ocr_candidate';
  actor_user_id: string;
  timestamp: string;
  reason?: string;
  source: 'ocr_text_extraction';
  promoted_target?: string;
}

export interface TransitionInput {
  current: OcrCandidateReviewState | null | undefined;
  next: OcrCandidateReviewState;
}

export interface TransitionResult {
  ok: boolean;
  reason?:
    | 'invalid_current_state'
    | 'invalid_next_state'
    | 'transition_not_allowed'
    | 'terminal_state';
}

export function getCurrentReviewState(
  payloadJson: unknown,
): OcrCandidateReviewState {
  if (!payloadJson || typeof payloadJson !== 'object' || Array.isArray(payloadJson)) {
    return 'extracted';
  }
  const cr = (payloadJson as Record<string, unknown>).candidate_review;
  if (!cr || typeof cr !== 'object' || Array.isArray(cr)) {
    return 'extracted';
  }
  const s = (cr as Record<string, unknown>).state;
  if (typeof s === 'string' && (OCR_CANDIDATE_REVIEW_STATES as readonly string[]).includes(s)) {
    return s as OcrCandidateReviewState;
  }
  return 'extracted';
}

export function canTransition(input: TransitionInput): TransitionResult {
  const current = (input.current ?? 'extracted') as OcrCandidateReviewState;
  if (!(OCR_CANDIDATE_REVIEW_STATES as readonly string[]).includes(current)) {
    return { ok: false, reason: 'invalid_current_state' };
  }
  if (!(OCR_CANDIDATE_REVIEW_STATES as readonly string[]).includes(input.next)) {
    return { ok: false, reason: 'invalid_next_state' };
  }
  const allowed = OCR_CANDIDATE_REVIEW_TRANSITIONS[current];
  if (allowed.length === 0) return { ok: false, reason: 'terminal_state' };
  if (!allowed.includes(input.next)) return { ok: false, reason: 'transition_not_allowed' };
  return { ok: true };
}

export interface PromotionPayloadCheck {
  ok: boolean;
  forbidden_key?: string;
}

/**
 * Recursively scans a JSON-serialisable payload for forbidden keys.
 * Returns the first offending key. Used by the edge before persisting.
 */
export function assertPromotionPayloadAllowed(
  payload: unknown,
): PromotionPayloadCheck {
  if (payload === null || payload === undefined) return { ok: true };
  if (typeof payload !== 'object') return { ok: true };
  const stack: unknown[] = [payload];
  const banned = new Set(FORBIDDEN_PROMOTION_PAYLOAD_KEYS);
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (const v of node) stack.push(v);
      continue;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (banned.has(k)) return { ok: false, forbidden_key: k };
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { ok: true };
}

/**
 * Salary candidate completeness. Used by `promote_ocr_candidate` to refuse
 * promotion of incomplete / ambiguous salary candidates.
 */
export interface SalaryCandidateCompletenessInput {
  finding_type?: string | null;
  agreement_id?: string | null;
  version_id?: string | null;
  source_page?: string | null;
  normalized_concept_key?: string | null;
  payslip_label?: string | null;
  candidate_amounts?: {
    salary_base_annual?: number | null;
    salary_base_monthly?: number | null;
    extra_pay_amount?: number | null;
    plus_convenio_annual?: number | null;
    plus_convenio_monthly?: number | null;
    plus_transport?: number | null;
    plus_antiguedad?: number | null;
    other_amount?: number | null;
  } | null;
}

export interface CompletenessResult {
  ok: boolean;
  reason?:
    | 'missing_agreement_id'
    | 'missing_source_page'
    | 'missing_concept_key'
    | 'missing_payslip_label'
    | 'no_amounts_or_invalid'
    | 'negative_amount'
    | 'unsupported_finding_type';
}

const PROMOTABLE_FINDING_TYPES = new Set([
  'salary_table_candidate',
  'concept_candidate',
  'rule_candidate',
]);

export function isPromotableCandidateComplete(
  input: SalaryCandidateCompletenessInput,
): CompletenessResult {
  if (!input.finding_type || !PROMOTABLE_FINDING_TYPES.has(input.finding_type)) {
    return { ok: false, reason: 'unsupported_finding_type' };
  }
  if (!input.agreement_id) return { ok: false, reason: 'missing_agreement_id' };
  if (!input.source_page || String(input.source_page).trim().length === 0) {
    return { ok: false, reason: 'missing_source_page' };
  }
  if (
    !input.normalized_concept_key ||
    String(input.normalized_concept_key).trim().length === 0
  ) {
    return { ok: false, reason: 'missing_concept_key' };
  }
  if (!input.payslip_label || String(input.payslip_label).trim().length === 0) {
    return { ok: false, reason: 'missing_payslip_label' };
  }

  // For salary_table_candidate we require at least one numeric amount, all
  // amounts must be non-negative finite numbers.
  if (input.finding_type === 'salary_table_candidate') {
    const a = input.candidate_amounts ?? null;
    if (!a) return { ok: false, reason: 'no_amounts_or_invalid' };
    const numeric = [
      a.salary_base_annual,
      a.salary_base_monthly,
      a.extra_pay_amount,
      a.plus_convenio_annual,
      a.plus_convenio_monthly,
      a.plus_transport,
      a.plus_antiguedad,
      a.other_amount,
    ];
    let anyValid = false;
    for (const v of numeric) {
      if (v === null || v === undefined) continue;
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        return { ok: false, reason: 'no_amounts_or_invalid' };
      }
      if (v < 0) return { ok: false, reason: 'negative_amount' };
      anyValid = true;
    }
    if (!anyValid) return { ok: false, reason: 'no_amounts_or_invalid' };
  }

  return { ok: true };
}

export interface BuildHistoryEntryInput {
  candidate_id: string;
  agreement_id: string | null;
  company_id: string | null;
  previous_state: OcrCandidateReviewState | null;
  next_state: OcrCandidateReviewState;
  action: CandidateReviewHistoryEntry['action'];
  actor_user_id: string;
  reason?: string;
  promoted_target?: string;
  now_iso: string;
}

export function buildHistoryEntry(
  input: BuildHistoryEntryInput,
): CandidateReviewHistoryEntry {
  return {
    candidate_id: input.candidate_id,
    agreement_id: input.agreement_id ?? null,
    company_id: input.company_id ?? null,
    previous_state: input.previous_state ?? null,
    next_state: input.next_state,
    action: input.action,
    actor_user_id: input.actor_user_id,
    timestamp: input.now_iso,
    source: 'ocr_text_extraction',
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.promoted_target ? { promoted_target: input.promoted_target } : {}),
  };
}

export function buildSnapshot(
  input: Pick<
    BuildHistoryEntryInput,
    'next_state' | 'actor_user_id' | 'reason' | 'promoted_target' | 'now_iso'
  >,
): CandidateReviewSnapshot {
  return {
    state: input.next_state,
    source: 'ocr_text_extraction',
    updated_at: input.now_iso,
    updated_by: input.actor_user_id ?? null,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.promoted_target ? { promoted_target: input.promoted_target } : {}),
  };
}

export function appendCandidateReviewToPayload(
  payloadJson: unknown,
  snapshot: CandidateReviewSnapshot,
  historyEntry: CandidateReviewHistoryEntry,
): Record<string, unknown> {
  const base =
    payloadJson && typeof payloadJson === 'object' && !Array.isArray(payloadJson)
      ? { ...(payloadJson as Record<string, unknown>) }
      : {};
  const prevHistory = Array.isArray(
    (base as { candidate_review_history?: unknown }).candidate_review_history,
  )
    ? ([...(base as { candidate_review_history: unknown[] }).candidate_review_history] as unknown[])
    : [];
  prevHistory.push(historyEntry);
  base.candidate_review = snapshot;
  base.candidate_review_history = prevHistory;
  return base;
}