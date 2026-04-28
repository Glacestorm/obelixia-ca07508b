# HR — Collective Agreements · B5D BOIB Curated Dry-Run Report

**Phase:** B5D
**Date:** 2026-04-28
**Scope:** First controlled dry-run of *real-shaped* BOIB / Illes Balears
collective-agreement metadata, in `manual_upload` mode, against the
B5C pipeline. **No DB writes. No payroll. No mass import.**
**Status:** ✅ Implemented and validated by tests.

---

## 1. Objective

Demonstrate that we can move from generic B5C fixtures to BOIB-shaped
curated payloads, while preserving every legal-safety guarantee:

- `data_completeness = 'metadata_only'`
- `ready_for_payroll = false`
- `salary_tables_loaded = false`
- `requires_human_review = true`
- `official_submission_blocked = true`
- no DB writes, no operational table touch, no payroll wiring.

## 2. Mode decision: `manual_upload`, not `http_adapter`

BOIB does not currently expose a stable, documented public JSON REST
endpoint for full-text search of collective agreements. The available
surfaces are:

- HTML search UIs (`https://www.caib.es/eboibfront/`,
  `https://intranet.caib.es/eboibfront/es/cerca-completa`)
- Daily summary HTML/PDF (Sección III, "altres disposicions")
- Open-data portal (`dadesobertes.caib.es`) without a stable
  collective-agreement dataset.

B5D therefore runs strictly in `manual_upload` mode: the operator
(admin role) curates a small payload from the canonical BOIB
publication and feeds it into the B5C pipeline via `manualPayload`.
No HTTP adapter is used. **No scraping is performed.**

## 3. Curated queries

Four small, sector-bounded queries:

1. `convenio colectivo comercio Illes Balears`
2. `convenio colectivo panadería pastelería Illes Balears`
3. `convenio colectivo hostelería Illes Balears`
4. `convenio colectivo industria alimentaria Illes Balears`

Each query corresponds to one curated fixture, with `limit ≤ 20` per
payload (verified in tests).

## 4. Fixtures

Located under `src/__tests__/hr/fixtures/collective-agreements/b5d-boib/`:

| File | Sector | Entries |
|---|---|---|
| `boib-real-curated-comercio.fixture.ts` | Comercio en general | 2 |
| `boib-real-curated-panaderia.fixture.ts` | Panadería / Pastelería / Obrador | 1 |
| `boib-real-curated-hosteleria.fixture.ts` | Hostelería | 1 |
| `boib-real-curated-alimentaria.fixture.ts` | Industria alimentaria | 1 |

Each entry uses the BOIB-style raw shape (`titulo`, `id`, `fecha`,
`url`, `ambito`, `ccaa`, `sector`) so it is consumed by
`fetchBoibAgreementMetadata` without modification. Fields not present
in the original BOIB record (`codigo`, `cnae`, effective dates, salary
data) stay omitted — never invented.

These fixtures are explicitly *curated-like* — not the verbatim
official BOIB feed. Real go-live (B5E) will require an operator to
copy each field directly from the canonical publication.

## 5. Expected dry-run output

For every payload, `runSourceFetchAndImportDryRun` returns:

- `fetch.source = 'BOIB'`
- `fetch.sourceAccessMode = 'fixture'` (because `manualPayload` is set)
- `importRun.normalized = items.length`
- `upsertPlan.toInsert` populated, `toUpdate / skipped` empty (no
  pre-existing internal codes)
- `safetySummary`:
  ```json
  {
    "allReadyForPayrollFalse": true,
    "allRequireHumanReview": true,
    "allOfficialSubmissionBlocked": true,
    "allMetadataOnly": true,
    "allBlockedFromPayroll": true
  }
  ```
- `fingerprints[<key>]` with `fnv1a32:` prefix for every record

## 6. Seed mapping

The test file ships a deterministic helper `mapBoibCandidateToSeed`:

| Curated record matches | Mapped seed |
|---|---|
| Comerç / Comercio | `COM-GEN-IB` |
| Panaderia / Pastelería / Obrador / Bolleria | `PAN-PAST-IB` |
| Hostaleria / Hostelería | `HOST-IB` |
| Indústria alimentària / Industria alimentaria | `IND-ALIM-IB` |
| Anything else | `NEW_CANDIDATE_REQUIRES_REVIEW` |

No automatic assignment is performed. Mapping is purely informational
for human reviewers in B5E.

## 7. Safety summary — verified by tests

`assertHardSafety` validates, for every normalized record:

- `ready_for_payroll === false`
- `salary_tables_loaded === false`
- `requires_human_review === true`
- `official_submission_blocked === true`
- `data_completeness === 'metadata_only'`
- `status === 'pendiente_validacion'`

Plus structural guards:

- `cnae_codes` stays `[]` when the source omits CNAE.
- `effective_start_date` / `effective_end_date` stay `null`.
- `globalThis.fetch` is never called during any B5D dry-run.
- `runSourceFetchAndImportDryRun` accepts no DB adapter parameter, so
  persistence is structurally impossible at this layer.
- Every payload has at most 20 entries.

## 8. Limitations

- ❌ No DB writes (registry, versions, sources, import_runs untouched).
- ❌ No `ready_for_payroll` activation; trigger B1 would block it
  anyway.
- ❌ No salary-table loading; that belongs to B7.
- ❌ No PDF parser; that also belongs to B7.
- ❌ No official submission; `isRealSubmissionBlocked() === true`.
- ❌ No CNAE / vigencia / agreement_code invented.
- ❌ No automatic assignment of any agreement to any company.
- ❌ No touch to `agreementSalaryResolver`, `useESPayrollBridge`,
  `payslipEngine`, operational table, RLS, migrations, edge functions.

## 9. Criteria for promoting to B5E (controlled real write)

Before any future B5E phase considers writing curated metadata to the
registry via the B5B writer, the operator must, for each candidate:

1. Manually verify `official_name` against the BOIB publication.
2. Confirm `publication_url` resolves to the canonical BOIB record.
3. Confirm `publication_date` matches the BOIB record.
4. Capture `agreement_code` only if explicitly published by BOIB.
5. Inspect the FNV-1a fingerprint and decide whether a new version is
   warranted on re-import.
6. Confirm a clean `safetySummary` from a fresh dry-run.
7. Run the writer (`runCollectiveAgreementMetadataImport`) under the
   admin-gated edge function `erp-hr-collective-agreements-importer`,
   first with `dryRun: true` and only then with `dryRun: false`,
   batching by sector.

Records remain `metadata_only + requires_human_review` even after the
real write. Promotion to `ready_for_payroll = true` requires B7
(salary-table parsing with real SHA-256) plus an additional human
approval gate documented in a future spec.

## 10. Verification

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-*.test.ts \
  src/__tests__/hr/agreement-*.test.ts \
  src/__tests__/hr/payroll-bridge-agreement-safety.test.ts \
  src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx \
  --pool=forks
```

Result: **13 files / 173 tests passed** (163 baseline B1–B6 + B5C +
10 new B5D tests).

