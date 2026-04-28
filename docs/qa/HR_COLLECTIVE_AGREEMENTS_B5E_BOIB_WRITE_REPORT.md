# HR — Collective Agreements · B5E BOIB Controlled Write

**Phase:** B5E
**Date:** 2026-04-28
**Scope:** First *real* (`dryRun=false`) write of the curated BOIB / Illes
Balears batch into the Master Registry, via the admin-gated B5B writer.
**Status:** ✅ Implemented and validated by tests (10 new B5E tests).

---

## 1. Objective

Promote the BOIB / Baleares batch validated in B5D from `dryRun=true` to
a **controlled real write** on `erp_hr_collective_agreements_registry`
and its child tables, via the admin-gated B5B writer. The batch is
strictly capped at 4 records.

| `internal_code` | Sector                            | Ámbito       | Source |
|---|---|---|---|
| `COM-GEN-IB`    | Comercio en general               | Autonómico IB | BOIB |
| `PAN-PAST-IB`   | Panadería / Pastelería / Obrador  | Autonómico IB | BOIB |
| `HOST-IB`       | Hostelería                        | Autonómico IB | BOIB |
| `IND-ALIM-IB`   | Industria alimentaria             | Autonómico IB | BOIB |

All four remain `metadata_only`, `requires_human_review=true`,
`official_submission_blocked=true`, `ready_for_payroll=false`,
`salary_tables_loaded=false`, `status='pendiente_validacion'`.

## 2. B5D dry-run vs B5E controlled write

| Aspect | B5D (dry-run) | B5E (controlled write) |
|---|---|---|
| Side effects | None | Writes to registry / versions / sources / import_runs |
| Source mode  | `manual_upload` curated fixtures | Same curated payload, server-side |
| Auth         | N/A | Admin JWT + `has_role('admin')` |
| `dryRun`     | `true` | `false` |
| `manualReviewed` | n/a | `true` (operator-attested) |
| Audit        | Optional | Mandatory `import_run` with full report |
| Rollback evidence | n/a | `preUpdateSnapshots` + `previousCurrentVersionId` |

## 3. Safety model

- **Admin-gated**: edge function `erp-hr-collective-agreements-importer`
  validates JWT and `has_role('admin')` (B5B).
- **Service-role**: only used **server-side**, after admin verification.
- **`forceSafetyFlags`**: re-imposes
  `ready_for_payroll=false / salary_tables_loaded=false /
  requires_human_review=true / official_submission_blocked=true /
  data_completeness='metadata_only' / status='pendiente_validacion'`
  on every record before any write. Ignores any unsafe value coming
  from the client.
- **DB trigger** `enforce_ca_registry_ready_for_payroll` would block
  any future attempt to elevate `ready_for_payroll` while
  `data_completeness='metadata_only'`.
- **Operational table untouched**: the writer's adapter contract has
  no method targeting `erp_hr_collective_agreements`. The 106 existing
  rows remain intact.

## 4. What B5E updates

For each existing seed, only `SAFE_UPDATE_FIELDS` plus `updated_at` and
`last_verified_at`:

- `official_name`, `short_name`
- `jurisdiction_code`, `autonomous_region`, `province_code`
- `sector`, `cnae_codes`
- `publication_source`, `publication_url`, `publication_date`
- `effective_start_date`, `effective_end_date`
- `notes`
- `updated_at`, `last_verified_at`

## 5. What B5E NEVER updates

- `ready_for_payroll`
- `salary_tables_loaded`
- `data_completeness`
- `requires_human_review`
- `official_submission_blocked`
- `status`
- `source_quality` (kept at `pending_official_validation` until B7)

The in-memory adapter in tests *throws* if a forbidden field appears in
the patch (`forbidden_field_in_patch:<key>`), so any regression is
caught immediately.

## 6. Sources

On insert and on hash change, a row is added to
`erp_hr_collective_agreements_registry_sources` with:

- `source_type='BOIB'`
- `source_url = publication_url`
- `document_url = publication_url` (until B7 supplies a distinct
  document URL)
