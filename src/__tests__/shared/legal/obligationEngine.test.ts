/**
 * Tests — Obligation Engine
 * @shared-legal-core
 */
import { describe, it, expect } from 'vitest';
import {
  computeDeadlineUrgency,
  evaluateSanctionRisk,
  filterObligationsByScope,
  sortDeadlinesByUrgency,
} from '@/shared/legal/compliance/obligationEngine';
import type {
  ObligationRule,
  SanctionRule,
  ComputedDeadline,
} from '@/shared/legal/compliance/obligationEngine';

// ============================================================================
// computeDeadlineUrgency
// ============================================================================
describe('computeDeadlineUrgency', () => {
  const ref = new Date('2025-06-15');

  it('returns overdue for past dates', () => {
    const result = computeDeadlineUrgency('2025-06-10', ref);
    expect(result.isOverdue).toBe(true);
    expect(result.urgency).toBe('overdue');
    expect(result.daysRemaining).toBe(-5);
  });

  it('returns critical for ≤3 days', () => {
    const result = computeDeadlineUrgency('2025-06-17', ref);
    expect(result.urgency).toBe('critical');
    expect(result.daysRemaining).toBe(2);
  });

  it('returns urgent for 4-7 days', () => {
    const result = computeDeadlineUrgency('2025-06-20', ref);
    expect(result.urgency).toBe('urgent');
    expect(result.daysRemaining).toBe(5);
  });

  it('returns alert for 8-15 days', () => {
    const result = computeDeadlineUrgency('2025-06-25', ref);
    expect(result.urgency).toBe('alert');
    expect(result.daysRemaining).toBe(10);
  });

  it('returns prealert for 16-30 days', () => {
    const result = computeDeadlineUrgency('2025-07-10', ref);
    expect(result.urgency).toBe('prealert');
    expect(result.daysRemaining).toBe(25);
  });

  it('returns normal for >30 days', () => {
    const result = computeDeadlineUrgency('2025-08-15', ref);
    expect(result.urgency).toBe('normal');
    expect(result.daysRemaining).toBe(61);
  });

  it('handles same-day as critical (0 days)', () => {
    const result = computeDeadlineUrgency('2025-06-15', ref);
    expect(result.urgency).toBe('critical');
    expect(result.daysRemaining).toBe(0);
    expect(result.isOverdue).toBe(false);
  });

  it('uses current date when no reference provided', () => {
    const future = new Date();
    future.setDate(future.getDate() + 100);
    const result = computeDeadlineUrgency(future.toISOString());
    expect(result.urgency).toBe('normal');
    expect(result.isOverdue).toBe(false);
  });
});

// ============================================================================
// evaluateSanctionRisk
// ============================================================================
describe('evaluateSanctionRisk', () => {
  const rule: SanctionRule = {
    id: '1',
    jurisdiction: 'ES',
    legalReference: 'LISOS Art. 6',
    infractionType: 'laboral',
    classification: 'leve',
    description: 'Test',
    sanctionMinMinor: 60,
    sanctionMaxMinor: 625,
    sanctionMinMedium: 626,
    sanctionMaxMedium: 6250,
    sanctionMinMajor: 6251,
    sanctionMaxMajor: 187515,
  };

  it('maps leve → low severity with minor range', () => {
    const result = evaluateSanctionRisk(rule, 'leve');
    expect(result.severity).toBe('low');
    expect(result.min).toBe(60);
    expect(result.max).toBe(625);
  });

  it('maps grave → high severity with medium range', () => {
    const result = evaluateSanctionRisk(rule, 'grave');
    expect(result.severity).toBe('high');
    expect(result.min).toBe(626);
    expect(result.max).toBe(6250);
  });

  it('maps muy_grave → critical severity with major range', () => {
    const result = evaluateSanctionRisk(rule, 'muy_grave');
    expect(result.severity).toBe('critical');
    expect(result.min).toBe(6251);
    expect(result.max).toBe(187515);
  });

  it('handles unknown classification with medium severity', () => {
    const result = evaluateSanctionRisk(rule, 'desconocida');
    expect(result.severity).toBe('medium');
    expect(result.min).toBe(60);
    expect(result.max).toBe(187515);
  });

  it('handles whitespace in classification', () => {
    const result = evaluateSanctionRisk(rule, '  Grave  ');
    expect(result.severity).toBe('high');
  });
});

// ============================================================================
// filterObligationsByScope
// ============================================================================
describe('filterObligationsByScope', () => {
  const rules: ObligationRule[] = [
    { id: '1', jurisdiction: 'ES', organism: 'AEAT', name: 'Mod 111', type: 'declaracion', periodicity: 'trimestral', isActive: true },
    { id: '2', jurisdiction: 'ES', organism: 'TGSS', name: 'TC1', type: 'cotizacion', periodicity: 'mensual', isActive: true },
    { id: '3', jurisdiction: 'ES-CT', organism: 'ATC', name: 'Mod 600', type: 'declaracion', periodicity: 'puntual', isActive: true },
  ];

  it('returns all when no filters', () => {
    expect(filterObligationsByScope(rules)).toHaveLength(3);
  });

  it('filters by jurisdiction', () => {
    expect(filterObligationsByScope(rules, 'ES-CT')).toHaveLength(1);
  });

  it('filters by type', () => {
    expect(filterObligationsByScope(rules, undefined, 'declaracion')).toHaveLength(2);
  });

  it('filters by both', () => {
    expect(filterObligationsByScope(rules, 'ES', 'cotizacion')).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    expect(filterObligationsByScope(rules, 'FR')).toHaveLength(0);
  });
});

// ============================================================================
// sortDeadlinesByUrgency
// ============================================================================
describe('sortDeadlinesByUrgency', () => {
  it('sorts overdue first, then by ascending days remaining', () => {
    const deadlines: ComputedDeadline[] = [
      { deadlineDate: 'a', daysRemaining: 10, urgency: 'alert', isOverdue: false },
      { deadlineDate: 'b', daysRemaining: -2, urgency: 'overdue', isOverdue: true },
      { deadlineDate: 'c', daysRemaining: 3, urgency: 'critical', isOverdue: false },
    ];
    const sorted = sortDeadlinesByUrgency(deadlines);
    expect(sorted.map(d => d.daysRemaining)).toEqual([-2, 3, 10]);
  });

  it('does not mutate original array', () => {
    const deadlines: ComputedDeadline[] = [
      { deadlineDate: 'a', daysRemaining: 5, urgency: 'urgent', isOverdue: false },
      { deadlineDate: 'b', daysRemaining: 1, urgency: 'critical', isOverdue: false },
    ];
    const sorted = sortDeadlinesByUrgency(deadlines);
    expect(sorted).not.toBe(deadlines);
    expect(deadlines[0].daysRemaining).toBe(5);
  });
});
