# HR — Collective Agreements · B4.a Safety Gate (pure)

**Phase:** B4.a — Safety gate, pure module.
**Date:** 2026-04-28
**Scope:** New pure module `agreementSafetyGate.ts` + tests + docs.
**Status:** ✅ Implemented. **Not wired into payroll yet.**

---

## 1. Goal

Provide a single, deterministic, side-effect-free function that decides
whether a collective agreement may drive **automatic payroll
computation** (base salary, plus convenio, seniority, extra payments,
annual hours).

The gate is the contract that B4.b (resolver) and B4.c (bridge / hook /
UI) will integrate against. It is intentionally created and tested
first, in isolation, so the integration phases can rely on a stable,
pure decision engine.

---

## 2. Why before integration

- **Reversible.** A pure module can be reviewed, audited and tested
  without touching live engines.
- **Determinism > AI.** Aligns with the project rule that deterministic
  calculations beat AI estimates.
- **Safety.** Adding the guard to engines without first agreeing on its
  behaviour risks breaking the operational table flow that powers
  current payroll for 106 agreements.
- **Test surface.** The pure module can be unit-tested exhaustively per
  origin and per failure path.

---

## 3. API

```ts
import {
  evaluateAgreementForPayroll,
  type AgreementOrigin,
  type AgreementSafetyCode,
  type AgreementSafetyDecision,
  type AgreementSafetyInput,
} from '@/engines/erp/hr/agreementSafetyGate';
```

`evaluateAgreementForPayroll({ agreement, origin, hasManualSalary })`
returns an `AgreementSafetyDecision`:

| Field | Meaning |
|---|---|
| `allowed` | Whether the agreement may participate in automatic payroll at all (capabilities still gated separately). |
| `origin` | Echo of the input origin. |
| `blockReason` | Top-priority block code when `allowed=false`. |
| `warnings` | Non-blocking issues callers must surface in UI. |
| `missing` | Human-readable list of missing prerequisites. |
| `canComputeBaseSalary` | Use registry/agreement to derive `ES_SAL_BASE`. |
| `canComputePlusConvenio` | Use to derive `ES_COMP_CONVENIO`. |
| `canComputeSeniority` | Use to derive seniority concepts. |
| `canComputeExtraPayments` | Use `extra_payments` divisor. |
| `canComputeAnnualHours` | Derive annual hours. |

---

## 4. Rules per origin

### 4.1 `operative` (current `erp_hr_collective_agreements` table)

- `allowed = true`
- All `canCompute*` true
- `warnings = []`, `missing = []`

Reason: the operative table is the live source for payroll today and
B4.a must not regress it.

### 4.2 `registry` (new `erp_hr_collective_agreements_registry`)

Every flag must be satisfied (mirrors the DB trigger
`enforce_ca_registry_ready_for_payroll`):

| Flag | Required value |
|---|---|
| `ready_for_payroll` | `true` |
| `requires_human_review` | `false` |
| `salary_tables_loaded` | `true` |
| `source_quality` | `'official'` |
| `data_completeness` | `'human_validated'` |
| `status` | `'vigente'` or `'ultraactividad'` |
| `official_submission_blocked` | `false` |

If any condition fails → `allowed = false`, all capabilities off,
`blockReason` follows priority order:

1. `AGREEMENT_NOT_READY_FOR_PAYROLL`
2. `AGREEMENT_MISSING_SALARY_TABLES`
3. `AGREEMENT_REQUIRES_HUMAN_REVIEW`
4. `AGREEMENT_NON_OFFICIAL_SOURCE`
5. `AGREEMENT_STATUS_NOT_VIGENTE`

`missing[]` always lists every failing prerequisite.

### 4.3 `legacy_ts_fallback` (TS catalog)

- `allowed = true` (informational mode preserved)
- All `canCompute*` **false**
- `warnings = ['LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW']`
- `missing = ['registry_validated_agreement']`

Reason: the TS catalog has no salary tables, no version control, no
human validation. It can show context but cannot drive automatic
payroll concepts.

### 4.4 `unknown` / null agreement + manual salary

- `allowed = true`
- All `canCompute*` false
- `warnings = ['MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT']`
- `missing = ['validated_agreement']`

Reason: payroll can run on the manually entered salary, but no
agreement-derived concepts may be computed automatically.

### 4.5 `unknown` / null agreement without manual salary

- `allowed = false`
- `blockReason = 'AGREEMENT_NOT_READY_FOR_PAYROLL'`
- `missing = ['agreement', 'manual_salary']`

---

## 5. Granular capabilities

The five capability flags let future callers degrade gracefully. A
blocked or legacy agreement still allows the payroll cycle to advance
with a clear UI banner, but **must not** be used to compute any of:

- Salario base
- Plus convenio
- Antigüedad
- Pagas extra (divisor)
- Jornada anual

---

## 6. What blocks vs warns

| Situation | Blocks computation? | Warning surfaced |
|---|---|---|
| Registry agreement not validated | ✅ block | — |
| Legacy TS fallback | ❌ allow base flow | `LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW` |
| Manual salary + no validated agreement | ❌ allow base flow | `MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT` |
| Operative table | ❌ never blocks | — |
| No agreement, no manual salary | ✅ block | — |

---

## 7. Out of scope (B4.a explicitly does NOT)

- ❌ Modify `agreementSalaryResolver.ts`
- ❌ Modify `useESPayrollBridge.ts`
- ❌ Modify `payslipEngine`, `payrollRunEngine`, `salaryNormalizer`
- ❌ Touch the operational table `erp_hr_collective_agreements`
- ❌ Activate `ready_for_payroll = true` for any registry seed
- ❌ Touch RLS, migrations, edge functions, fixtures, Command Center,
  HRNavigationMenu, HRModule, flags, `persisted_priority_apply`,
  `C3B3C2`

---

## 8. Verification

```
bunx vitest run \
  src/__tests__/hr/collective-agreements-registry-schema.test.ts \
  src/__tests__/hr/collective-agreements-registry-seed.test.ts \
  src/__tests__/hr/collective-agreements-data-layer.test.ts \
  src/__tests__/hr/agreement-safety-gate.test.ts \
  --pool=forks
```

Expected: **60 passed** (14 schema + 16 seed + 18 data layer + 12 gate).

The pure-module assertion (test #11) reads the source file and verifies
no Supabase / React / hook imports and no `fetch(` / `createClient`
calls leak in.

---

## 9. Next phases

- **B4.b** — defensive wiring in `agreementSalaryResolver`. Add an
  optional `origin` parameter (default `'operative'` to preserve
  current behaviour). When `origin !== 'operative'` and the gate
  returns `allowed=false`, return a safe-mode salary resolution.
- **B4.c** — wiring in `useESPayrollBridge`, `useCollectiveAgreementRegistry`
  and `PayrollSafeModeBlock` (rendering of new warnings only, no logic).

Both later phases will consume the gate **without changing it**.
