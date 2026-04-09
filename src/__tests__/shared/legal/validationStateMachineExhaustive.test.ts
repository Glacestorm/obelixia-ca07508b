import { describe, it, expect } from 'vitest';
import {
  transition,
  canTransition,
  tryTransition,
  mapLegacyStatus,
  toLegacyStatus,
  isTerminalState,
  requiresAction,
  getAvailableEvents,
  ALL_STATES,
  ALL_EVENTS,
  type LegalValidationState,
  type LegalValidationEvent,
} from '@/shared/legal/compliance/validationStateMachine';

// ============================================================================
// EXHAUSTIVE: every state × event combination
// ============================================================================

describe('Exhaustive state × event matrix', () => {
  for (const state of ALL_STATES) {
    for (const event of ALL_EVENTS) {
      it(`${state} + ${event} → defined result or explicit null`, () => {
        const result = transition(state, event);
        // Must be either a valid state or explicitly null
        if (result !== null) {
          expect(ALL_STATES).toContain(result);
        } else {
          expect(result).toBeNull();
        }
      });
    }
  }

  it('total matrix covers 36 combinations (6 states × 6 events)', () => {
    let count = 0;
    for (const state of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        transition(state, event); // no throw
        count++;
      }
    }
    expect(count).toBe(36);
  });

  it('canTransition agrees with transition for all combinations', () => {
    for (const state of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        const result = transition(state, event);
        expect(canTransition(state, event)).toBe(result !== null);
      }
    }
  });

  it('tryTransition agrees with transition for all combinations', () => {
    for (const state of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        const direct = transition(state, event);
        const rich = tryTransition(state, event);
        expect(rich.success).toBe(direct !== null);
        expect(rich.to).toBe(direct);
        expect(rich.from).toBe(state);
        expect(rich.event).toBe(event);
        if (!rich.success) {
          expect(rich.reason).toBeDefined();
        }
      }
    }
  });

  it('getAvailableEvents returns only valid events for each state', () => {
    for (const state of ALL_STATES) {
      const available = getAvailableEvents(state);
      for (const event of available) {
        expect(transition(state, event)).not.toBeNull();
      }
      // Events NOT in available must return null
      for (const event of ALL_EVENTS) {
        if (!available.includes(event)) {
          expect(transition(state, event)).toBeNull();
        }
      }
    }
  });
});

// ============================================================================
// TERMINATION: no infinite cycles, bounded paths
// ============================================================================

describe('Termination & cycle safety', () => {
  it('any state reaches a terminal state in ≤ 3 transitions', () => {
    // BFS from each non-terminal state to find shortest path to terminal
    for (const start of ALL_STATES) {
      if (isTerminalState(start)) continue;

      const visited = new Set<LegalValidationState>();
      let frontier: LegalValidationState[] = [start];
      let depth = 0;
      let reachedTerminal = false;

      while (frontier.length > 0 && depth <= 3) {
        const next: LegalValidationState[] = [];
        for (const state of frontier) {
          if (isTerminalState(state)) {
            reachedTerminal = true;
            break;
          }
          visited.add(state);
          const events = getAvailableEvents(state);
          for (const event of events) {
            const target = transition(state, event);
            if (target && !visited.has(target)) {
              next.push(target);
            }
          }
        }
        if (reachedTerminal) break;
        frontier = next;
        depth++;
      }

      expect(reachedTerminal).toBe(true);
    }
  });

  it('approved → RESET → pending → APPROVE → approved is exactly 2 hops', () => {
    const s1 = transition('approved', 'RESET');
    expect(s1).toBe('pending');
    const s2 = transition(s1!, 'APPROVE');
    expect(s2).toBe('approved');
  });

  it('rejected → RESET → pending → REJECT → rejected is exactly 2 hops', () => {
    const s1 = transition('rejected', 'RESET');
    expect(s1).toBe('pending');
    const s2 = transition(s1!, 'REJECT');
    expect(s2).toBe('rejected');
  });

  it('escalated can resolve to approved or rejected in 1 hop', () => {
    expect(transition('escalated', 'APPROVE')).toBe('approved');
    expect(transition('escalated', 'REJECT')).toBe('rejected');
  });

  it('not_required → approved requires exactly 2 hops', () => {
    const s1 = transition('not_required', 'REQUEST_REVIEW');
    expect(s1).toBe('pending');
    const s2 = transition(s1!, 'APPROVE');
    expect(s2).toBe('approved');
  });
});

// ============================================================================
// PREDICATE CONSISTENCY
// ============================================================================

