/**
 * F9 — Treasury Deadline Urgency via Shared Legal Core
 * Tests the `enrichWithUrgency` pure function that bridges Treasury items
 * with `computeDeadlineUrgency` from the obligation engine.
 */
import { describe, it, expect } from 'vitest';
import { enrichWithUrgency } from '@/hooks/admin/useHRTreasuryIntegration';
import type { TreasuryIntegration } from '@/hooks/admin/useHRTreasuryIntegration';

function makeItem(overrides: Partial<TreasuryIntegration>): TreasuryIntegration {
  return {
    id: 'test-1',
    company_id: 'c1',
    source_type: 'payroll',
    source_id: 's1',
    source_reference: null,
    payable_id: null,
    beneficiary_type: 'employee',
    beneficiary_id: null,
    beneficiary_name: 'Test',
    amount: 1000,
    currency: 'EUR',
    due_date: '2025-06-20',
    payment_date: null,
    status: 'pending',
    payment_method: 'transfer',
    payment_reference: null,
    bank_account_iban: null,
    ...overrides,
  } as TreasuryIntegration;
}

const ref = new Date('2025-06-15');

describe('enrichWithUrgency (F9 — Treasury × Shared Legal Core)', () => {
  it('overdue payment → urgency overdue, negative daysRemaining', () => {
    const items = [makeItem({ due_date: '2025-06-10' })];
    const result = enrichWithUrgency(items, ref);
    expect(result).toHaveLength(1);
    expect(result[0].urgency.urgency).toBe('overdue');
    expect(result[0].urgency.isOverdue).toBe(true);
    expect(result[0].urgency.daysRemaining).toBe(-5);
  });

  it('payment due in 2 days → critical', () => {
    const items = [makeItem({ due_date: '2025-06-17' })];
    const result = enrichWithUrgency(items, ref);
    expect(result[0].urgency.urgency).toBe('critical');
  });

  it('payment due in 5 days → urgent', () => {
    const items = [makeItem({ due_date: '2025-06-20' })];
    const result = enrichWithUrgency(items, ref);
    expect(result[0].urgency.urgency).toBe('urgent');
  });

  it('payment due in 10 days → alert', () => {
    const items = [makeItem({ due_date: '2025-06-25' })];
    const result = enrichWithUrgency(items, ref);
    expect(result[0].urgency.urgency).toBe('alert');
  });

  it('payment due in 60 days → normal', () => {
    const items = [makeItem({ due_date: '2025-08-14' })];
    const result = enrichWithUrgency(items, ref);
    expect(result[0].urgency.urgency).toBe('normal');
  });

  it('filters out paid/cancelled items', () => {
    const items = [
      makeItem({ id: '1', status: 'pending', due_date: '2025-06-20' }),
      makeItem({ id: '2', status: 'paid', due_date: '2025-06-18' }),
      makeItem({ id: '3', status: 'cancelled', due_date: '2025-06-19' }),
      makeItem({ id: '4', status: 'scheduled', due_date: '2025-06-22' }),
    ];
    const result = enrichWithUrgency(items, ref);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['1', '4']);
  });
});
