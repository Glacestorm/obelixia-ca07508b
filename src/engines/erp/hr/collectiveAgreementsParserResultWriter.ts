/**
 * B7B — Collective Agreements Parser Result Writer (admin-gated, pure).
 *
 * Persists `ParserResult` objects produced by the B7A pipeline into the
 * Registry sub-tables:
 *   - erp_hr_collective_agreements_registry_sources
 *   - erp_hr_collective_agreements_registry_versions
 *   - erp_hr_collective_agreements_registry_salary_tables
 *   - erp_hr_collective_agreements_registry_rules
 *   - erp_hr_collective_agreements_registry_import_runs
 *
 * And applies a SAFE patch to `erp_hr_collective_agreements_registry`.
 *
 * HARD SAFETY CONTRACT — never relax:
 *  - NEVER allow `ready_for_payroll = true`.
 *  - NEVER allow `requires_human_review = false`.
 *  - NEVER allow `data_completeness = 'human_validated'`.
 *  - NEVER write to operational table `erp_hr_collective_agreements`.
 *  - NEVER touch payroll engines.
 *  - NEVER create new agreements (B7B only operates on existing ones).
 *  - NEVER perform real fetch / DB calls itself: all DB I/O is delegated
 *    to an injected `ParserResultRegistryAdapter`.
 *
 * No imports from Supabase, React, or fetch. Pure module.
 */

import type { ParserResult, ParsedSalaryRow } from './collectiveAgreementParserTypes';

// =============================================================
// Public types
// =============================================================

export type SafeParserPatch = {
  data_completeness: 'parsed_partial' | 'metadata_only';
  salary_tables_loaded: boolean;
  requires_human_review: true;
  ready_for_payroll: false;
  official_submission_blocked: true;
  parser_last_run_at: string;
  parser_last_sha256: string;
  updated_at: string;
};

export interface ParserResultImportInput {
  parserResults: ParserResult[];
  dryRun?: boolean;
  manualReviewed?: boolean;
  triggeredBy?: string;
  dryRunReference?: string;
}

export interface ParserResultImportRunResult {
  dryRun: boolean;
  processed: number;
  insertedSources: number;
  createdVersions: number;
  refreshedVersions: number;
  insertedSalaryRows: number;
  discardedSalaryRows: number;
  insertedRules: number;
  patchedAgreements: number;
  errors: Array<{ internalCode?: string; reason: string }>;
  warnings: Array<{ internalCode?: string; reason: string }>;
  importRunId: string | null;
  status: 'completed' | 'completed_with_warnings' | 'failed';
  plan: {
    toInsertSources: Array<{ internalCode: string; sha256: string }>;
    toCreateVersions: Array<{ internalCode: string; versionLabel: string; sha256: string }>;
    toReplaceSalaryRows: Array<{ internalCode: string; rowCount: number }>;
    toReplaceRules: Array<{ internalCode: string; ruleCount: number }>;
    toPatchAgreements: Array<{ internalCode: string; patch: SafeParserPatch }>;
  };
  safetySummary: {
    forcedReadyForPayrollFalse: number;
    forcedRequiresHumanReviewTrue: number;
    forcedOfficialSubmissionBlocked: number;
  };
}

// =============================================================
// Adapter contract
// =============================================================

export interface RegistryAgreementRow {
  id: string;
  internal_code: string;
}

export interface RegistryVersionRow {
  id: string;
  agreement_id: string;
  version_label: string;
  source_hash: string | null;
  is_current: boolean;
}

export interface RegistrySourceRow {
  id: string;
  agreement_id: string;
  document_hash: string | null;
}

export interface InsertParserSourceArgs {
  agreement_id: string;
  source_url: string;
  document_url: string;
  document_hash: string;
  mime_type: string;
  page_count?: number;
  extraction_method: string;
  extraction_confidence: number;
  downloaded_at: string;
  requires_human_review: true;
}

