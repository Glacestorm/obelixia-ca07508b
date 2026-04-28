/**
 * B5B — Collective Agreements Import Writer (controlled persistence).
 *
 * This module is the SERVER-SIDE writer that takes the output of the
 * pure B5A importer (`buildAgreementMetadataImportRun` +
 * `planRegistryUpsert`) and persists it into:
 *   - erp_hr_collective_agreements_registry
 *   - erp_hr_collective_agreements_registry_versions
 *   - erp_hr_collective_agreements_registry_sources
 *   - erp_hr_collective_agreements_registry_import_runs
 *
 * HARD SAFETY CONTRACT — DO NOT RELAX:
 *  - NEVER allow `ready_for_payroll = true` from input.
 *  - NEVER allow `salary_tables_loaded = true` from input.
 *  - NEVER allow `requires_human_review = false` from input.
 *  - NEVER allow `official_submission_blocked = false` from input.
 *  - On UPDATE: ONLY update metadata fields. Sensitive flags are
 *    forced to safe values (already done by `planRegistryUpsert`,
 *    re-enforced here as defense in depth).
 *  - On INSERT: same forcing applied.
 *  - NEVER write to `erp_hr_collective_agreements` (operational table).
 *  - NEVER touch payroll engines.
 *
 * The writer accepts an injected `RegistryDbAdapter` so it can be
 * unit-tested without Supabase. The edge function wrapper
 * (`supabase/functions/erp-hr-collective-agreements-importer/index.ts`)
 * supplies a service-role-backed adapter and gates execution behind
 * admin authentication.
 */

import {
  buildAgreementMetadataImportRun,
  planRegistryUpsert,
} from './collectiveAgreementsImporter';
import type {
  AgreementImportSource,
  NormalizedAgreementRegistryRecord,
  RawAgreementMetadata,
} from './collectiveAgreementsImportTypes';
import { computeSourceDocumentFingerprint } from './collectiveAgreementsSourceFetchers';

// =============================================================
// Adapter contract
// =============================================================

export interface ExistingRegistryRecord {
  id: string;
  internal_code: string;
  source_document_hash?: string | null;
}

export interface InsertRegistryArgs {
  record: NormalizedAgreementRegistryRecord;
}

export interface UpdateRegistryArgs {
  id: string;
  metadataPatch: SafeMetadataPatch;
}

export interface InsertVersionArgs {
  agreement_id: string;
  version_label: string;
  publication_date: string | null;
  source_url: string | null;
  effective_start_date: string | null;
  effective_end_date: string | null;
  change_type:
    | 'initial_text'
    | 'salary_revision'
    | 'correction'
    | 'extension'
    | 'denunciation'
    | 'new_agreement';
  source_hash: string | null;
  parsed_summary: Record<string, unknown>;
  is_current: boolean;
}

export interface InsertSourceArgs {
  agreement_id: string;
  source_type: string;
  source_url: string | null;
  document_url: string | null;
  document_hash: string | null;
  status: 'pending' | 'verified' | 'failed';
  source_quality: NormalizedAgreementRegistryRecord['source_quality'];
}

export interface InsertImportRunArgs {
  source: AgreementImportSource;
  total_found: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  report_json: Record<string, unknown>;
  status: 'completed' | 'completed_with_warnings' | 'failed';
}

