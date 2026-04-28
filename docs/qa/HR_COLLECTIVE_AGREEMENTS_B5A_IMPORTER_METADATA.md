# HR — Collective Agreements · B5A Importer (metadata-only)

**Phase:** B5A
**Date:** 2026-04-28
**Scope:** Pure infrastructure for the future metadata importer.
**Status:** ✅ Implemented. **No DB writes, no payroll wiring.**

---

## 1. What B5A ships

Three pure modules and their fixtures + tests:

- `src/engines/erp/hr/collectiveAgreementsImportTypes.ts`
  Types for raw/normalized records, import results and upsert plans.
- `src/engines/erp/hr/collectiveAgreementsSourceNormalizers.ts`
  Per-source normalizers: BOE, REGCON, BOIB, plus a generic dispatcher
  that also covers DOGC, DOGV, BOJA, BOCM, BOP, OTHER.
- `src/engines/erp/hr/collectiveAgreementsImporter.ts`
  - `buildAgreementMetadataImportRun({ source, items })` — normalize +
    deduplicate, returns counts and `records[]`.
  - `planRegistryUpsert({ existingInternalCodes, records })` — splits
    into insert / update / skipped and forces sensitive flags to safe
    values on update payloads.

Test fixtures (used only by tests):

- `src/__tests__/hr/fixtures/collective-agreements/boe-metadata.fixture.ts`
- `src/__tests__/hr/fixtures/collective-agreements/regcon-metadata.fixture.ts`
- `src/__tests__/hr/fixtures/collective-agreements/boib-metadata.fixture.ts`

Tests:

- `src/__tests__/hr/collective-agreements-importer.test.ts` (16 tests).

---

## 2. Why B5A does NOT mass-import yet

B5A is the *engine*; the *runner* (a service-role edge function that
reads from BOE/BOIB/REGCON, hashes documents and writes to the
registry) is **B5B**. Splitting the work this way means:

- the normalization logic is unit-tested with fixtures, no network;
- a future runner only needs to fetch raw metadata and call
  `buildAgreementMetadataImportRun(...)` then `planRegistryUpsert(...)`;
- nothing in B5A can touch the operational table or payroll engines.

---

## 3. Source normalization rules

| Source | Normalizer | `publication_source` | `source_quality` (with URL) | `source_quality` (no URL) |
|---|---|---|---|---|
| BOE | `normalizeBoeAgreementMetadata` | `BOE` | `official` | `pending_official_validation` |
| REGCON | `normalizeRegconAgreementMetadata` | `REGCON` | `official` | `pending_official_validation` |
| BOIB | `normalizeBoibAgreementMetadata` | `BOIB` (forces `autonomous_region='IB'`) | `official` | `pending_official_validation` |
| DOGC / DOGV / BOJA / BOCM / BOP | generic | same as `source` | `official` | `pending_official_validation` |
| OTHER | generic | `OTHER` | `public_secondary` | `public_secondary` |

`internal_code` is `agreementCode` if present (uppercased), otherwise a
stable slug `SOURCE::slug(officialName)::slug(jurisdiction)`.

---

## 4. Forced safety contract

Every normalized record produced by B5A satisfies:

- `status = 'pendiente_validacion'`
- `data_completeness = 'metadata_only'`
- `salary_tables_loaded = false`
- `ready_for_payroll = false`
- `requires_human_review = true`
- `official_submission_blocked = true`

`planRegistryUpsert` re-applies these values to update payloads even if
the input record was tampered with, so a bug in a future runner cannot
elevate an existing registry row by accident.

The DB-side trigger `enforce_ca_registry_ready_for_payroll` (B1) is
the second line of defense.

---

## 5. Why no record can feed payroll

1. The safety contract above blocks `ready_for_payroll = true`.
2. The B4 safety gate (`agreementSafetyGate.ts`) refuses any registry
   agreement whose flags are not all green.
3. The B4.b resolver wiring zeroes out automatic concepts for
   `legacy_ts_fallback`, `unknown` and any blocked registry record.
4. The current operational table is untouched; existing payslips keep
   running on `origin: 'operative'`.

---

## 6. What was NOT touched

- ❌ `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver`.
- ❌ `useESPayrollBridge`.
- ❌ Operational table `erp_hr_collective_agreements`.
- ❌ Carlos Ruiz fixtures.
- ❌ Edge functions, RLS, migrations.
- ❌ Command Center, HRNavigationMenu, HRModule, flags.

---

## 7. Verification

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-*.test.ts \
  src/__tests__/hr/agreement-*.test.ts \
  src/__tests__/hr/payroll-bridge-agreement-safety.test.ts \
  src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx \
  --pool=forks
```

Result: **8 files / 104 tests passed** (B1 schema 14 + B2 seed 16 +
B3 data layer 22 + B4.a gate 12 + B4.b resolver 9 + B4.c bridge 9 +
B4.c UI 6 + B5A importer 16).

---

## 8. Next phase

- **B5B** — service-role edge function that fetches BOE/BOIB/REGCON
  metadata, hashes documents, and persists via the upsert plan.
- **B6** — orientational CNAE/territory classification.