export interface InsertParserVersionArgs {
  agreement_id: string;
  version_label: string;
  source_hash: string;
  is_current: true;
  change_type: 'initial_text' | 'salary_revision' | 'correction';
  parsed_summary: Record<string, unknown>;
}

export interface ReplaceSalaryRowsArgs {
  agreement_id: string;
  version_id: string;
  rows: Array<ParsedSalaryRow & { requiresHumanReview: true }>;
}

export interface ReplaceRulesArgs {
  agreement_id: string;
  version_id: string;
  rules_json: Record<string, unknown>;
  requires_human_review: true;
}

export interface UpdateAgreementParserStatusArgs {
  agreement_id: string;
  patch: SafeParserPatch;
}

export interface InsertParserImportRunArgs {
  source: 'PARSER_B7B';
  total_found: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  status: 'completed' | 'completed_with_warnings' | 'failed';
  report_json: Record<string, unknown>;
}

export interface ParserResultRegistryAdapter {
  fetchAgreementByInternalCode(internalCode: string): Promise<RegistryAgreementRow | null>;
  fetchCurrentVersion(agreementId: string): Promise<RegistryVersionRow | null>;
  fetchSourcesByHash(agreementId: string, sha256Hash: string): Promise<RegistrySourceRow[]>;
  fetchSafeParserAgreementSnapshot(agreementId: string): Promise<Record<string, unknown> | null>;

  insertSource(args: InsertParserSourceArgs): Promise<{ id: string }>;
  unsetCurrentVersions(agreementId: string): Promise<void>;
  insertVersion(args: InsertParserVersionArgs): Promise<{ id: string }>;
  replaceSalaryRowsForVersion(args: ReplaceSalaryRowsArgs): Promise<{ inserted: number }>;
  replaceRulesForVersion(args: ReplaceRulesArgs): Promise<{ inserted: number }>;
  updateAgreementParserStatus(args: UpdateAgreementParserStatusArgs): Promise<void>;
  insertImportRun(args: InsertParserImportRunArgs): Promise<{ id: string }>;
}

// =============================================================
// Helpers
// =============================================================

const SHA256_RE = /^[a-f0-9]{64}$/;
const ROW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Defense-in-depth: re-force every safety flag regardless of input.
 * The pipeline already neutralizes these, but we treat ParserResult as
 * untrusted at the writer boundary.
 */
export function forceParserSafety(pr: ParserResult): ParserResult {
  const dc =
    pr.proposedRegistryPatch?.data_completeness === 'parsed_partial'
      ? 'parsed_partial'
      : 'metadata_only';
  return {
    ...pr,
    salaryRows: (pr.salaryRows ?? []).map((r) => ({
      ...r,
      requiresHumanReview: true as const,
    })),
    proposedRegistryPatch: {
      data_completeness: dc,
      salary_tables_loaded: !!pr.proposedRegistryPatch?.salary_tables_loaded,
      requires_human_review: true,
      ready_for_payroll: false,
      official_submission_blocked: true,
    },
  };
}

function classifyRow(row: ParsedSalaryRow): { ok: boolean; reason?: string } {
  if (!row.sourcePage || row.sourcePage <= 0) return { ok: false, reason: 'MISSING_SOURCE_EVIDENCE' };
  if (!row.sourceExcerpt || row.sourceExcerpt.trim().length === 0) {
    return { ok: false, reason: 'MISSING_SOURCE_EVIDENCE' };
  }
  if (typeof row.rowConfidence !== 'number' || row.rowConfidence < ROW_CONFIDENCE_THRESHOLD) {
    return { ok: false, reason: 'LOW_CONFIDENCE_ROW' };
  }
  return { ok: true };
}

function rulesAreMeaningful(rules: ParserResult['rules']): boolean {
  if (!rules) return false;
  return (
    rules.jornadaAnualHours != null ||
    rules.vacacionesDays != null ||
    rules.extraPaymentsCount != null ||
    (rules.permisosRules?.length ?? 0) > 0
  );
}