- `document_hash = fnv1a32:<hex>` (preparatory hash; B7 will replace
  with real SHA-256)
- `status='pending'`
- `source_quality='pending_official_validation'`

No SHA-256 is invented in B5E.

## 7. Versioning

The writer now uses the deterministic FNV-1a fingerprint
(`computeSourceDocumentFingerprint`, shared with B5C/B5D) as the
version-change signal:

- **New record** → `metadata-import-v1`, `change_type='initial_text'`,
  `is_current=true`.
- **Existing record, same fingerprint** → no new version.
- **Existing record, fingerprint changed**:
  1. Capture `previousCurrentVersionId` (best-effort).
  2. `unsetCurrentVersions(agreementId)` flips the previous version's
     `is_current` to `false`.
  3. New version `metadata-import-YYYY-MM-DD`,
     `change_type='correction'` (schema-allowed value),
     `is_current=true`,
     `parsed_summary.reason='document_hash_change'`.
  4. Source row refreshed with the new fingerprint.

The `'correction'` value is required because the schema's CHECK
constraint accepts only
`('initial_text','salary_revision','correction','extension','denunciation','new_agreement')`.
The previous `'modificacion'` value (B5B) was a latent inconsistency
with the migration and is now corrected.

## 8. Import run

One row per execution in
`erp_hr_collective_agreements_registry_import_runs`:

```jsonc
{
  "source": "BOIB",
  "total_found": 4,
  "inserted": 0,
  "updated": 4,
  "skipped": 0,
  "errors": 0,
  "status": "completed",
  "report_json": {
    "dryRun": false,
    "manual_reviewed": true,
    "dryRunReference": "<id_of_prior_dryrun_or_null>",
    "candidateMapping": {
      "COM-GEN-IB":  { "boibId": "...", "fingerprint": "fnv1a32:...", "publicationUrl": "https://www.caib.es/..." },
      "PAN-PAST-IB": { "...": "..." },
      "HOST-IB":     { "...": "..." },
      "IND-ALIM-IB": { "...": "..." }
    },
    "safetySummary": {
      "allReadyForPayrollFalse": true,
      "allRequireHumanReview": true,
      "allOfficialSubmissionBlocked": true,
      "allMetadataOnly": true,
      "allBlockedFromPayroll": true
    },
    "preUpdateSnapshots": {
      "COM-GEN-IB":  { "official_name": "...", "publication_url": "...", "...": "..." },
      "PAN-PAST-IB": { ... }, "HOST-IB": { ... }, "IND-ALIM-IB": { ... }
    },
    "previousCurrentVersionId": {
      "COM-GEN-IB": "<uuid|null>",
      "PAN-PAST-IB": "<uuid|null>",
      "HOST-IB": "<uuid|null>",
      "IND-ALIM-IB": "<uuid|null>"
    },
    "insertedCodes": [],
    "updatedCodes": ["COM-GEN-IB","PAN-PAST-IB","HOST-IB","IND-ALIM-IB"],
    "skippedCodes": [],
    "errors": []
  }
}
```

## 9. Rollback (metadata-only)

B5E never touches the operational table, so rollback is local to the
registry tree:

1. Locate the `import_run` to revert (most recent one with the matching
   `dryRunReference`).
2. Restore safe metadata for each record from
   `report_json.preUpdateSnapshots[<internal_code>]` via a fresh admin
   call to `updateRegistryMetadata` (only safe fields).
3. For each record where `report_json.previousCurrentVersionId[<code>]`
   is non-null:
   - Set the new `metadata-import-<date>` version to `is_current=false`.
   - Set the recorded previous version id back to `is_current=true`.
   - Optionally delete the new version + the refreshed source row tied
     to that run.
4. **Never** modify `ready_for_payroll`, `salary_tables_loaded`,
   `requires_human_review`, `official_submission_blocked`,
   `data_completeness`, or `status` (they are already safe and were
   never moved by B5E).
5. **Never** touch `erp_hr_collective_agreements`.

## 10. Post-run SQL verification

