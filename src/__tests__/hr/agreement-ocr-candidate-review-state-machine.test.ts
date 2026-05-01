/**
 * B13.4 — Pure unit tests for the Candidate Review state machine.
 */
import { describe, it, expect } from 'vitest';
import {
  OCR_CANDIDATE_REVIEW_STATES,
  OCR_CANDIDATE_REVIEW_TRANSITIONS,
  FORBIDDEN_PROMOTION_PAYLOAD_KEYS,
  OCR_CANDIDATE_REVIEW_FLAG_KEY,
  isOcrCandidateReviewEnabled,
  getCurrentReviewState,
  canTransition,
  assertPromotionPayloadAllowed,
  isPromotableCandidateComplete,
  buildHistoryEntry,
  buildSnapshot,
  appendCandidateReviewToPayload,
} from '@/engines/erp/hr/agreementOcrCandidateReviewStateMachine';

describe('B13.4 — state machine: states + transitions', () => {
  it('exposes the five mandatory states', () => {
    expect(OCR_CANDIDATE_REVIEW_STATES).toEqual([
      'extracted',
      'needs_review',
      'rejected',
      'approved_candidate',
      'promoted',
    ]);
  });

  it('promoted is unreachable from extracted', () => {
    expect(canTransition({ current: 'extracted', next: 'promoted' }).ok).toBe(false);
  });

  it('promoted is unreachable from rejected', () => {
    expect(canTransition({ current: 'rejected', next: 'promoted' }).ok).toBe(false);
    expect(canTransition({ current: 'rejected', next: 'promoted' }).reason).toBe(
      'terminal_state',
    );
  });

  it('promoted is unreachable from needs_review (must approve first)', () => {
    expect(canTransition({ current: 'needs_review', next: 'promoted' }).ok).toBe(false);
  });

  it('promoted is reachable ONLY from approved_candidate', () => {
    expect(canTransition({ current: 'approved_candidate', next: 'promoted' }).ok).toBe(true);
  });

  it('promoted is terminal', () => {
    expect(canTransition({ current: 'promoted', next: 'rejected' }).ok).toBe(false);
    expect(canTransition({ current: 'promoted', next: 'needs_review' }).ok).toBe(false);
  });

  it('rejected is terminal', () => {
    for (const s of OCR_CANDIDATE_REVIEW_STATES) {
      expect(canTransition({ current: 'rejected', next: s }).ok).toBe(false);
    }
  });

  it('rejects unknown current/next states', () => {
    expect(
      canTransition({ current: 'bogus' as never, next: 'needs_review' }).reason,
    ).toBe('invalid_current_state');
    expect(
      canTransition({ current: 'extracted', next: 'bogus' as never }).reason,
    ).toBe('invalid_next_state');
  });

  it('transition map is frozen and well-formed', () => {
    for (const [from, tos] of Object.entries(OCR_CANDIDATE_REVIEW_TRANSITIONS)) {
      expect(OCR_CANDIDATE_REVIEW_STATES).toContain(from);
      for (const t of tos) expect(OCR_CANDIDATE_REVIEW_STATES).toContain(t);
    }
  });
});

describe('B13.4 — getCurrentReviewState', () => {
  it('defaults to extracted when payload missing', () => {
    expect(getCurrentReviewState(null)).toBe('extracted');
    expect(getCurrentReviewState(undefined)).toBe('extracted');
    expect(getCurrentReviewState({})).toBe('extracted');
    expect(getCurrentReviewState([])).toBe('extracted');
  });
  it('reads candidate_review.state from payload', () => {
    expect(
      getCurrentReviewState({
        candidate_review: { state: 'needs_review', source: 'ocr_text_extraction' },
      }),
    ).toBe('needs_review');
  });
  it('falls back to extracted on bogus state', () => {
    expect(getCurrentReviewState({ candidate_review: { state: 'pwned' } })).toBe('extracted');
  });
});

describe('B13.4 — forbidden payload key enforcement', () => {
  it('rejects payroll key at top level', () => {
    const r = assertPromotionPayloadAllowed({ payroll: { net: 1234 } });
    expect(r.ok).toBe(false);
    expect(r.forbidden_key).toBe('payroll');
  });
  it('rejects payroll_records nested', () => {
    const r = assertPromotionPayloadAllowed({ a: { b: { payroll_records: [] } } });
    expect(r.ok).toBe(false);
    expect(r.forbidden_key).toBe('payroll_records');
  });
  it('rejects ready_for_payroll deep', () => {
    const r = assertPromotionPayloadAllowed({ x: [{ ready_for_payroll: true }] });
    expect(r.ok).toBe(false);
    expect(r.forbidden_key).toBe('ready_for_payroll');
  });
  it('rejects service_role override', () => {
    expect(assertPromotionPayloadAllowed({ service_role: 'x' }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ company_id_override: 'x' }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ tenant_id_override: 'x' }).ok).toBe(false);
  });
  it('rejects vpt_scores / legal_status / registry_status / version_status', () => {
    expect(assertPromotionPayloadAllowed({ vpt_scores: {} }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ legal_status: 'final' }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ registry_status: 'x' }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ version_status: 'x' }).ok).toBe(false);
    expect(assertPromotionPayloadAllowed({ source_watcher_state: 'x' }).ok).toBe(false);
  });
  it('accepts safe payloads', () => {
    expect(assertPromotionPayloadAllowed({ note: 'ok', safe: { nested: 1 } }).ok).toBe(true);
    expect(assertPromotionPayloadAllowed(null).ok).toBe(true);
    expect(assertPromotionPayloadAllowed(undefined).ok).toBe(true);
    expect(assertPromotionPayloadAllowed('plain').ok).toBe(true);
  });
  it('forbidden list covers payroll/registry/tenant vectors', () => {
    for (const k of [
      'payroll',
      'payroll_records',
      'persisted_incidents',
      'employee_payroll',
      'vpt_scores',
      'legal_status',
      'service_role',
      'company_id_override',
      'tenant_id_override',
      'apply_to_payroll',
      'ready_for_payroll',
      'salary_tables_loaded',
      'human_validated',
    ]) {
      expect(FORBIDDEN_PROMOTION_PAYLOAD_KEYS).toContain(k);
    }
  });
});