export interface RegistryDbAdapter {
  fetchExistingByInternalCodes(codes: string[]): Promise<ExistingRegistryRecord[]>;
  fetchCurrentVersionHash(agreementId: string): Promise<string | null>;
  /**
   * B5E — Returns the id of the current `is_current=true` version for
   * an agreement, or null. Used to populate `previousCurrentVersionId`
   * in the import_run report so a future rollback can restore the prior
   * is_current pointer without touching the operational table.
   *
   * Optional for backward compatibility with B5B adapters that do not
   * implement it; callers must tolerate `undefined`.
   */
  fetchCurrentVersionId?(agreementId: string): Promise<string | null>;
  /**
   * B5E — Returns a snapshot of the SAFE_UPDATE_FIELDS for an existing
   * agreement so we can record `preUpdateSnapshots` in the import_run
   * for metadata-only rollback. Optional.
   */
  fetchSafeMetadataSnapshot?(agreementId: string): Promise<Record<string, unknown> | null>;
  insertRegistryRecord(args: InsertRegistryArgs): Promise<{ id: string }>;
  updateRegistryMetadata(args: UpdateRegistryArgs): Promise<void>;
  insertVersion(args: InsertVersionArgs): Promise<{ id: string }>;
  /** Marks ALL existing versions of an agreement as is_current=false. */
  unsetCurrentVersions(agreementId: string): Promise<void>;
  insertSource(args: InsertSourceArgs): Promise<void>;
  insertImportRun(args: InsertImportRunArgs): Promise<{ id: string }>;
}

// =============================================================
// Safe metadata patch — the ONLY fields update can touch
// =============================================================

const SAFE_UPDATE_FIELDS = [
  'official_name',
  'short_name',
  'jurisdiction_code',
  'autonomous_region',
  'province_code',
  'sector',
  'cnae_codes',
  'publication_source',
  'publication_url',
  'publication_date',
  'effective_start_date',
  'effective_end_date',
  'notes',
] as const;

export type SafeMetadataPatch = Partial<
  Pick<NormalizedAgreementRegistryRecord, typeof SAFE_UPDATE_FIELDS[number]>
> & {
  updated_at: string;
  last_verified_at: string;
};

function buildSafeMetadataPatch(
  rec: NormalizedAgreementRegistryRecord,
  nowIso: string
): SafeMetadataPatch {
  const patch: SafeMetadataPatch = {
    updated_at: nowIso,
    last_verified_at: nowIso,
  };
  for (const f of SAFE_UPDATE_FIELDS) {
    const v = rec[f];
    if (v !== undefined) {
      // Type-safe assignment via index signature widening.
      (patch as Record<string, unknown>)[f] = v;
    }
  }
  return patch;
}

/**
 * Defense-in-depth: even though `planRegistryUpsert` already strips
 * sensitive flags, we re-force them here before any write.
 */
function forceSafetyFlags(
  rec: NormalizedAgreementRegistryRecord
): NormalizedAgreementRegistryRecord {
  return {
    ...rec,
    ready_for_payroll: false,
    salary_tables_loaded: false,
    data_completeness: 'metadata_only',
    requires_human_review: true,
    official_submission_blocked: true,
    status: 'pendiente_validacion',
  };
}

// =============================================================
// Hash extraction (from raw payload, if present)
// =============================================================

function extractDocumentHash(rec: NormalizedAgreementRegistryRecord): string | null {
  // B5E — replace plain `publication_url` proxy with a deterministic
  // FNV-1a fingerprint that combines title + date + documentUrl +
  // publicationUrl, mirroring B5C/B5D. This is still NOT a real
  // SHA-256 (that lands in B7) but it stabilizes change-detection
  // across re-runs and matches the `fingerprint` reported by the
  // dry-run pipeline.
  if (!rec.publication_url && !rec.official_name && !rec.publication_date) {
    return null;
  }
  return computeSourceDocumentFingerprint({
    title: rec.official_name,
    publicationDate: rec.publication_date ?? undefined,
    sourceUrl: rec.publication_url ?? undefined,
    documentUrl: rec.publication_url ?? undefined,
  });
}

// =============================================================
// Public types
// =============================================================

export interface RunImportInput {
  source: AgreementImportSource;
  items: RawAgreementMetadata[];
  dryRun?: boolean;
  /**
   * B5E — operator-supplied flag attesting that every item in the
   * batch was reviewed by a human against the canonical official
   * publication BEFORE invocation. The writer simply records this in
   * the import_run report; it never bypasses any safety flag.
   * Default: false.
   */
  manualReviewed?: boolean;
  /**
   * B5E — id of a previous dryRun import_run that produced the same
   * plan. Recorded in the import_run report for traceability. Optional.
   */
  dryRunReference?: string;
}

