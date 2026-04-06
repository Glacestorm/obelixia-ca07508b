import { describe, it, expect } from 'vitest';
import {
  transition,
  canTransition,
  getAvailableEvents,
  tryTransition,
  mapLegacyStatus,
  toLegacyStatus,
  isTerminalState,
  requiresAction,
  ALL_STATES,
  ALL_EVENTS,
  type LegalValidationState,
  type LegalValidationEvent,
} from '@/shared/legal/compliance/validationStateMachine';

// ============================================================================
// TRANSITIONS
// ============================================================================

describe('transition()', () => {
  const validCases: [LegalValidationState, LegalValidationEvent, LegalValidationState][] = [
    ['not_required', 'REQUEST_REVIEW', 'pending'],
    ['pending', 'START_REVIEW', 'in_review'],
    ['pending', 'APPROVE', 'approved'],
    ['pending', 'REJECT', 'rejected'],
    ['pending', 'ESCALATE', 'escalated'],
    ['in_review', 'APPROVE', 'approved'],
    ['in_review', 'REJECT', 'rejected'],
    ['in_review', 'ESCALATE', 'escalated'],
    ['approved', 'RESET', 'pending'],
    ['rejected', 'RESET', 'pending'],
    ['rejected', 'ESCALATE', 'escalated'],
    ['escalated', 'APPROVE', 'approved'],
    ['escalated', 'REJECT', 'rejected'],
    ['escalated', 'RESET', 'pending'],
  ];

  it.each(validCases)(
    '%s + %s → %s',
    (from, event, expected) => {
      expect(transition(from, event)).toBe(expected);
    }
  );

  const invalidCases: [LegalValidationState, LegalValidationEvent][] = [
    ['not_required', 'APPROVE'],
    ['not_required', 'REJECT'],
    ['not_required', 'START_REVIEW'],
    ['approved', 'APPROVE'],
    ['approved', 'REJECT'],
    ['pending', 'RESET'],
    ['in_review', 'RESET'],
    ['in_review', 'REQUEST_REVIEW'],
  ];

  it.each(invalidCases)(
    '%s + %s → null (invalid)',
    (from, event) => {
      expect(transition(from, event)).toBeNull();
    }
  );
});

describe('canTransition()', () => {
  it('returns true for valid transitions', () => {
    expect(canTransition('pending', 'APPROVE')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(canTransition('not_required', 'APPROVE')).toBe(false);
  });
});

describe('getAvailableEvents()', () => {
  it('returns correct events for pending', () => {
    const events = getAvailableEvents('pending');
    expect(events).toContain('START_REVIEW');
    expect(events).toContain('APPROVE');
    expect(events).toContain('REJECT');
    expect(events).toContain('ESCALATE');
    expect(events).not.toContain('RESET');
  });

  it('returns only REQUEST_REVIEW for not_required', () => {
    expect(getAvailableEvents('not_required')).toEqual(['REQUEST_REVIEW']);
  });

  it('returns only RESET for approved', () => {
    expect(getAvailableEvents('approved')).toEqual(['RESET']);
  });
});

describe('tryTransition()', () => {
  it('returns success result for valid transition', () => {
    const result = tryTransition('pending', 'APPROVE');
    expect(result.success).toBe(true);
    expect(result.from).toBe('pending');
    expect(result.to).toBe('approved');
    expect(result.event).toBe('APPROVE');
    expect(result.reason).toBeUndefined();
  });

  it('returns failure result for invalid transition', () => {
    const result = tryTransition('not_required', 'REJECT');
    expect(result.success).toBe(false);
    expect(result.to).toBeNull();
    expect(result.reason).toBeDefined();
  });
});

// ============================================================================
// LEGACY MAPPING
// ============================================================================

describe('mapLegacyStatus()', () => {
  it.each([
    [null, 'not_required'],
    [undefined, 'not_required'],
    ['', 'not_required'],
    ['  ', 'not_required'],
    ['pending', 'pending'],
    ['pending_validation', 'pending'],
    ['pending_approval', 'pending'],
    ['review_required', 'in_review'],
    ['in_review', 'in_review'],
    ['approved', 'approved'],
    ['auto_approved', 'approved'],
    ['validated', 'approved'],
    ['rejected', 'rejected'],
    ['blocked', 'escalated'],
    ['escalated', 'escalated'],
  ] as [string | null | undefined, LegalValidationState][])(
    'maps "%s" → "%s"',
    (input, expected) => {
      expect(mapLegacyStatus(input)).toBe(expected);
    }
  );

  it('falls back to pending for unknown values', () => {
    expect(mapLegacyStatus('some_unknown_status')).toBe('pending');
  });
});

describe('toLegacyStatus()', () => {
  it.each([
    ['not_required', null],
    ['pending', 'pending'],
    ['in_review', 'review_required'],
    ['approved', 'approved'],
    ['rejected', 'rejected'],
    ['escalated', 'escalated'],
  ] as [LegalValidationState, string | null][])(
    'converts "%s" → %s',
    (state, expected) => {
      expect(toLegacyStatus(state)).toBe(expected);
    }
  );
});

describe('round-trip consistency', () => {
  it('toLegacyStatus(mapLegacyStatus(x)) preserves canonical DB values', () => {
    const dbValues = ['pending', 'approved', 'rejected'];
    for (const v of dbValues) {
      expect(toLegacyStatus(mapLegacyStatus(v))).toBe(v);
    }
  });

  it('null round-trips correctly', () => {
    expect(toLegacyStatus(mapLegacyStatus(null))).toBeNull();
  });
});

// ============================================================================
// PREDICATES
// ============================================================================

describe('isTerminalState()', () => {
  it('approved and rejected are terminal', () => {
    expect(isTerminalState('approved')).toBe(true);
    expect(isTerminalState('rejected')).toBe(true);
  });

  it('other states are not terminal', () => {
    expect(isTerminalState('pending')).toBe(false);
    expect(isTerminalState('in_review')).toBe(false);
    expect(isTerminalState('escalated')).toBe(false);
    expect(isTerminalState('not_required')).toBe(false);
  });
});

describe('requiresAction()', () => {
  it('pending, in_review, escalated require action', () => {
    expect(requiresAction('pending')).toBe(true);
    expect(requiresAction('in_review')).toBe(true);
    expect(requiresAction('escalated')).toBe(true);
  });

  it('approved, rejected, not_required do not', () => {
    expect(requiresAction('approved')).toBe(false);
    expect(requiresAction('rejected')).toBe(false);
    expect(requiresAction('not_required')).toBe(false);
  });
});

// ============================================================================
// CONSTANTS
// ============================================================================

describe('ALL_STATES / ALL_EVENTS', () => {
  it('ALL_STATES has 6 entries', () => {
    expect(ALL_STATES).toHaveLength(6);
  });

  it('ALL_EVENTS has 6 entries', () => {
    expect(ALL_EVENTS).toHaveLength(6);
  });

  it('every state has at least one available event', () => {
    for (const state of ALL_STATES) {
      expect(getAvailableEvents(state).length).toBeGreaterThan(0);
    }
  });
});
