

# Plan: F8 — Fiscal Shared Legal Core Adoption

## Analysis Summary

After thorough exploration, the **Fiscal module itself** (Modelo 111/190 builders in `aeatArtifactEngine.ts`, `fiscalMonthlyExpedientEngine.ts`) does NOT hardcode SS/IRPF rates — it receives computed data as inputs from the payroll pipeline. The real hardcodes feeding fiscal processes live in two HR engines:

1. **`ssContributionEngine.ts`** — `DEFAULT_SS_RATES_2026` (line 173-186): all 11 rates hardcoded, correct values but not sourced from shared core
2. **`payrollConceptCatalog.ts`** — `default_percentage` values (4.70, 1.55, 0.10, 23.60, 5.50, 0.20, etc.) hardcoded inline in concept definitions

The `regulatoryCalendarEngine.ts` has its own deadline urgency system but serves a different purpose (UI calendar with business days) than `computeDeadlineUrgency` (compliance alerts), so unifying those is out of scope for this phase.

## Scope Decision

**In scope (clear benefit, low risk):**
- Replace `DEFAULT_SS_RATES_2026` in `ssContributionEngine.ts` with shared core import

**Out of scope (risk > benefit for F8):**
- `payrollConceptCatalog.ts` — The `default_percentage` values are metadata defaults in a concept catalog array, not runtime calculation rates. They're used as fallback display values. Replacing them with dynamic imports would change the catalog's nature from static metadata to dynamic. Defer to a future phase.
- `regulatoryCalendarEngine.ts` — Its `DeadlineUrgency` type has different semantics (`ok`, `upcoming`, `insufficient`, `not_applicable`) vs the shared SM urgency. Different domain, different purpose. No benefit in unifying now.

## Changes

### File 1: `src/engines/erp/hr/ssContributionEngine.ts`

**Add import:**
```typescript
import { SS_CONTRIBUTION_RATES_2026 } from '@/shared/legal/rules/ssRules2026';
```

**Replace hardcoded `DEFAULT_SS_RATES_2026` (lines 173-186) with:**
```typescript
/** Default rates 2026 (Régimen General) — derived from Shared Legal Core */
const DEFAULT_SS_RATES_2026 = {
  tipo_cc_empresa: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa,
  tipo_cc_trabajador: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador,
  tipo_desempleo_empresa_gi: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa,
  tipo_desempleo_trabajador_gi: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador,
  tipo_desempleo_empresa_td: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa,
  tipo_desempleo_trabajador_td: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador,
  tipo_fogasa: SS_CONTRIBUTION_RATES_2026.fogasa.empresa,
  tipo_fp_empresa: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa,
  tipo_fp_trabajador: SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador,
  tipo_mei: SS_CONTRIBUTION_RATES_2026.mei.total,
  tipo_at_empresa: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa,
};
```

Same keys, same types, same values — only the source changes. All consumers of `DEFAULT_SS_RATES_2026` within the file continue working without modification.

### File 2: `src/__tests__/engines/ssContributionSharedCore.test.ts` (create)

Minimal test verifying that `DEFAULT_SS_RATES_2026` derived values match expected canonical values (MEI=0.90, CC empresa=23.60, etc.). Ensures the shared core link doesn't silently break.

## Files

| File | Action |
|---|---|
| `src/engines/erp/hr/ssContributionEngine.ts` | Import shared + replace hardcode |
| `src/__tests__/engines/ssContributionSharedCore.test.ts` | Create (5-6 value verification tests) |

## Files NOT touched

- `aeatArtifactEngine.ts` — no hardcoded rates, receives data as input
- `fiscalMonthlyExpedientEngine.ts` — same, pure builder
- `regulatoryCalendarEngine.ts` — different urgency semantics, out of scope
- `payrollConceptCatalog.ts` — static metadata, deferred
- Edge functions — rule #5
- Tables — rule #1

## Compatibility

The object `DEFAULT_SS_RATES_2026` retains identical keys and number types. All internal consumers (`getSSGroupLimitsForEngine`, `computeSSContributions`, etc.) are unaffected.

## Pending for future phases

| Item | Reason to defer |
|---|---|
| `payrollConceptCatalog.ts` default_percentage | Static metadata, needs design decision on whether to make dynamic |
| `regulatoryCalendarEngine.ts` urgency unification | Different semantic domains (calendar vs compliance) |
| Fiscal AI Agent panel consuming `ObligationRule` | Agent uses AI prompts, not structured rules — needs separate integration design |

## Risk

Minimal. Same pattern proven in F5 (HRSocialSecurityBridge) and validated by HR payroll `ss-contributions.ts` which already consumes from shared core successfully.

