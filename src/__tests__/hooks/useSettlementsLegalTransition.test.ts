import { describe, it, expect } from 'vitest';
import {
  mapLegacyStatus,
  toLegacyStatus,
  tryTransition,
  type LegalValidationState,
  type LegalValidationEvent,
} from '@/shared/legal/compliance/validationStateMachine';

/**
 * Local helper matching the one in useSettlements.ts.
 * Settlements treat null/undefined as 'pending' (implicitly awaiting legal review).
 */
function getSettlementLegalState(status: string | null | undefined): LegalValidationState {
  if (!status) return 'pending';
  return mapLegacyStatus(status);
}

describe('Settlement legal transition guard', () => {
  // === HAPPY PATH ===

  it('null (new settlement) → APPROVE → approved', () => {
    const state = getSettlementLegalState(null);
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.to).toBe('approved');
    expect(toLegacyStatus(result.to!)).toBe('approved');
  });

  it('null (new settlement) → REJECT → rejected', () => {
    const state = getSettlementLegalState(null);
    const result = tryTransition(state, 'REJECT');
    expect(result.success).toBe(true);
    expect(result.to).toBe('rejected');
    expect(toLegacyStatus(result.to!)).toBe('rejected');
  });

  it('pending → APPROVE → approved', () => {
    const state = getSettlementLegalState('pending');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.to).toBe('approved');
  });

  it('pending → REJECT → rejected', () => {
    const state = getSettlementLegalState('pending');
    const result = tryTransition(state, 'REJECT');
    expect(result.success).toBe(true);
    expect(result.to).toBe('rejected');
  });

  // === GUARD: INVALID TRANSITIONS ===

  it('approved → APPROVE is blocked (no re-approval)', () => {
    const state = getSettlementLegalState('approved');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(false);
    expect(result.to).toBeNull();
    expect(result.reason).toBeDefined();
  });

  it('rejected → APPROVE is blocked (needs RESET first)', () => {
    const state = getSettlementLegalState('rejected');
    const result = tryTransition(state, 'APPROVE');
    expect(result.success).toBe(false);
    expect(result.to).toBeNull();
  });

  // === HELPER SEMANTICS ===

  it('getSettlementLegalState treats null as pending, not not_required', () => {
    expect(getSettlementLegalState(null)).toBe('pending');
    expect(getSettlementLegalState(undefined)).toBe('pending');
    expect(getSettlementLegalState('')).toBe('pending');
  });

  it('mapLegacyStatus treats null as not_required (global default)', () => {
    expect(mapLegacyStatus(null)).toBe('not_required');
  });

  // === LEGACY ROUND-TRIP ===

  it('toLegacyStatus preserves DB values after transition', () => {
    const state = getSettlementLegalState(null);
    const approved = tryTransition(state, 'APPROVE');
    expect(toLegacyStatus(approved.to!)).toBe('approved');

    const rejected = tryTransition(state, 'REJECT');
    expect(toLegacyStatus(rejected.to!)).toBe('rejected');
  });
});
