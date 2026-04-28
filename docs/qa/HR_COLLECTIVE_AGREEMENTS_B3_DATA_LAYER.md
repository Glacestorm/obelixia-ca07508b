# HR — Collective Agreements · B3 Data Layer (DB-first + legacy fallback)

**Phase:** B3
**Date:** 2026-04-28
**Scope:** Read-only data access layer for collective agreements.
**Status:** ✅ Implemented. **Not connected to payroll engines.**

---

## 1. What B3 does

Adds a single read entry point used by the ERP frontend and future
features to query collective agreements:

- `src/lib/hr/collectiveAgreementRegistry.ts` — pure functions.
- `src/hooks/erp/hr/useCollectiveAgreementRegistry.ts` — React wrapper.

Public API:

| Function | Purpose |
|---|---|
| `getCollectiveAgreementByCode(code)` | DB-first lookup by `internal_code`, with legacy TS fallback. |
| `getCollectiveAgreementsByCnae(cnae, jurisdictionCode?)` | DB-first lookup by CNAE, with legacy TS fallback when registry is empty. |
| `rankCollectiveAgreementsForActivity(input)` | Pure ranking helper for Baleares activities (bakery / retail / hospitality / food industry). |
| `canUseAgreementForPayroll(agreement)` | Pure guard returning `{ allowed, reason, requiredActions }`. **Not yet wired into payroll.** |

All results are normalized into the `UnifiedCollectiveAgreement` shape
with the full safety profile (ready_for_payroll, requires_human_review,
official_submission_blocked, salary_tables_loaded, data_completeness,
source_quality, sourceLayer, warnings[]).

---

## 2. Three layers — recap

| Layer | Storage | Role today | Touched in B3? |
|---|---|---|---|
| **Master Registry** | `erp_hr_collective_agreements_registry` (+ children) | Canonical Spanish catalog. **Primary source for B3.** | ✅ Read-only |
| **Operational table** | `erp_hr_collective_agreements` (per-company, 106 rows) | Per-company assignments managed by other modules. | ❌ Untouched |
| **Legacy TS catalog** | `src/data/hr/collectiveAgreementsCatalog.ts` | Frontend constants. **Used as fallback only.** | ✅ Read-only |

---

## 3. DB-first strategy

1. Query `erp_hr_collective_agreements_registry` first.
2. If a row exists → return it as `sourceLayer='registry'` with the
   actual safety flags from DB.
3. If no row matches → fall back to `SPANISH_COLLECTIVE_AGREEMENTS`
   from the TS catalog.
4. Network/RPC errors during step 1 also trigger the fallback (so the
   UI never breaks if Cloud is temporarily slow).

No write APIs are exposed. Inserts/updates/deletes belong to the
import pipeline (B5+).

---

## 4. Legacy TS fallback — safety contract

Legacy TS entries are **always** normalized as:

- `sourceLayer = 'legacy_static'`
- `source_quality = 'legacy_static'`
- `data_completeness = 'metadata_only'`
- `salary_tables_loaded = false`
- `ready_for_payroll = false`
- `requires_human_review = true`
- `official_submission_blocked = true`
- `warnings` includes `LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW` and
  `METADATA_ONLY_NOT_PAYROLL_READY`

Even if a future bug or attacker tampers with the TS file, the data
layer cannot mark a legacy entry as payroll-ready.

---

## 5. Baleares ranking

Pure helper `rankCollectiveAgreementsForActivity(input)` implements:

| CNAE / signal | Primary | Secondary | Warnings |
|---|---|---|---|
| 1071 / 1072 | `PAN-PAST-IB` | `IND-ALIM-IB` | — |
| 4724 | `PAN-PAST-IB` | `COM-GEN-IB` | `MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED` |
| 47 (no obrador) | `COM-GEN-IB` | — | — |
| 47 + `hasBakeryWorkshop=true` | `PAN-PAST-IB` | `COM-GEN-IB` | `BAKERY_WORKSHOP_REVIEW_REQUIRED` |
| 55 / 56 | `HOST-IB` | — | — |
| `hasOnPremiseConsumption=true` | `HOST-IB` | — | (none if true) |
| 10 + broad food manufacturing | `IND-ALIM-IB` | — | — |

Ranking always returns a list. The final pick is human.

---

## 6. Payroll guard — `canUseAgreementForPayroll`

Pure function. Returns `allowed=false` unless **every** condition is
met:

- `sourceLayer === 'registry'`
- `ready_for_payroll === true`
- `salary_tables_loaded === true`
- `requires_human_review === false`
- `official_submission_blocked === false`
- `data_completeness === 'human_validated'`
- `source_quality === 'official'`

When blocked, the `requiredActions` array tells operators exactly
what is missing. The function exists so calling code can present
honest UI states ("Convenio no validado para nómina automática").

---

## 7. Why this is NOT wired into payroll yet

B3 only ships the guard and the data layer. Wiring it into the
payroll engines is **B4** and is gated by:

1. A reviewable rollout plan touching `payslipEngine` /
   `salaryNormalizer` without breaking existing closures.
2. A migration of `erp_hr_collective_agreements` (operational) to
   reference `internal_code` from the registry.
3. Acceptance criteria signed off by a labor advisor.

Until B4 ships, payroll continues to use the existing rules in
`erp_hr_collective_agreements` and the legacy TS catalog. The new
registry is informative-only.

---

## 8. Verification

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-registry-schema.test.ts \
  src/__tests__/hr/collective-agreements-registry-seed.test.ts \
  src/__tests__/hr/collective-agreements-data-layer.test.ts \
  --pool=forks
```

Expected: **48 passed** (14 schema + 16 seed + 18 data layer).

---

## 9. What was NOT touched

- ❌ `erp_hr_collective_agreements` operational table (still 106 rows).
- ❌ Payroll engines (`payslipEngine`, `salaryNormalizer`, etc.).
- ❌ Edge functions.
- ❌ Carlos Ruiz fixtures.
- ❌ Legacy TS catalog file (only read).
- ❌ HR navigation, Command Center, flags, RLS, migrations.

No registry seed row was modified — they all keep
`ready_for_payroll=false`, `data_completeness='metadata_only'`,
`salary_tables_loaded=false`, `requires_human_review=true`,
`official_submission_blocked=true`.

---

## 10. Next phase — B4 (preview)

- Integrate `canUseAgreementForPayroll` into payroll engines as a
  blocking precondition.
- Replace TS-based agreement lookups with the new data layer in HR
  screens that today read from `SPANISH_COLLECTIVE_AGREEMENTS`.
- Start importing official salary tables (`*_salary_tables`) and
  rules (`*_rules`) for the four Baleares agreements.