describe('B13.4 — promotion completeness gate', () => {
  const baseSalary = {
    finding_type: 'salary_table_candidate',
    agreement_id: 'a',
    version_id: 'v',
    source_page: '12',
    normalized_concept_key: 'salario_base',
    payslip_label: 'Salario base',
    candidate_amounts: { salary_base_monthly: 1500 },
  };
  it('accepts a complete salary candidate', () => {
    expect(isPromotableCandidateComplete(baseSalary).ok).toBe(true);
  });
  it('rejects unsupported finding_type', () => {
    expect(isPromotableCandidateComplete({ ...baseSalary, finding_type: 'metadata_candidate' })).toEqual(
      { ok: false, reason: 'unsupported_finding_type' },
    );
  });
  it('rejects missing agreement_id', () => {
    expect(isPromotableCandidateComplete({ ...baseSalary, agreement_id: null }).reason).toBe(
      'missing_agreement_id',
    );
  });
  it('rejects missing source_page', () => {
    expect(isPromotableCandidateComplete({ ...baseSalary, source_page: '' }).reason).toBe(
      'missing_source_page',
    );
  });
  it('rejects missing concept key', () => {
    expect(
      isPromotableCandidateComplete({ ...baseSalary, normalized_concept_key: '' }).reason,
    ).toBe('missing_concept_key');
  });
  it('rejects missing payslip label', () => {
    expect(isPromotableCandidateComplete({ ...baseSalary, payslip_label: '' }).reason).toBe(
      'missing_payslip_label',
    );
  });
  it('rejects no amounts at all', () => {
    expect(
      isPromotableCandidateComplete({ ...baseSalary, candidate_amounts: {} }).reason,
    ).toBe('no_amounts_or_invalid');
  });
  it('rejects negative amounts', () => {
    expect(
      isPromotableCandidateComplete({
        ...baseSalary,
        candidate_amounts: { salary_base_monthly: -1 },
      }).reason,
    ).toBe('negative_amount');
  });
  it('rejects non-finite amounts', () => {
    expect(
      isPromotableCandidateComplete({
        ...baseSalary,
        candidate_amounts: { salary_base_monthly: Number.NaN },
      }).reason,
    ).toBe('no_amounts_or_invalid');
  });
  it('concept_candidate without amounts is allowed (rule-only)', () => {
    expect(
      isPromotableCandidateComplete({
        ...baseSalary,
        finding_type: 'concept_candidate',
        candidate_amounts: null,
      }).ok,
    ).toBe(true);
  });
});

describe('B13.4 — feature flag', () => {
  it('defaults to false (flag absent)', () => {
    expect(isOcrCandidateReviewEnabled(null)).toBe(false);
    expect(isOcrCandidateReviewEnabled(undefined)).toBe(false);
    expect(isOcrCandidateReviewEnabled({})).toBe(false);
  });
  it('only true when explicit true (no truthy coercion)', () => {
    expect(isOcrCandidateReviewEnabled({ [OCR_CANDIDATE_REVIEW_FLAG_KEY]: true })).toBe(true);
    expect(isOcrCandidateReviewEnabled({ [OCR_CANDIDATE_REVIEW_FLAG_KEY]: 1 })).toBe(false);
    expect(isOcrCandidateReviewEnabled({ [OCR_CANDIDATE_REVIEW_FLAG_KEY]: 'true' })).toBe(false);
  });
});

describe('B13.4 — history & snapshot building', () => {
  it('snapshot tags source as ocr_text_extraction', () => {
    const s = buildSnapshot({
      next_state: 'needs_review',
      actor_user_id: 'u1',
      now_iso: '2026-05-01T00:00:00Z',
    });
    expect(s.source).toBe('ocr_text_extraction');
    expect(s.state).toBe('needs_review');
  });
  it('history entry preserves previous_state and action', () => {
    const h = buildHistoryEntry({
      candidate_id: 'c1',
      agreement_id: 'a1',
      company_id: null,
      previous_state: 'needs_review',
      next_state: 'approved_candidate',
      action: 'approve_ocr_candidate',
      actor_user_id: 'u1',
      now_iso: '2026-05-01T00:00:00Z',
    });
    expect(h).toMatchObject({
      previous_state: 'needs_review',
      next_state: 'approved_candidate',
      action: 'approve_ocr_candidate',
      source: 'ocr_text_extraction',
    });
  });
  it('appendCandidateReviewToPayload is append-only', () => {
    const before = { extra: 1, candidate_review_history: [{ a: 1 }] };
    const snap = buildSnapshot({
      next_state: 'needs_review',
      actor_user_id: 'u1',
      now_iso: 'x',
    });
    const ent = buildHistoryEntry({
      candidate_id: 'c',
      agreement_id: null,
      company_id: null,
      previous_state: 'extracted',
      next_state: 'needs_review',
      action: 'review_ocr_candidate',
      actor_user_id: 'u1',
      now_iso: 'x',
    });
    const after = appendCandidateReviewToPayload(before, snap, ent);
    expect(after.extra).toBe(1);
    expect((after.candidate_review_history as unknown[]).length).toBe(2);
    expect((after.candidate_review as { state: string }).state).toBe('needs_review');
  });
});