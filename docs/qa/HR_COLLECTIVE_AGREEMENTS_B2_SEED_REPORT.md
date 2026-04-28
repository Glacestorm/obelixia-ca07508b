# HR — Collective Agreements Master Registry · B2 Seed Report

**Phase:** B2 — Seed legacy + Baleares reforzado
**Date:** 2026-04-28
**Scope:** Initial safe seed of `erp_hr_collective_agreements_registry` and child tables.
**Status:** ✅ Completed — 25 entries inserted (21 legacy + 4 Baleares reinforced).

---

## 1. Three layers of collective agreements (do not confuse)

| Layer | Table | Purpose | Touched in B2? |
|-------|-------|---------|----------------|
| **Legacy TS catalog** | `src/data/hr/collectiveAgreementsCatalog.ts` | In-app fallback / hard-coded constants used by current payroll metadata | ❌ Not modified |
| **Operational table (per-company)** | `erp_hr_collective_agreements` | Per-company operational agreement assignments (106 rows pre-existing) | ❌ Not modified |
| **Master Registry (public catalog)** | `erp_hr_collective_agreements_registry` (+ 5 child tables) | Canonical Spanish catalog: versions, salary tables, rules, sources, import audit | ✅ Seeded (this phase) |

The three layers coexist. B3 will introduce the DB-first data layer with legacy TS as fallback.

---

## 2. What was seeded

- **21 legacy national agreements** migrated from `SPANISH_COLLECTIVE_AGREEMENTS`:
  CONST-GEN, METAL-NAC, HOST-NAC, COM-GRANDES, TRANS-MERCAN, OFIC-NAC, LIMP-NAC, SEG-PRIV, SAN-PRIV, ENS-PRIV, QUIM-NAC, ALIM-NAC, TEXT-NAC, MADERA-NAC, GRAF-NAC, BANCA-NAC, SEG-NAC, TIC-NAC, CONTACT-NAC, VIAJES-NAC, AGRO-NAC.
- **4 reinforced Baleares agreements** (see `HR_COLLECTIVE_AGREEMENTS_BALEARES_COVERAGE.md`):
  COM-GEN-IB, PAN-PAST-IB, HOST-IB, IND-ALIM-IB.
- **25 initial versions** in `erp_hr_collective_agreements_registry_versions`
  (`version_label='metadata-seed-v1'`, `change_type='initial_text'`, `is_current=true`).
- **25 pending sources** in `erp_hr_collective_agreements_registry_sources`
  (`source_type='OTHER'` for legacy, `'BOIB'` for Baleares; `status='pending'`).
- **1 audit record** in `erp_hr_collective_agreements_registry_import_runs`
  (`source='legacy_ts_catalog_seed'`, `status='completed'`, totals reflected in `report_json`).

## 3. Safety state of every seeded record

All 25 entries were created with the same legal-safety profile:

| Field | Value | Reason |
|-------|-------|--------|
| `status` | `pendiente_validacion` | No human validation yet |
| `source_quality` | `legacy_static` (legacy) / `pending_official_validation` (Baleares) | No verified BOE/BOIB/REGCON document |
| `data_completeness` | `metadata_only` | No salary tables, no full text, no rule parsing |
| `salary_tables_loaded` | `false` | Salary parser not run (B4) |
| `ready_for_payroll` | `false` | **Hard requirement** — automatic payroll forbidden |
| `requires_human_review` | `true` | Manual validation pending |
| `official_submission_blocked` | `true` | No official filings (AFI/Contrat@/etc.) can use these |

## 4. Why everything stays `metadata_only`

The B1 trigger `enforce_ca_registry_ready_for_payroll` blocks any update that
sets `ready_for_payroll=true` unless **all** of the following are true:

- `salary_tables_loaded=true`
- `requires_human_review=false`
- `source_quality='official'`
- `data_completeness='human_validated'`
- `status IN ('vigente','ultraactividad')`

B2 deliberately does **not** load salary tables, parse rules, nor mark
anything as official. Therefore **no record in the registry can drive
automatic payroll today**, by construction.

## 5. Idempotency

The seed is idempotent on `internal_code`:
- If the row exists, only safe metadata fields are refreshed
  (`official_name`, `cnae_codes`, `notes`, `updated_at`).
- Safety flags (`ready_for_payroll`, `data_completeness`,
  `salary_tables_loaded`) are **never overwritten**.
- Re-running the seed leaves counts unchanged.

## 6. What was NOT touched

- ❌ `erp_hr_collective_agreements` operational table (106 rows untouched).
- ❌ Payroll engines (`payslipEngine`, `salaryNormalizer`, etc.).
- ❌ Edge functions.
- ❌ Carlos Ruiz fixtures.
- ❌ Legacy TS catalog file.
- ❌ HR navigation, Command Center, flags.

## 7. Verification

Run:

```
bunx vitest run src/__tests__/hr/collective-agreements-registry-seed.test.ts --pool=forks
```

Expected: **16 passed**.

DB verification (read-only):

```sql
SELECT count(*) FROM erp_hr_collective_agreements_registry;                     -- 25
SELECT count(*) FROM erp_hr_collective_agreements_registry WHERE ready_for_payroll = true;  -- 0
SELECT count(*) FROM erp_hr_collective_agreements_registry_versions WHERE is_current = true; -- 25
SELECT count(*) FROM erp_hr_collective_agreements;                              -- 106 (untouched)
```

## 8. Next phase (B3 — preview)

B3 will add the DB-first data access layer with legacy TS as fallback,
without enabling payroll for any agreement. Salary table import (B4) and
human validation workflow (B5) come later.