function buildRulesJson(rules: ParserResult['rules']): Record<string, unknown> {
  return {
    jornadaAnualHours: rules.jornadaAnualHours ?? null,
    vacacionesDays: rules.vacacionesDays ?? null,
    extraPaymentsCount: rules.extraPaymentsCount ?? null,
    extraPaymentsProrrateadas: rules.extraPaymentsProrrateadas ?? null,
    antiguedadFormula: rules.antiguedadFormula ?? null,
    horasExtraRule: rules.horasExtraRule ?? null,
    nocturnidadPercent: rules.nocturnidadPercent ?? null,
    festivosRule: rules.festivosRule ?? null,
    itComplementRule: rules.itComplementRule ?? null,
    permisosRules: rules.permisosRules ?? [],
    preavisoDays: rules.preavisoDays ?? null,
    periodoPruebaDays: rules.periodoPruebaDays ?? null,
    unresolvedFields: rules.unresolvedFields ?? [],
    warnings: rules.warnings ?? [],
  };
}

function pickChangeType(args: {
  hasCurrent: boolean;
  validRowCount: number;
  hasMeaningfulRules: boolean;
}): InsertParserVersionArgs['change_type'] {
  if (!args.hasCurrent) return 'initial_text';
  if (args.validRowCount > 0) return 'salary_revision';
  return 'correction';
}

// =============================================================
// Main writer
// =============================================================

