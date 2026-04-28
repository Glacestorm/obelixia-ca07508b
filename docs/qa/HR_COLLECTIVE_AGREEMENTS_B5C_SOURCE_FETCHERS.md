# HR — Collective Agreements · B5C Source Fetchers + Dry-Run Pipeline

**Phase:** B5C
**Date:** 2026-04-28
**Scope:** Official source fetchers (BOE / BOIB / REGCON) wired to the
B5A normalizer and B5B-compatible upsert planner, runnable in dry-run
mode against fixtures or a mocked HTTP adapter.
**Status:** ✅ Implemented. **No DB writes, no payroll wiring, no real
network call inside tests.**

---

## 1. What B5C ships

- `src/engines/erp/hr/collectiveAgreementsSourceFetchers.ts` — pure /
  semi-pure module that exposes:
  - `fetchBoeAgreementMetadata(request, adapter)`
  - `fetchBoibAgreementMetadata(request, adapter)`
  - `fetchRegconAgreementMetadata(request, adapter?)`
  - `fetchAgreementMetadataFromSource(request, adapter)` — dispatcher.
  - `runSourceFetchAndImportDryRun(...)` — fetch → normalize → plan →
    safety summary, **without any DB write**.
  - `computeSourceDocumentFingerprint(...)` — deterministic FNV-1a
    fingerprint (see §6) used as a preparatory hash for B7.
- Fixtures (test-only):
  - `boe-search-response.fixture.ts`
  - `boib-search-response.fixture.ts`
  - `regcon-search-response.fixture.ts`
- Tests:
  - `collective-agreements-source-fetchers.test.ts` (14 tests).
  - `collective-agreements-import-dryrun-pipeline.test.ts` (6 tests).

## 2. What dry-run does

Given a `SourceFetchRequest`, an injectable `AgreementSourceHttpAdapter`
(or a `manualPayload` for sources without a public API), and the list
of `existingInternalCodes` already present in the registry, the
pipeline:

1. Calls the appropriate source fetcher.
2. Filters out non-agreement noise (resoluciones, oposiciones,
   subvenciones, etc.) before normalization.
3. Runs `buildAgreementMetadataImportRun` (B5A) to normalize and
   deduplicate the records.
4. Runs `planRegistryUpsert` (B5A) to split into insert / update /
   skipped buckets, re-stripping sensitive flags on update.
5. Builds a `safetySummary`:
   - `allReadyForPayrollFalse`
   - `allRequireHumanReview`
   - `allOfficialSubmissionBlocked`
   - `allMetadataOnly`
   - `allBlockedFromPayroll`
6. Returns a `fingerprints` map keyed by `agreementCode` /
   `sourceId` / `officialName` (in that order of preference).

## 3. What B5C does NOT do

- ❌ No aggressive scraping of any official portal.
- ❌ No mass import (one fetch per call, bounded by `request.limit`).
- ❌ No writes to `erp_hr_collective_agreements_registry` or any
  registry-related table.
- ❌ No activation of `ready_for_payroll`, `salary_tables_loaded`, or
  any payroll wiring.
- ❌ No touch to the operational table `erp_hr_collective_agreements`.
- ❌ No real `fetch()` call inside tests (verified by a guard test
  that swaps `globalThis.fetch` with a spy).
- ❌ No mutation of RLS, migrations, edge functions or auth.

## 4. How BOE / BOIB / REGCON are used

| Source | Default mode | Trigger keywords kept | Filter examples |
|---|---|---|---|
| BOE | `http_adapter` (or `fixture` via `manualPayload`) | "convenio colectivo", "tablas salariales", "revisión salarial" | drops "oposiciones", "real decreto sobre el régimen jurídico" |
| BOIB | `http_adapter` (or `fixture`) | agreement keywords + "comerç/comercio", "panaderia/pastelería", "hostaleria/hostelería", "obrador" | drops "subvencions" |
| REGCON | `manual_upload` ALWAYS unless `manualPayload` is supplied | n/a (operator-curated) | n/a |

The fetchers NEVER fabricate `cnae_codes`, `effective_start_date`,
`effective_end_date`, `sector` or `scope_type` when the source omits
them. Missing fields stay `undefined`, so the B5A normalizer keeps the
record at `data_completeness = 'metadata_only'`.

## 5. REGCON limitation

REGCON does not currently expose a stable public REST API that we can
rely on contractually. The fetcher therefore:

- always emits `sourceAccessMode: 'manual_upload'`;
- always emits warnings:
  - `SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION`
  - `REGCON_NO_PUBLIC_API_USE_MANUAL_UPLOAD`
- only parses items when an operator explicitly supplies a
  `manualPayload` (e.g. an upload form in B5D).

No scraping of REGCON is performed, by design.

## 6. Fingerprint / hash preparatorio

`computeSourceDocumentFingerprint` is **not** a SHA-256. It is a
deterministic FNV-1a 32-bit hash of the concatenation:

```
title | publicationDate | documentUrl | sourceUrl
```

Properties:

- Deterministic across Node, Deno and the browser (no Web Crypto).
- Changes when title, publicationDate or documentUrl change.
- **Does not depend solely on `publication_url`** (a dedicated test
  asserts this), so a silent edit of the title or date still produces
  a different fingerprint.

This fingerprint is preparatory: **B7 will replace it with a real
SHA-256** computed server-side over the actual document bytes. Until
then, B5C uses this hash to give the dry-run pipeline a stable change
signal that does not lie about being cryptographic.

## 7. Safety contract — verified in tests

- Every normalized record carries `ready_for_payroll = false`,
  `salary_tables_loaded = false`, `requires_human_review = true`,
  `official_submission_blocked = true`, `data_completeness =
  'metadata_only'`, `status = 'pendiente_validacion'`.
- Update-bucket records are re-stripped by `planRegistryUpsert`.
- `safetySummary` aggregates the booleans for fast inspection by
  callers / future UI.
- Dry-run pipeline accepts NO DB adapter: persistence is structurally
  impossible at this layer.

## 8. Verification

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-*.test.ts \
  src/__tests__/hr/agreement-*.test.ts \
  src/__tests__/hr/payroll-bridge-agreement-safety.test.ts \
  src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx \
  --pool=forks
```

Result: **12 files / 163 tests passed** (143 baseline B1–B6 + B5B +
20 new B5C tests).

## 9. Next phases

- **B5D** — controlled real import of a small batch (single source,
  small limit, dryRun=false), wired to the B5B writer behind admin
  auth, with explicit operator confirmation.
- **B7** — salary table parser (PDF/HTML) with real SHA-256 over
  document bytes, replacing the FNV-1a fingerprint.

