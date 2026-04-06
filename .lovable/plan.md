

# Plan: F9 — Treasury Deadlines via Shared Legal Core

## Integration Point

**File**: `src/hooks/admin/useHRTreasuryIntegration.ts`

This hook is the central Treasury integration layer. It already has:
- `getTreasurySummary` (lines 400-433): manually computes overdue/upcoming using raw date string comparisons (`i.due_date < today`)
- `getOverdueItems` (lines 436-455): simple DB query
- `getUpcomingPayments` (lines 458-479): simple DB query

The manual overdue/upcoming logic in `getTreasurySummary` is the ideal replacement target — it duplicates urgency classification that `computeDeadlineUrgency` already provides with richer granularity (critical/urgent/alert/prealert/normal/overdue).

## Changes

### Action 1: Add urgency enrichment utility to `useHRTreasuryIntegration.ts`

Import `computeDeadlineUrgency` and its `ComputedDeadline` type from the shared core. Add a pure function that enriches `TreasuryIntegration[]` items with computed urgency:

```typescript
import { computeDeadlineUrgency, type ComputedDeadline } from '@/shared/legal/compliance/obligationEngine';

export interface TreasuryIntegrationWithUrgency extends TreasuryIntegration {
  urgency: ComputedDeadline;
}

function enrichWithUrgency(
  items: TreasuryIntegration[],
  referenceDate?: Date
): TreasuryIntegrationWithUrgency[] {
  return items
    .filter(i => i.status === 'pending' || i.status === 'scheduled')
    .map(i => ({
      ...i,
      urgency: computeDeadlineUrgency(i.due_date, referenceDate),
    }));
}
```

### Action 2: Add `getPaymentUrgencies` function to the hook

A new exported function that fetches pending/scheduled integrations and returns them enriched with shared core urgency levels:

```typescript
const getPaymentUrgencies = useCallback(async (
  companyId: string
): Promise<TreasuryIntegrationWithUrgency[]> => {
  try {
    const { data, error } = await supabase
      .from('erp_hr_treasury_integration')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['pending', 'scheduled'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return enrichWithUrgency((data || []) as TreasuryIntegration[]);
  } catch (err) {
    console.error('[useHRTreasuryIntegration] getPaymentUrgencies error:', err);
    return [];
  }
}, []);
```

This is **additive** — existing `getTreasurySummary`, `getOverdueItems`, and `getUpcomingPayments` remain untouched. The new function provides richer urgency data for consumers that want it, without breaking anything.

### Action 3: Tests

Create `src/__tests__/hooks/useTreasuryDeadlineUrgency.test.ts`:

Tests verify the `enrichWithUrgency` logic (pure function) plus round-trip with `computeDeadlineUrgency`:

1. Overdue payment → urgency = `'overdue'`, negative `daysRemaining`
2. Payment due in 2 days → urgency = `'critical'`
3. Payment due in 5 days → urgency = `'urgent'`
4. Payment due in 10 days → urgency = `'alert'`
5. Payment due in 60 days → urgency = `'normal'`
6. Paid/cancelled items filtered out (only pending/scheduled enriched)

## Files

| File | Action |
|---|---|
| `src/hooks/admin/useHRTreasuryIntegration.ts` | Add import, `enrichWithUrgency`, `getPaymentUrgencies`, export new interface |
| `src/__tests__/hooks/useTreasuryDeadlineUrgency.test.ts` | Create (6 tests) |

## Files NOT touched

- `TreasuryDashboard.tsx` — no UI changes
- `useERPTreasury.ts` — different hook (stats only, no due dates)
- `PayablesManager.tsx` / `ReceivablesManager.tsx` — UI consumers, out of scope
- Edge functions — rule #4
- Tables — rule from context

## Compatibility

| Aspect | Guarantee |
|---|---|
| Existing functions | `getTreasurySummary`, `getOverdueItems`, `getUpcomingPayments` unchanged |
| Return types | `TreasuryIntegration` unchanged; new `TreasuryIntegrationWithUrgency` extends it |
| UI consumers | No existing consumer broken; new `getPaymentUrgencies` is opt-in |

## Risk

| Risk | Level | Mitigation |
|---|---|---|
| New function unused by UI | None | Additive API — UI adoption is next phase |
| `computeDeadlineUrgency` thresholds differ from Treasury expectations | Low | Thresholds (3/7/15/30 days) are reasonable for payment urgency; same used across HR compliance |

