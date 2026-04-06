import { describe, it, expect } from 'vitest';
import {
  mapLegacyStatus,
  toLegacyStatus,
  tryTransition,
  type LegalValidationState,
} from '@/shared/legal/compliance/validationStateMachine';

/**
 * Local helper matching the one in usePayrollRecalculation.ts.
 * Recalculations treat null/pending as 'pending' (awaiting legal validation).
 */
function getRecalcLegalState(status: string | null | undefined): LegalValidationState {
  if (!status || status === 'pending') return 'pending';
  return mapLegacyStatus(status);
}

describe('Payroll Recalculation legal transition guard', () => {
  // === HAPPY PATH ===

  it('pending → APPROVE → approved', () => {
    const state = getRecalcLegalState('pending');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.to).toBe('approved');
    expect(toLegacyStatus(result.to!)).toBe('approved');
  });

  it('null/undefined → treated as pending → APPROVE → approved', () => {
    expect(getRecalcLegalState(null)).toBe('pending');
    expect(getRecalcLegalState(undefined)).toBe('pending');

    const result = tryTransition(getRecalcLegalState(null), 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.to).toBe('approved');
  });

  it('pending → START_REVIEW → in_review (pre-guard path)', () => {
    const state = getRecalcLegalState('pending');
    const result = tryTransition(state, 'START_REVIEW');
    expect(result.success).toBe(true);
    expect(result.to).toBe('in_review');
  });

  // === GUARD: BLOCKED TRANSITIONS ===

  it('validated (legacy) maps to approved → APPROVE blocked', () => {
    const state = getRecalcLegalState('validated');
    expect(state).toBe('approved');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(false);
    expect(result.to).toBeNull();
  });

  it('approved → APPROVE blocked (no re-validation)', () => {
    const state = getRecalcLegalState('approved');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(false);
  });

  it('rejected → APPROVE blocked (needs RESET first)', () => {
    const state = getRecalcLegalState('rejected');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(false);
  });

  // === ROUND-TRIP ===

  it('toLegacyStatus preserves DB values after transition', () => {
    const state = getRecalcLegalState(null);
    const approved = tryTransition(state, 'APPROVE');
    expect(toLegacyStatus(approved.to!)).toBe('approved');
  });

  // === HELPER SEMANTICS ===

  it('getRecalcLegalState differs from global mapLegacyStatus for null', () => {
    expect(getRecalcLegalState(null)).toBe('pending');
    expect(mapLegacyStatus(null)).toBe('not_required');
  });
});