export async function runCollectiveAgreementParserResultImport(
  input: ParserResultImportInput,
  adapter: ParserResultRegistryAdapter,
  options?: { now?: () => Date },
): Promise<ParserResultImportRunResult> {
  const nowFn = options?.now ?? (() => new Date());
  const isDryRun = input.dryRun === true;
  const manualReviewed = input.manualReviewed === true;
  const parserResults = Array.isArray(input.parserResults) ? input.parserResults : [];

  const errors: Array<{ internalCode?: string; reason: string }> = [];
  const warnings: Array<{ internalCode?: string; reason: string }> = [];

  const plan: ParserResultImportRunResult['plan'] = {
    toInsertSources: [],
    toCreateVersions: [],
    toReplaceSalaryRows: [],
    toReplaceRules: [],
    toPatchAgreements: [],
  };

  const safetySummary = {
    forcedReadyForPayrollFalse: 0,
    forcedRequiresHumanReviewTrue: 0,
    forcedOfficialSubmissionBlocked: 0,
  };

  let insertedSources = 0;
  let createdVersions = 0;
  let refreshedVersions = 0;
  let insertedSalaryRows = 0;
  let discardedSalaryRows = 0;
  let insertedRules = 0;
  let patchedAgreements = 0;
  let perAgreementErrorCount = 0;
  let perAgreementSuccessCount = 0;

  const perAgreement: Record<string, Record<string, unknown>> = {};

  for (const rawResult of parserResults) {
    const internalCode = rawResult?.internalCode ?? 'UNKNOWN';
    const localWarnings: Array<{ internalCode?: string; reason: string }> = [];
    const localErrors: Array<{ internalCode?: string; reason: string }> = [];

    // Defense-in-depth neutralization on every iteration.
    const result = forceParserSafety(rawResult);
    safetySummary.forcedReadyForPayrollFalse += 1;
    safetySummary.forcedRequiresHumanReviewTrue += 1;
    safetySummary.forcedOfficialSubmissionBlocked += 1;

    const sha256 = result.sourceDocument?.sha256Hash ?? '';

    // 1. SHA-256 validation
    if (!SHA256_RE.test(sha256)) {
      const e = { internalCode, reason: 'INVALID_SHA256' };
      errors.push(e);
      localErrors.push(e);
      perAgreement[internalCode] = {
        sha256,
        errors: localErrors,
        warnings: localWarnings,
      };
      perAgreementErrorCount += 1;
      continue;
    }

    // 2. Lookup agreement
    let agreement: RegistryAgreementRow | null = null;
    try {
      agreement = await adapter.fetchAgreementByInternalCode(internalCode);
    } catch (err) {
      const reason = `LOOKUP_FAILED:${(err as Error).message}`;
      errors.push({ internalCode, reason });
      localErrors.push({ internalCode, reason });
      perAgreement[internalCode] = { sha256, errors: localErrors, warnings: localWarnings };
      perAgreementErrorCount += 1;
      continue;
    }
    if (!agreement) {
      const e = { internalCode, reason: 'AGREEMENT_NOT_FOUND' };
      errors.push(e);
      localErrors.push(e);
      perAgreement[internalCode] = { sha256, errors: localErrors, warnings: localWarnings };
      perAgreementErrorCount += 1;
      continue;
    }

    const agreementId = agreement.id;

    // 3. Snapshot pre-update (best-effort)
    let preUpdateSnapshot: Record<string, unknown> | null = null;
    try {
      preUpdateSnapshot = await adapter.fetchSafeParserAgreementSnapshot(agreementId);
    } catch {
      preUpdateSnapshot = null;
    }

    // 4. Filter salary rows
    const validRows: Array<ParsedSalaryRow & { requiresHumanReview: true }> = [];
    let localDiscarded = 0;
    for (const row of result.salaryRows ?? []) {
      const c = classifyRow(row);
      if (c.ok) {
        validRows.push({ ...row, requiresHumanReview: true });
      } else {
        localDiscarded += 1;
        const w = { internalCode, reason: c.reason ?? 'ROW_DROPPED' };
        warnings.push(w);
        localWarnings.push(w);
      }
    }
    discardedSalaryRows += localDiscarded;

    const hasMeaningfulRules = rulesAreMeaningful(result.rules);
    const validRowCount = validRows.length;

    // 5. Source idempotency check
    let existingSources: RegistrySourceRow[] = [];
    try {
      existingSources = await adapter.fetchSourcesByHash(agreementId, sha256);
    } catch {
      existingSources = [];
    }
    const sourceAlreadyExists = existingSources.length > 0;
    let sourceInserted = false;
    if (!sourceAlreadyExists) {
      plan.toInsertSources.push({ internalCode, sha256 });
    }

    // 6. Versioning
    let current: RegistryVersionRow | null = null;
    try {
      current = await adapter.fetchCurrentVersion(agreementId);
    } catch {
      current = null;
    }

    const previousCurrentVersionId: string | null = current?.id ?? null;
    let newVersionId: string | null = null;
    let versionToOperateOn: string | null = null; // version id used for replace rows/rules
    let willCreateVersion = false;
    let willRefreshSameVersion = false;
    const sameHashAsCurrent = current?.source_hash === sha256;
    const nowDate = nowFn();
    const nowIso = nowDate.toISOString();
    const nowDay = nowIso.slice(0, 10);

    let versionLabel = '';
    let changeType: InsertParserVersionArgs['change_type'] = 'initial_text';

    if (!current) {
      versionLabel = 'parser-import-v1';
      changeType = pickChangeType({
        hasCurrent: false,
        validRowCount,
        hasMeaningfulRules,
      });
      willCreateVersion = true;
      plan.toCreateVersions.push({ internalCode, versionLabel, sha256 });
    } else if (sameHashAsCurrent) {
      // Same hash → no new version.
      if (manualReviewed) {
        willRefreshSameVersion = true;
        versionToOperateOn = current.id;
      } else {
        const w = {
          internalCode,
          reason: 'MANUAL_REVIEW_REQUIRED_TO_REFRESH_EXISTING_VERSION',
        };
        warnings.push(w);
        localWarnings.push(w);
      }
    } else {
      // Different hash → create new current version.
      versionLabel = `parser-import-${nowDay}`;
      changeType = pickChangeType({
        hasCurrent: true,
        validRowCount,
        hasMeaningfulRules,
      });
      willCreateVersion = true;
      plan.toCreateVersions.push({ internalCode, versionLabel, sha256 });
    }

    // 7. Build SafeParserPatch
    const dataCompleteness: SafeParserPatch['data_completeness'] =
      validRowCount > 0 || hasMeaningfulRules ? 'parsed_partial' : 'metadata_only';
    const patch: SafeParserPatch = {
      data_completeness: dataCompleteness,
      salary_tables_loaded: validRowCount > 0,
      requires_human_review: true,
      ready_for_payroll: false,
      official_submission_blocked: true,
      parser_last_run_at: nowIso,
      parser_last_sha256: sha256,
      updated_at: nowIso,
    };
    plan.toPatchAgreements.push({ internalCode, patch });

    if (willCreateVersion || willRefreshSameVersion) {
      if (validRowCount > 0) {
        plan.toReplaceSalaryRows.push({ internalCode, rowCount: validRowCount });
      }
      if (hasMeaningfulRules) {
        plan.toReplaceRules.push({ internalCode, ruleCount: 1 });
      }
    }

    // ----- DryRun: no writes -----
    if (isDryRun) {
      perAgreement[internalCode] = {
        sha256,
        previousCurrentVersionId,
        newVersionId: null,
        sourceInserted: false,
        salaryRowsInserted: 0,
        salaryRowsDiscarded: localDiscarded,
        rulesInserted: 0,
        patchApplied: patch,
        preUpdateSnapshot,
        warnings: localWarnings,
        errors: localErrors,
      };
      perAgreementSuccessCount += 1;
      continue;
    }

    // ----- Real writes -----
    try {
      // 5b. Insert source if needed
      if (!sourceAlreadyExists) {
        try {
          await adapter.insertSource({
            agreement_id: agreementId,
            source_url: result.sourceDocument.sourceUrl,
            document_url: result.sourceDocument.documentUrl,
            document_hash: sha256,
            mime_type: result.sourceDocument.mimeType,
            page_count: result.sourceDocument.pageCount,
            extraction_method: result.sourceDocument.extractionMethod,
            extraction_confidence: result.sourceDocument.extractionConfidence,
            downloaded_at: result.sourceDocument.downloadedAt,
            requires_human_review: true,
          });
          sourceInserted = true;
          insertedSources += 1;
        } catch (err) {
          const reason = `SOURCE_INSERT_FAILED:${(err as Error).message}`;
          errors.push({ internalCode, reason });
          localErrors.push({ internalCode, reason });
        }
      }

      // 6b. Versioning writes
      if (willCreateVersion) {
        if (current) {
          try {
            await adapter.unsetCurrentVersions(agreementId);
          } catch (err) {
            const reason = `UNSET_CURRENT_FAILED:${(err as Error).message}`;
            errors.push({ internalCode, reason });
            localErrors.push({ internalCode, reason });
          }
        }
        try {
          const v = await adapter.insertVersion({
            agreement_id: agreementId,
            version_label: versionLabel,
            source_hash: sha256,
            is_current: true,
            change_type: changeType,
            parsed_summary: {
              data_completeness: dataCompleteness,
              source: 'PARSER_B7B',
              validRowCount,
              hasMeaningfulRules,
            },
          });
          newVersionId = v.id;
          versionToOperateOn = v.id;
          createdVersions += 1;
        } catch (err) {
          const reason = `VERSION_INSERT_FAILED:${(err as Error).message}`;
          errors.push({ internalCode, reason });
          localErrors.push({ internalCode, reason });
        }
      } else if (willRefreshSameVersion) {
        refreshedVersions += 1;
      }

      // 7b. Replace salary rows / rules on the active version
      let salaryRowsInsertedLocal = 0;
      let rulesInsertedLocal = 0;
      if (versionToOperateOn) {
        if (validRowCount > 0) {
          try {
            const r = await adapter.replaceSalaryRowsForVersion({
              agreement_id: agreementId,
              version_id: versionToOperateOn,
              rows: validRows,
            });
            salaryRowsInsertedLocal = r.inserted;
            insertedSalaryRows += r.inserted;
          } catch (err) {
            const reason = `SALARY_ROWS_REPLACE_FAILED:${(err as Error).message}`;
            errors.push({ internalCode, reason });
            localErrors.push({ internalCode, reason });
          }
        }
        if (hasMeaningfulRules) {
          try {
            const r = await adapter.replaceRulesForVersion({
              agreement_id: agreementId,
              version_id: versionToOperateOn,
              rules_json: buildRulesJson(result.rules),
              requires_human_review: true,
            });
            rulesInsertedLocal = r.inserted;
            insertedRules += r.inserted;
          } catch (err) {
            const reason = `RULES_REPLACE_FAILED:${(err as Error).message}`;
            errors.push({ internalCode, reason });
            localErrors.push({ internalCode, reason });
          }
        }
      }

      // 8b. Update agreement parser status (safe patch)
      try {
        await adapter.updateAgreementParserStatus({ agreement_id: agreementId, patch });
        patchedAgreements += 1;
      } catch (err) {
        const reason = `PATCH_FAILED:${(err as Error).message}`;
        errors.push({ internalCode, reason });
        localErrors.push({ internalCode, reason });
      }

      perAgreement[internalCode] = {
        sha256,
        previousCurrentVersionId,
        newVersionId,
        sourceInserted,
        salaryRowsInserted: salaryRowsInsertedLocal,
        salaryRowsDiscarded: localDiscarded,
        rulesInserted: rulesInsertedLocal,
        patchApplied: patch,
        preUpdateSnapshot,
        warnings: localWarnings,
        errors: localErrors,
      };
      if (localErrors.length === 0) perAgreementSuccessCount += 1;
      else perAgreementErrorCount += 1;
    } catch (err) {
      const reason = `WRITE_PIPELINE_FAILED:${(err as Error).message}`;
      errors.push({ internalCode, reason });
      localErrors.push({ internalCode, reason });
      perAgreement[internalCode] = {
        sha256,
        previousCurrentVersionId,
        newVersionId,
        sourceInserted,
        salaryRowsDiscarded: localDiscarded,
        preUpdateSnapshot,
        warnings: localWarnings,
        errors: localErrors,
      };
      perAgreementErrorCount += 1;
    }
  }

  // ----- Status -----
  const totalProcessed = parserResults.length;
  let status: ParserResultImportRunResult['status'];
  if (totalProcessed === 0) {
    status = 'completed';
  } else if (perAgreementErrorCount === totalProcessed) {
    status = 'failed';
  } else if (errors.length > 0 || warnings.length > 0) {
    status = 'completed_with_warnings';
  } else {
    status = 'completed';
  }

  // ----- Audit import_run -----
  const reportJson: Record<string, unknown> = {
    source: 'PARSER_B7B',
    dryRun: isDryRun,
    manualReviewed,
    triggeredBy: input.triggeredBy ?? null,
    dryRunReference: input.dryRunReference ?? null,
    parserResultsCount: totalProcessed,
    internalCodes: parserResults.map((p) => p?.internalCode ?? 'UNKNOWN'),
    perAgreement,
    safetySummary,
    warnings,
    errors,
    plan,
  };

  let importRunId: string | null = null;
  try {
    const r = await adapter.insertImportRun({
      source: 'PARSER_B7B',
      total_found: totalProcessed,
      inserted: insertedSources + createdVersions,
      updated: refreshedVersions + patchedAgreements,
      skipped: 0,
      errors: errors.length,
      status,
      report_json: reportJson,
    });
    importRunId = r.id;
  } catch (err) {
    if (isDryRun) {
      warnings.push({ reason: 'DRYRUN_IMPORT_RUN_AUDIT_FAILED' });
    } else {
      errors.push({ reason: `IMPORT_RUN_AUDIT_FAILED:${(err as Error).message}` });
      if (status === 'completed') status = 'completed_with_warnings';
    }
  }

  return {
    dryRun: isDryRun,
    processed: totalProcessed,
    insertedSources,
    createdVersions,
    refreshedVersions,
    insertedSalaryRows,
    discardedSalaryRows,
    insertedRules,
    patchedAgreements,
    errors,
    warnings,
    importRunId,
    status,
    plan,
    safetySummary,
  };
}