describe('Predicate consistency across all states', () => {
  it('isTerminalState and requiresAction are mutually exclusive', () => {
    for (const state of ALL_STATES) {
      if (isTerminalState(state)) {
        expect(requiresAction(state)).toBe(false);
      }
    }
  });

  it('not_required is neither terminal nor requires action', () => {
    expect(isTerminalState('not_required')).toBe(false);
    expect(requiresAction('not_required')).toBe(false);
  });

  it('every state that requiresAction has at least one path to a terminal state', () => {
    for (const state of ALL_STATES) {
      if (!requiresAction(state)) continue;
      const events = getAvailableEvents(state);
      const reachable = events.map(e => transition(state, e)).filter(Boolean) as LegalValidationState[];
      const canReachTerminal = reachable.some(s => isTerminalState(s) || requiresAction(s));
      expect(canReachTerminal).toBe(true);
    }
  });
});

// ============================================================================
// LEGACY COMPATIBILITY: all known DB values
// ============================================================================

describe('Legacy mapping completeness', () => {
  const KNOWN_LEGACY_VALUES: [string | null | undefined, LegalValidationState][] = [
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
  ];

  it.each(KNOWN_LEGACY_VALUES)(
    'mapLegacyStatus(%j) → %s',
    (input, expected) => {
      expect(mapLegacyStatus(input)).toBe(expected);
    }
  );

  it('unknown values default to pending (safe fallback)', () => {
    const unknowns = ['foo', 'bar', 'active', 'deleted', 'archived', 'unknown_status'];
    for (const v of unknowns) {
      expect(mapLegacyStatus(v)).toBe('pending');
    }
  });

  it('case-insensitive mapping for known values', () => {
    expect(mapLegacyStatus('PENDING')).toBe('pending');
    expect(mapLegacyStatus('Approved')).toBe('approved');
    expect(mapLegacyStatus('REJECTED')).toBe('rejected');
    expect(mapLegacyStatus('In_Review')).toBe('in_review');
    expect(mapLegacyStatus('ESCALATED')).toBe('escalated');
  });

  it('whitespace-padded values are trimmed correctly', () => {
    expect(mapLegacyStatus('  pending  ')).toBe('pending');
    expect(mapLegacyStatus('\tapproved\n')).toBe('approved');
  });
});

// ============================================================================
// ROUND-TRIP CONSISTENCY
// ============================================================================

describe('Round-trip: mapLegacyStatus ↔ toLegacyStatus', () => {
  it('canonical DB values survive map → to → map', () => {
    const canonicalDbValues = ['pending', 'approved', 'rejected', 'escalated'];
    for (const v of canonicalDbValues) {
      const canonical = mapLegacyStatus(v);
      const legacy = toLegacyStatus(canonical);
      const back = mapLegacyStatus(legacy);
      expect(back).toBe(canonical);
    }
  });

  it('null round-trips: null → not_required → null → not_required', () => {
    const canonical = mapLegacyStatus(null);
    expect(canonical).toBe('not_required');
    const legacy = toLegacyStatus(canonical);
    expect(legacy).toBeNull();
    const back = mapLegacyStatus(legacy);
    expect(back).toBe('not_required');
  });

  it('review_required round-trips through in_review', () => {
    const canonical = mapLegacyStatus('review_required');
    expect(canonical).toBe('in_review');
    const legacy = toLegacyStatus(canonical);
    expect(legacy).toBe('review_required');
    const back = mapLegacyStatus(legacy);
    expect(back).toBe('in_review');
  });

  it('toLegacyStatus covers all canonical states', () => {
    for (const state of ALL_STATES) {
      const legacy = toLegacyStatus(state);
      // Must be string or null, never undefined
      expect(legacy === null || typeof legacy === 'string').toBe(true);
    }
  });

  it('alias values converge to same canonical but may not round-trip to original alias', () => {
    // validated → approved → 'approved' (not 'validated')
    const canonical = mapLegacyStatus('validated');
    expect(canonical).toBe('approved');
    expect(toLegacyStatus(canonical)).toBe('approved'); // loses alias

    // auto_approved → approved → 'approved'
    const canonical2 = mapLegacyStatus('auto_approved');
    expect(canonical2).toBe('approved');
    expect(toLegacyStatus(canonical2)).toBe('approved');

    // blocked → escalated → 'escalated' (not 'blocked')
    const canonical3 = mapLegacyStatus('blocked');
    expect(canonical3).toBe('escalated');
    expect(toLegacyStatus(canonical3)).toBe('escalated');
  });
});
