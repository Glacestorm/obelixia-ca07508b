

# Plan: F10 — Cleanup SS Engine Duplication

## Critical Discovery: Data Discrepancy

Before addressing duplication, there is a **data mismatch** between the two sources that must be resolved:

| Group | Shared Core (`ssRules2026.ts`) | Engine (`ssContributionEngine.ts`) | Knowledge Doc |
|-------|------|--------|------------|
| 1 | 1,847.40 | **1,929.00** | **1,929.00** |
| 2 | 1,531.50 | **1,599.60** | **1,599.60** |
| 3 | 1,332.90 | **1,391.70** | **1,391.70** |

The knowledge doc (`ss-cotizacion-grupos-bases-2026.md`) and the engine agree. The shared core has **stale values** (likely from 2025 or an earlier draft). This must be fixed first — otherwise replacing the engine's data with shared core would introduce incorrect bases.

## Strategy

**Step 1: Fix shared core data** — Update `SS_GROUP_BASES_2026` and `SS_GROUP_MIN_BASES_MENSUAL_2026` in `src/shared/legal/rules/ssRules2026.ts` to match the knowledge doc (G1=1929.00, G2=1599.60, G3=1391.70).

**Step 2: Structural adapter** — The engine's local `SS_GROUP_BASES_2026` has a different shape than the shared core:
- Engine: `{ base_minima_mensual, base_maxima_mensual, base_minima_diaria, base_maxima_diaria, cotizacion_tipo, descripcion }`
- Shared: `{ minMensual, maxMensual, label, isDailyBase }`

Create a derived constant that maps from shared core shape to engine shape, keeping the same keys so all internal consumers work unchanged.

**Step 3: Tests** — Extend the existing `ssContributionSharedCore.test.ts` to verify group base equivalence (G1=1929.00, G8 daily=46.04).

## Changes

### File 1: `src/shared/legal/rules/ssRules2026.ts`

Fix group bases to match RDL 3/2026 (knowledge doc):

```
Group 1: minMensual 1847.40 → 1929.00
Group 2: minMensual 1531.50 → 1599.60
Group 3: minMensual 1332.90 → 1391.70
```

Same fix in `SS_GROUP_MIN_BASES_MENSUAL_2026`:
```
1: 1847.40 → 1929.00
2: 1531.50 → 1599.60
3: 1332.90 → 1391.70
```

### File 2: `src/engines/erp/hr/ssContributionEngine.ts`

Replace the hardcoded `SS_GROUP_BASES_2026` (lines 143-162) with a derived constant:

```typescript
import {
  SS_CONTRIBUTION_RATES_2026,
  SS_GROUP_BASES_2026 as SS_GROUP_BASES_SHARED,
  SS_BASE_MAX_MENSUAL_2026,
  SS_BASE_MAX_DIARIA_2026,
} from '@/shared/legal/rules/ssRules2026';

/** Group bases derived from Shared Legal Core — mapped to engine shape */
export const SS_GROUP_BASES_2026: Record<number, { ... }> =
  Object.fromEntries(
    Object.entries(SS_GROUP_BASES_SHARED).map(([k, v]) => [
      Number(k),
      {
        base_minima_mensual: v.isDailyBase ? (v.minMensual * 30) : v.minMensual,
        base_maxima_mensual: SS_BASE_MAX_MENSUAL_2026,
        base_minima_diaria: v.isDailyBase ? v.minMensual : null,
        base_maxima_diaria: v.isDailyBase ? SS_BASE_MAX_DIARIA_2026 : null,
        cotizacion_tipo: v.isDailyBase ? 'diaria' : 'mensual',
        descripcion: v.label,
      },
    ])
  );
```

This preserves the exact same keys and types. `getDefaultTopesForGroup` and all internal consumers work unchanged.

### File 3: `src/__tests__/engines/ssContributionSharedCore.test.ts`

Add tests for group base equivalence:
- G1 base mínima mensual = 1929.00
- G8 base mínima diaria = 46.04
- G1 base máxima = 5101.20
- All groups 4-11 min mensual = 1381.20

## Files NOT touched

- `employeeLegalProfileEngine.ts` — already consumes shared via alias
- `payrollConceptCatalog.ts` — deferred (static metadata)
- Edge functions, tables — rules #4, #5

## Compatibility

| Aspect | Guarantee |
|---|---|
| Engine shape | Identical keys and types via adapter |
| Computed values | Same numbers (after shared core fix) |
| External consumers | Only import types from engine, not the constant |
| `ss-contributions.ts` | Uses `SS_GROUP_MIN_BASES_MENSUAL_2026` from shared — also fixed |

## Risks

| Risk | Level | Mitigation |
|---|---|---|
| Shared core values were wrong for G1-3 | **Fixed** | Updated to match knowledge doc and RDL 3/2026 |
| Adapter mapping for daily groups | Low | `base_minima_mensual` for G8-11 = `minMensual × 30` = 1381.20, same as current |

