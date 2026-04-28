/**
 * B5A — Collective Agreements Metadata Importer (pure).
 *
 * NO Supabase, NO fetch, NO React. This module only:
 *  - normalizes raw metadata into NormalizedAgreementRegistryRecord
 *  - deduplicates the resulting set
 *  - returns an AgreementImportResult ready for a future edge function
 *    to persist via service_role.
 *
 * It also exposes planRegistryUpsert() to compute a safe insert/update
 * plan against an existing list of internal_codes, without ever
 * touching sensitive payroll-readiness flags on update.
 */

import {
  normalizeAgreementMetadata,
} from './collectiveAgreementsSourceNormalizers';
import type {
  AgreementImportError,
  AgreementImportResult,
  AgreementImportSource,
  NormalizedAgreementRegistryRecord,
  RawAgreementMetadata,
  RegistryUpsertPlan,
} from './collectiveAgreementsImportTypes';

// ── Dedupe helpers ──

function dedupeKey(rec: NormalizedAgreementRegistryRecord): string {
  if (rec.agreement_code && rec.agreement_code.trim().length > 0) {
    return `code::${rec.agreement_code.trim().toUpperCase()}`;
  }
  return `compound::${rec.publication_source ?? 'NA'}::${rec.official_name
    .trim()
    .toLowerCase()}::${rec.jurisdiction_code}`;
}

export interface BuildImportRunInput {
  source: AgreementImportSource;
  items: RawAgreementMetadata[];
}

export function buildAgreementMetadataImportRun(
  input: BuildImportRunInput
): AgreementImportResult {
  const errors: AgreementImportError[] = [];
  const seen = new Map<string, NormalizedAgreementRegistryRecord>();
  let skipped = 0;

  const items = Array.isArray(input.items) ? input.items : [];

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') {
      errors.push({ reason: 'invalid_raw_item' });
      continue;
    }
    if (!raw.officialName || typeof raw.officialName !== 'string') {
      errors.push({ sourceId: raw.sourceId, reason: 'missing_official_name' });
      continue;
    }
    // Force the source from the run if not provided in the item.
    const itemWithSource: RawAgreementMetadata = {
      ...raw,
      source: raw.source ?? input.source,
    };

    let normalized: NormalizedAgreementRegistryRecord;
    try {
      normalized = normalizeAgreementMetadata(itemWithSource);
    } catch (err) {
      errors.push({
        sourceId: raw.sourceId,
        reason: err instanceof Error ? err.message : 'normalize_error',
      });
      continue;
    }

    const key = dedupeKey(normalized);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.set(key, normalized);
  }

  const records = Array.from(seen.values());

  return {
    totalFound: items.length,
    normalized: records.length,
    skipped,
    errors,
    records,
  };
}

// ── Upsert planner ──

export interface PlanRegistryUpsertInput {
  existingInternalCodes: string[];
  records: NormalizedAgreementRegistryRecord[];
}

/**
 * Splits records into insert vs update vs skipped buckets. The "update"
 * bucket carries records whose `internal_code` already exists in the
 * registry; the consumer (edge function) MUST NOT use these records to
 * mutate sensitive flags. We strip those flags here as a defensive
 * measure so that even a buggy persister cannot relax safety.
 */
export function planRegistryUpsert(
  input: PlanRegistryUpsertInput
): RegistryUpsertPlan {
  const existing = new Set(
    (input.existingInternalCodes ?? []).map((c) => c.trim().toUpperCase())
  );

  const toInsert: NormalizedAgreementRegistryRecord[] = [];
  const toUpdate: NormalizedAgreementRegistryRecord[] = [];
  const skipped: NormalizedAgreementRegistryRecord[] = [];
  const seenCodes = new Set<string>();

  for (const rec of input.records ?? []) {
    const codeKey = rec.internal_code.trim().toUpperCase();
    if (seenCodes.has(codeKey)) {
      skipped.push(rec);
      continue;
    }
    seenCodes.add(codeKey);

    if (existing.has(codeKey)) {
      toUpdate.push(stripSensitiveFlagsForUpdate(rec));
    } else {
      toInsert.push(rec);
    }
  }

  return { toInsert, toUpdate, skipped };
}

/**
 * Removes/forces sensitive payroll-readiness flags so that an update
 * payload can never relax them. We KEEP forced safety values
 * (ready_for_payroll=false etc.) so the persister can pass-through
 * safely; what we strip is anything that could be used to elevate
 * status. Deletion of the field is preferred over coercion, but to
 * keep the type stable we set them to their safe values.
 */
function stripSensitiveFlagsForUpdate(
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