```sql
-- A) The 4 records remain safe.
SELECT internal_code, official_name, data_completeness, status,
       ready_for_payroll, salary_tables_loaded,
       requires_human_review, official_submission_blocked,
       publication_url, publication_date, last_verified_at
FROM   public.erp_hr_collective_agreements_registry
WHERE  internal_code IN ('COM-GEN-IB','PAN-PAST-IB','HOST-IB','IND-ALIM-IB');
-- Expected: 4 rows, all metadata_only / pendiente_validacion / safe.

-- B) Sources created.
SELECT agreement_id, source_type, status, source_quality, document_hash
FROM   public.erp_hr_collective_agreements_registry_sources
WHERE  agreement_id IN (
  SELECT id FROM public.erp_hr_collective_agreements_registry
  WHERE  internal_code IN ('COM-GEN-IB','PAN-PAST-IB','HOST-IB','IND-ALIM-IB')
);

-- C) At most one is_current=true per agreement.
SELECT agreement_id, COUNT(*) FILTER (WHERE is_current) AS currents
FROM   public.erp_hr_collective_agreements_registry_versions
WHERE  agreement_id IN (
  SELECT id FROM public.erp_hr_collective_agreements_registry
  WHERE  internal_code IN ('COM-GEN-IB','PAN-PAST-IB','HOST-IB','IND-ALIM-IB')
)
GROUP  BY agreement_id;
-- Expected: currents <= 1 per agreement.

-- D) Operational table unchanged.
SELECT COUNT(*) FROM public.erp_hr_collective_agreements;
-- Expected: 106.

-- E) Import run snapshot.
SELECT id, source, total_found, inserted, updated, skipped, errors, status,
       report_json->>'manual_reviewed' AS manual_reviewed,
       report_json->>'dryRun'          AS dry_run
FROM   public.erp_hr_collective_agreements_registry_import_runs
ORDER  BY created_at DESC LIMIT 1;
```

## 11. Tests

`src/__tests__/hr/collective-agreements-b5e-boib-write.test.ts` — 10
tests covering:

1. `dryRun=false` with 4 pre-existing seeds → `inserted=0, updated=4,
   errors=[]`.
2. Sensitive flags remain safe after the update.
3. Patch contains only `SAFE_UPDATE_FIELDS` + `updated_at` +
   `last_verified_at`.
4. Tampered input (`ready_for_payroll=true` etc.) is neutralized by
   `forceSafetyFlags`.
5. Idempotency: two runs with the same payload do not duplicate
   versions or sources.
6. Changing `publication_url` for one record creates exactly 1 new
   version, the previous one becomes `is_current=false`, and
   `previousCurrentVersionId` is recorded.
7. `import_run.report_json` carries `manual_reviewed=true`,
   `dryRunReference`, `candidateMapping`, `safetySummary`,
   `preUpdateSnapshots`.
8. `globalThis.fetch` is never invoked.
9. The simulated operational-table tripwire stays at 0 calls.
10. No final record exposes `ready_for_payroll=true`.

Full collective-agreements suite: **147 / 147 green** (137 prior +
10 new B5E).

```bash
bunx vitest run src/__tests__/hr/collective-agreements-*.test.ts --pool=forks
```

## 12. Confirmation

- ❌ Payroll engines untouched (`payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver`, `useESPayrollBridge`).
- ❌ Operational table `erp_hr_collective_agreements` untouched
  (still 106 rows).
- ❌ No RLS or migration changes in this phase.
- ❌ No salary tables loaded.
- ❌ No `ready_for_payroll` activation.
- ❌ No real network fetch.
- ❌ No mass import — strict 4-record cap.
- ✅ Metadata rollback evidence (`preUpdateSnapshots` +
  `previousCurrentVersionId`) recorded for every run.

## 13. Next phases

- **B7** — Real PDF/HTML parser with SHA-256 hashes; populates
  `_salary_tables` and `_rules`. Replaces the FNV-1a preparatory hash.
- **B8** — Human-validation workflow signed by labor advisor (only
  path that may flip `requires_human_review` to `false`).
- **B9** — Conditional activation of `ready_for_payroll` when **all**
  trigger invariants are satisfied.