export interface RunImportPlan {
  toInsert: NormalizedAgreementRegistryRecord[];
  toUpdate: NormalizedAgreementRegistryRecord[];
  skipped: NormalizedAgreementRegistryRecord[];
}

export interface RunImportResult {
  dryRun: boolean;
  totalFound: number;
  normalized: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ sourceId?: string; reason: string }>;
  plan: RunImportPlan;
  importRunId: string | null;
  status: 'completed' | 'completed_with_warnings' | 'failed';
}

// =============================================================
// Main writer
// =============================================================

export async function runCollectiveAgreementMetadataImport(
  input: RunImportInput,
  adapter: RegistryDbAdapter,
  options?: { now?: () => Date }
): Promise<RunImportResult> {
  const nowFn = options?.now ?? (() => new Date());
  const isDryRun = input.dryRun === true;

  // 1. Build & normalize via pure B5A pipeline.
  const importRun = buildAgreementMetadataImportRun({
    source: input.source,
    items: input.items,
  });

  // 2. Fetch existing internal codes from DB.
  const candidateCodes = importRun.records.map(r => r.internal_code);
  let existing: ExistingRegistryRecord[] = [];
  try {
    existing = candidateCodes.length > 0
      ? await adapter.fetchExistingByInternalCodes(candidateCodes)
      : [];
  } catch (err) {
    importRun.errors.push({
      reason: `fetch_existing_failed: ${err instanceof Error ? err.message : 'unknown'}`,
    });
  }
  const existingByCode = new Map(
    existing.map(e => [e.internal_code.trim().toUpperCase(), e])
  );

  // 3. Plan upsert via pure B5A planner (already strips sensitive flags
  //    on update). Then re-force safety flags as defense in depth.
  const planRaw = planRegistryUpsert({
    existingInternalCodes: existing.map(e => e.internal_code),
    records: importRun.records,
  });
  const plan: RunImportPlan = {
    toInsert: planRaw.toInsert.map(forceSafetyFlags),
    toUpdate: planRaw.toUpdate.map(forceSafetyFlags),
    skipped: planRaw.skipped,
  };

  // 4. Dry run path: do not write registry/versions/sources.
  if (isDryRun) {
    const totalSkipped = importRun.skipped + plan.skipped.length;
    let importRunId: string | null = null;
    try {
      const r = await adapter.insertImportRun({
        source: input.source,
        total_found: importRun.totalFound,
        inserted: 0,
        updated: 0,
        skipped: totalSkipped,
        errors: importRun.errors.length,
        report_json: {
          dryRun: true,
          plan: {
            toInsert: plan.toInsert.map(r => r.internal_code),
            toUpdate: plan.toUpdate.map(r => r.internal_code),
            skipped: plan.skipped.map(r => r.internal_code),
          },
          dedupedDuringNormalize: importRun.skipped,
          errors: importRun.errors,
        },
        status: importRun.errors.length > 0 ? 'completed_with_warnings' : 'completed',
      });
      importRunId = r.id;
    } catch {
      // Dry runs MUST NOT fail the caller because audit insert failed.
    }
    return {
      dryRun: true,
      totalFound: importRun.totalFound,
      normalized: importRun.normalized,
      inserted: 0,
      updated: 0,
      skipped: totalSkipped,
      errors: importRun.errors,
      plan,
      importRunId,
      status: importRun.errors.length > 0 ? 'completed_with_warnings' : 'completed',
    };
  }

  // 5. Real write path.
  let inserted = 0;
  let updated = 0;
  const writeErrors: Array<{ sourceId?: string; reason: string }> = [];

  // B5E — collected per-record evidence for the import_run report.
  const candidateMapping: Record<
    string,
    { boibId?: string; fingerprint: string | null; publicationUrl: string | null }
  > = {};
  const preUpdateSnapshots: Record<string, Record<string, unknown> | null> = {};
  const previousCurrentVersionId: Record<string, string | null> = {};

  // Helper to enrich candidateMapping from the original raw items.
  const rawByCode = new Map<string, RawAgreementMetadata>();
  for (const raw of input.items ?? []) {
    if (!raw || typeof raw !== 'object' || !raw.officialName) continue;
    const code = (raw.agreementCode ?? '').trim().toUpperCase();
    if (code) rawByCode.set(code, raw);
  }
  function recordMapping(rec: NormalizedAgreementRegistryRecord) {
    const fp = extractDocumentHash(rec);
    const codeKey = rec.internal_code.trim().toUpperCase();
    const raw = rawByCode.get(codeKey);
    candidateMapping[rec.internal_code] = {
      boibId: raw?.sourceId,
      fingerprint: fp,
      publicationUrl: rec.publication_url ?? null,
    };
  }

  // 5.a INSERT new records — also create initial version + source row.
  for (const rec of plan.toInsert) {
    try {
      recordMapping(rec);
      const { id } = await adapter.insertRegistryRecord({ record: rec });
      const docHash = extractDocumentHash(rec);
      await adapter.insertVersion({
        agreement_id: id,
        version_label: 'metadata-import-v1',
        publication_date: rec.publication_date ?? null,
        source_url: rec.publication_url ?? null,
        effective_start_date: rec.effective_start_date ?? null,
        effective_end_date: rec.effective_end_date ?? null,
        change_type: 'initial_text',
        source_hash: docHash,
        parsed_summary: { data_completeness: 'metadata_only', source: input.source },
        is_current: true,
      });
      await adapter.insertSource({
        agreement_id: id,
        source_type: rec.publication_source ?? input.source,
        source_url: rec.publication_url ?? null,
        document_url: rec.publication_url ?? null,
        document_hash: docHash,
        status: 'pending',
        source_quality: rec.source_quality,
      });
      inserted += 1;
    } catch (err) {
      writeErrors.push({
        sourceId: rec.internal_code,
        reason: `insert_failed: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    }
  }

  // 5.b UPDATE existing records — only safe metadata. Bump version if
  //     the document hash (proxied by publication_url) changed.
  const nowIso = nowFn().toISOString();
  for (const rec of plan.toUpdate) {
    recordMapping(rec);
    const codeKey = rec.internal_code.trim().toUpperCase();
    const ex = existingByCode.get(codeKey);
    if (!ex) {
      writeErrors.push({
        sourceId: rec.internal_code,
        reason: 'update_target_missing',
      });
      continue;
    }
    try {
      // B5E — capture pre-update snapshot for rollback (best-effort).
      if (typeof adapter.fetchSafeMetadataSnapshot === 'function') {
        try {
          preUpdateSnapshots[rec.internal_code] =
            await adapter.fetchSafeMetadataSnapshot(ex.id);
        } catch {
          preUpdateSnapshots[rec.internal_code] = null;
        }
      }
      const patch = buildSafeMetadataPatch(rec, nowIso);
      await adapter.updateRegistryMetadata({ id: ex.id, metadataPatch: patch });

      const newHash = extractDocumentHash(rec);
      const previousHash = await adapter
        .fetchCurrentVersionHash(ex.id)
        .catch(() => null);
      if (newHash && newHash !== previousHash) {
        // B5E — capture previous current version id (best-effort) for
        // metadata rollback BEFORE we unset is_current.
        if (typeof adapter.fetchCurrentVersionId === 'function') {
          try {
            previousCurrentVersionId[rec.internal_code] =
              await adapter.fetchCurrentVersionId(ex.id);
          } catch {
            previousCurrentVersionId[rec.internal_code] = null;
          }
        }
        await adapter.unsetCurrentVersions(ex.id);
        await adapter.insertVersion({
          agreement_id: ex.id,
          version_label: `metadata-import-${nowIso.slice(0, 10)}`,
          publication_date: rec.publication_date ?? null,
          source_url: rec.publication_url ?? null,
          effective_start_date: rec.effective_start_date ?? null,
          effective_end_date: rec.effective_end_date ?? null,
          // Schema-allowed change_type for metadata-only republication.
          change_type: 'correction',
          source_hash: newHash,
          parsed_summary: {
            data_completeness: 'metadata_only',
            source: input.source,
            reason: 'document_hash_change',
          },
          is_current: true,
        });
        // B5E — also refresh the BOIB source row with the new
        // fingerprint so downstream readers see the latest hash.
        try {
          await adapter.insertSource({
            agreement_id: ex.id,
            source_type: rec.publication_source ?? input.source,
            source_url: rec.publication_url ?? null,
            document_url: rec.publication_url ?? null,
            document_hash: newHash,
            status: 'pending',
            source_quality: rec.source_quality,
          });
        } catch (sourceErr) {
          writeErrors.push({
            sourceId: rec.internal_code,
            reason: `source_refresh_failed: ${
              sourceErr instanceof Error ? sourceErr.message : 'unknown'
            }`,
          });
        }
      }
      updated += 1;
    } catch (err) {
      writeErrors.push({
        sourceId: rec.internal_code,
        reason: `update_failed: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    }
  }

  // 6. Audit run.
  const allErrors = [...importRun.errors, ...writeErrors];
  const status: 'completed' | 'completed_with_warnings' | 'failed' =
    allErrors.length === 0
      ? 'completed'
      : inserted + updated > 0
        ? 'completed_with_warnings'
        : 'failed';

  let importRunId: string | null = null;
  const totalSkipped = importRun.skipped + plan.skipped.length;

  // B5E — derive the safety summary from the records actually planned
  // (post forceSafetyFlags). All five flags MUST be safe by construction.
  const allPlanned = [...plan.toInsert, ...plan.toUpdate];
  const safetySummary = {
    allReadyForPayrollFalse: allPlanned.every(r => r.ready_for_payroll === false),
    allRequireHumanReview: allPlanned.every(r => r.requires_human_review === true),
    allOfficialSubmissionBlocked: allPlanned.every(
      r => r.official_submission_blocked === true
    ),
    allMetadataOnly: allPlanned.every(r => r.data_completeness === 'metadata_only'),
    allBlockedFromPayroll: allPlanned.every(
      r => r.ready_for_payroll === false && r.salary_tables_loaded === false
    ),
  };

  try {
    const r = await adapter.insertImportRun({
      source: input.source,
      total_found: importRun.totalFound,
      inserted,
      updated,
      skipped: totalSkipped,
      errors: allErrors.length,
      report_json: {
        dryRun: false,
        manual_reviewed: input.manualReviewed === true,
        dryRunReference: input.dryRunReference ?? null,
        candidateMapping,
        safetySummary,
        preUpdateSnapshots,
        previousCurrentVersionId,
        errors: allErrors,
        insertedCodes: plan.toInsert.map(r => r.internal_code),
        updatedCodes: plan.toUpdate.map(r => r.internal_code),
        skippedCodes: plan.skipped.map(r => r.internal_code),
        dedupedDuringNormalize: importRun.skipped,
      },
      status,
    });
    importRunId = r.id;
  } catch {
    // Audit failure must not crash the writer; the caller still gets
    // its result so it can decide what to do.
  }

  return {
    dryRun: false,
    totalFound: importRun.totalFound,
    normalized: importRun.normalized,
    inserted,
    updated,
    skipped: totalSkipped,
    errors: allErrors,
    plan,
    importRunId,
    status,
  };
}

// Exported for tests / advanced callers.
export { buildSafeMetadataPatch, forceSafetyFlags };
