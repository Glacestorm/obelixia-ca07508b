/**
 * B7B — Parser Result Writer tests (in-memory adapter).
 *
 * Verifies the admin-gated writer never:
 *  - sets ready_for_payroll=true,
 *  - clears requires_human_review,
 *  - sets data_completeness='human_validated',
 *  - touches the operational table erp_hr_collective_agreements,
 *  - imports Supabase or performs DB / fetch I/O directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  runCollectiveAgreementParserResultImport,
  forceParserSafety,
  type ParserResultRegistryAdapter,
  type RegistryAgreementRow,
  type RegistryVersionRow,
  type RegistrySourceRow,
  type InsertParserSourceArgs,
  type InsertParserVersionArgs,
  type ReplaceSalaryRowsArgs,
  type ReplaceRulesArgs,
  type UpdateAgreementParserStatusArgs,
  type InsertParserImportRunArgs,
} from '@/engines/erp/hr/collectiveAgreementsParserResultWriter';
import type { ParserResult } from '@/engines/erp/hr/collectiveAgreementParserTypes';

// =============================================================
// Fixtures
// =============================================================

const VALID_SHA_A = 'a'.repeat(64);
const VALID_SHA_B = 'b'.repeat(64);

function makeResult(overrides: Partial<ParserResult> & { internalCode: string; sha?: string }): ParserResult {
  return {
    internalCode: overrides.internalCode,
    sourceDocument: {
      sourceUrl: 'https://boib.example/x',
      documentUrl: 'https://boib.example/x.pdf',
      downloadedAt: '2026-04-01T00:00:00.000Z',
      sha256Hash: overrides.sha ?? VALID_SHA_A,
      mimeType: 'application/pdf',
      pageCount: 12,
      extractionMethod: 'pdf_text',
      extractionConfidence: 0.6,
    },
    salaryRows: overrides.salaryRows ?? [
      {
        year: 2026,
        professionalGroup: 'Grupo I',
        category: 'Oficial 1ª',
        salaryBaseMonthly: 1500,
        sourcePage: 3,
        sourceExcerpt: 'Tabla salarial 2026: Grupo I 1.500,00 €',
        rowConfidence: 0.85,
        warnings: [],
        requiresHumanReview: true,
      },
    ],
    rules: overrides.rules ?? {
      jornadaAnualHours: 1768,
      vacacionesDays: 30,
      extraPaymentsCount: 2,
      unresolvedFields: [],
      warnings: [],
    },
    parserWarnings: [],
    parserErrors: [],
    unresolvedFields: [],
    proposedRegistryPatch: {
      data_completeness: 'parsed_partial',
      salary_tables_loaded: true,
      requires_human_review: true,
      ready_for_payroll: false,
      official_submission_blocked: true,
    },
    ...overrides,
  } as ParserResult;
}

// =============================================================
// In-memory adapter
// =============================================================

interface AdapterCalls {
  fetchAgreementByInternalCode: string[];
  fetchCurrentVersion: string[];
  fetchSourcesByHash: Array<[string, string]>;
  fetchSafeParserAgreementSnapshot: string[];
  insertSource: InsertParserSourceArgs[];
  unsetCurrentVersions: string[];
  insertVersion: InsertParserVersionArgs[];
  replaceSalaryRowsForVersion: ReplaceSalaryRowsArgs[];
  replaceRulesForVersion: ReplaceRulesArgs[];
  updateAgreementParserStatus: UpdateAgreementParserStatusArgs[];
  insertImportRun: InsertParserImportRunArgs[];
}

function createAdapter(seed: {
  agreements?: Record<string, RegistryAgreementRow>;
  currentVersionByAgreement?: Record<string, RegistryVersionRow>;
  sourcesByAgreementHash?: Record<string, RegistrySourceRow[]>; // key = `${id}|${hash}`
  snapshotByAgreement?: Record<string, Record<string, unknown> | null>;
}) {
  const calls: AdapterCalls = {
    fetchAgreementByInternalCode: [],
    fetchCurrentVersion: [],
    fetchSourcesByHash: [],
    fetchSafeParserAgreementSnapshot: [],
    insertSource: [],
    unsetCurrentVersions: [],
    insertVersion: [],
    replaceSalaryRowsForVersion: [],
    replaceRulesForVersion: [],
    updateAgreementParserStatus: [],
    insertImportRun: [],
  };
  const sources = { ...(seed.sourcesByAgreementHash ?? {}) };
  const currents: Record<string, RegistryVersionRow | null> = { ...(seed.currentVersionByAgreement ?? {}) };
  let versionSeq = 1;
  let runSeq = 1;

  const adapter: ParserResultRegistryAdapter = {
    async fetchAgreementByInternalCode(code) {
      calls.fetchAgreementByInternalCode.push(code);
      return seed.agreements?.[code] ?? null;
    },
    async fetchCurrentVersion(id) {
      calls.fetchCurrentVersion.push(id);
      return currents[id] ?? null;
    },
    async fetchSourcesByHash(id, hash) {
      calls.fetchSourcesByHash.push([id, hash]);
      return sources[`${id}|${hash}`] ?? [];
    },
    async fetchSafeParserAgreementSnapshot(id) {
      calls.fetchSafeParserAgreementSnapshot.push(id);
      return seed.snapshotByAgreement?.[id] ?? null;
    },
    async insertSource(args) {
      calls.insertSource.push(args);
      const id = `src-${calls.insertSource.length}`;
      const list = sources[`${args.agreement_id}|${args.document_hash}`] ?? [];
      sources[`${args.agreement_id}|${args.document_hash}`] = [
        ...list,
        { id, agreement_id: args.agreement_id, document_hash: args.document_hash },
      ];
      return { id };
    },
    async unsetCurrentVersions(id) {
      calls.unsetCurrentVersions.push(id);
      if (currents[id]) currents[id] = { ...currents[id]!, is_current: false };
    },
    async insertVersion(args) {
      calls.insertVersion.push(args);
      const id = `ver-${versionSeq++}`;
      currents[args.agreement_id] = {
        id,
        agreement_id: args.agreement_id,
        version_label: args.version_label,
        source_hash: args.source_hash,
        is_current: true,
      };
      return { id };
    },
    async replaceSalaryRowsForVersion(args) {
      calls.replaceSalaryRowsForVersion.push(args);
      return { inserted: args.rows.length };
    },
    async replaceRulesForVersion(args) {
      calls.replaceRulesForVersion.push(args);
      return { inserted: 1 };
    },
    async updateAgreementParserStatus(args) {
      calls.updateAgreementParserStatus.push(args);
    },
    async insertImportRun(args) {
      calls.insertImportRun.push(args);
      return { id: `run-${runSeq++}` };
    },
  };

  return { adapter, calls };
}

// =============================================================
// Tests
// =============================================================

describe('B7B — runCollectiveAgreementParserResultImport', () => {
  let agreement: RegistryAgreementRow;
  beforeEach(() => {
    agreement = { id: 'agr-1', internal_code: 'COM-GEN-IB' };
  });

  it('dryRun=true does not call any write method', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })], dryRun: true },
      adapter,
    );
    expect(result.dryRun).toBe(true);
    expect(calls.insertSource).toHaveLength(0);
    expect(calls.unsetCurrentVersions).toHaveLength(0);
    expect(calls.insertVersion).toHaveLength(0);
    expect(calls.replaceSalaryRowsForVersion).toHaveLength(0);
    expect(calls.replaceRulesForVersion).toHaveLength(0);
    expect(calls.updateAgreementParserStatus).toHaveLength(0);
    // Audit allowed
    expect(calls.insertImportRun).toHaveLength(1);
    expect(calls.insertImportRun[0].report_json.dryRun).toBe(true);
  });

  it('AGREEMENT_NOT_FOUND for unknown internalCode and continues with the rest', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const result = await runCollectiveAgreementParserResultImport(
      {
        parserResults: [
          makeResult({ internalCode: 'GHOST' }),
          makeResult({ internalCode: 'COM-GEN-IB' }),
        ],
      },
      adapter,
    );
    expect(result.errors.some((e) => e.reason === 'AGREEMENT_NOT_FOUND')).toBe(true);
    expect(calls.updateAgreementParserStatus).toHaveLength(1);
    expect(calls.updateAgreementParserStatus[0].agreement_id).toBe('agr-1');
  });

  it('INVALID_SHA256 when hash is not 64 hex', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const bad = makeResult({ internalCode: 'COM-GEN-IB', sha: 'not-a-hash' });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [bad] },
      adapter,
    );
    expect(result.errors.some((e) => e.reason === 'INVALID_SHA256')).toBe(true);
    expect(calls.fetchAgreementByInternalCode).toHaveLength(0);
  });

  it('inserts source only when missing and creates parser-import-v1 with is_current=true', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })] },
      adapter,
    );
    expect(calls.insertSource).toHaveLength(1);
    expect(calls.insertVersion).toHaveLength(1);
    expect(calls.insertVersion[0].version_label).toBe('parser-import-v1');
    expect(calls.insertVersion[0].is_current).toBe(true);
    expect(calls.unsetCurrentVersions).toHaveLength(0);
    expect(result.insertedSources).toBe(1);
    expect(result.createdVersions).toBe(1);
  });

  it('same SHA as current: no new version; without manualReviewed warns and does not refresh', async () => {
    const { adapter, calls } = createAdapter({
      agreements: { 'COM-GEN-IB': agreement },
      currentVersionByAgreement: {
        'agr-1': {
          id: 'ver-current',
          agreement_id: 'agr-1',
          version_label: 'parser-import-v1',
          source_hash: VALID_SHA_A,
          is_current: true,
        },
      },
      sourcesByAgreementHash: {
        [`agr-1|${VALID_SHA_A}`]: [{ id: 'src-existing', agreement_id: 'agr-1', document_hash: VALID_SHA_A }],
      },
    });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })] },
      adapter,
    );
    expect(calls.insertVersion).toHaveLength(0);
    expect(calls.replaceSalaryRowsForVersion).toHaveLength(0);
    expect(calls.insertSource).toHaveLength(0);
    expect(
      result.warnings.some((w) => w.reason === 'MANUAL_REVIEW_REQUIRED_TO_REFRESH_EXISTING_VERSION'),
    ).toBe(true);
  });

  it('same SHA + manualReviewed=true refreshes salary rows/rules on current version', async () => {
    const { adapter, calls } = createAdapter({
      agreements: { 'COM-GEN-IB': agreement },
      currentVersionByAgreement: {
        'agr-1': {
          id: 'ver-current',
          agreement_id: 'agr-1',
          version_label: 'parser-import-v1',
          source_hash: VALID_SHA_A,
          is_current: true,
        },
      },
      sourcesByAgreementHash: {
        [`agr-1|${VALID_SHA_A}`]: [{ id: 'src-existing', agreement_id: 'agr-1', document_hash: VALID_SHA_A }],
      },
    });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })], manualReviewed: true },
      adapter,
    );
    expect(calls.insertVersion).toHaveLength(0);
    expect(calls.replaceSalaryRowsForVersion).toHaveLength(1);
    expect(calls.replaceSalaryRowsForVersion[0].version_id).toBe('ver-current');
    expect(calls.replaceRulesForVersion).toHaveLength(1);
    expect(result.refreshedVersions).toBe(1);
  });

  it('different SHA: unsetCurrentVersions called and new is_current version created with previousCurrentVersionId in report', async () => {
    const { adapter, calls } = createAdapter({
      agreements: { 'COM-GEN-IB': agreement },
      currentVersionByAgreement: {
        'agr-1': {
          id: 'ver-old',
          agreement_id: 'agr-1',
          version_label: 'parser-import-v1',
          source_hash: VALID_SHA_A,
          is_current: true,
        },
      },
    });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB', sha: VALID_SHA_B })] },
      adapter,
    );
    expect(calls.unsetCurrentVersions).toEqual(['agr-1']);
    expect(calls.insertVersion).toHaveLength(1);
    expect(calls.insertVersion[0].is_current).toBe(true);
    expect(calls.insertVersion[0].source_hash).toBe(VALID_SHA_B);
    expect(calls.insertVersion[0].change_type).toBe('salary_revision');
    const report = calls.insertImportRun[0].report_json as Record<string, any>;
    expect(report.perAgreement['COM-GEN-IB'].previousCurrentVersionId).toBe('ver-old');
    expect(result.createdVersions).toBe(1);
  });

  it('rows with rowConfidence<0.6 are discarded with LOW_CONFIDENCE_ROW warning', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const lowRow = makeResult({
      internalCode: 'COM-GEN-IB',
      salaryRows: [
        {
          year: 2026,
          sourcePage: 1,
          sourceExcerpt: 'low conf',
          rowConfidence: 0.3,
          warnings: [],
          requiresHumanReview: true,
        },
      ],
    });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [lowRow] },
      adapter,
    );
    expect(result.discardedSalaryRows).toBe(1);
    expect(result.warnings.some((w) => w.reason === 'LOW_CONFIDENCE_ROW')).toBe(true);
    expect(calls.replaceSalaryRowsForVersion).toHaveLength(0);
  });

  it('rows missing sourcePage/sourceExcerpt are dropped with MISSING_SOURCE_EVIDENCE', async () => {
    const { adapter } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const noEvidence = makeResult({
      internalCode: 'COM-GEN-IB',
      salaryRows: [
        {
          year: 2026,
          sourcePage: 0,
          sourceExcerpt: '',
          rowConfidence: 0.9,
          warnings: [],
          requiresHumanReview: true,
        },
      ],
    });
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [noEvidence] },
      adapter,
    );
    expect(result.warnings.some((w) => w.reason === 'MISSING_SOURCE_EVIDENCE')).toBe(true);
    expect(result.discardedSalaryRows).toBe(1);
  });

  it('without valid rows: salary_tables_loaded=false in patch', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const noRows = makeResult({ internalCode: 'COM-GEN-IB', salaryRows: [] });
    await runCollectiveAgreementParserResultImport({ parserResults: [noRows] }, adapter);
    const patch = calls.updateAgreementParserStatus[0].patch;
    expect(patch.salary_tables_loaded).toBe(false);
    expect(patch.data_completeness).toBe('parsed_partial'); // rules are meaningful
  });

  it('rules replace is called with requires_human_review=true', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })] },
      adapter,
    );
    expect(calls.replaceRulesForVersion).toHaveLength(1);
    expect(calls.replaceRulesForVersion[0].requires_human_review).toBe(true);
  });

  it('final patch always has safe flags', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })] },
      adapter,
    );
    const patch = calls.updateAgreementParserStatus[0].patch;
    expect(patch.ready_for_payroll).toBe(false);
    expect(patch.requires_human_review).toBe(true);
    expect(patch.official_submission_blocked).toBe(true);
    expect(patch.data_completeness).not.toBe('human_validated' as never);
  });

  it('malicious input forcing ready_for_payroll=true is neutralized', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const malicious = makeResult({ internalCode: 'COM-GEN-IB' });
    (malicious.proposedRegistryPatch as any).ready_for_payroll = true;
    (malicious.proposedRegistryPatch as any).requires_human_review = false;
    (malicious.proposedRegistryPatch as any).data_completeness = 'human_validated';
    const result = await runCollectiveAgreementParserResultImport(
      { parserResults: [malicious] },
      adapter,
    );
    const patch = calls.updateAgreementParserStatus[0].patch;
    expect(patch.ready_for_payroll).toBe(false);
    expect(patch.requires_human_review).toBe(true);
    expect(patch.data_completeness).not.toBe('human_validated' as never);
    expect(result.safetySummary.forcedReadyForPayrollFalse).toBeGreaterThanOrEqual(1);
  });

  it('forceParserSafety neutralizes individual ParserResult', () => {
    const malicious = makeResult({ internalCode: 'X' });
    (malicious.proposedRegistryPatch as any).ready_for_payroll = true;
    (malicious.proposedRegistryPatch as any).requires_human_review = false;
    (malicious.proposedRegistryPatch as any).data_completeness = 'human_validated';
    const safe = forceParserSafety(malicious);
    expect(safe.proposedRegistryPatch.ready_for_payroll).toBe(false);
    expect(safe.proposedRegistryPatch.requires_human_review).toBe(true);
    expect(safe.proposedRegistryPatch.official_submission_blocked).toBe(true);
    expect(safe.proposedRegistryPatch.data_completeness).not.toBe('human_validated' as never);
  });

  it('import_run report contains perAgreement, previousCurrentVersionId, preUpdateSnapshot, safetySummary', async () => {
    const { adapter, calls } = createAdapter({
      agreements: { 'COM-GEN-IB': agreement },
      snapshotByAgreement: { 'agr-1': { official_name: 'X', notes: 'Y' } },
    });
    await runCollectiveAgreementParserResultImport(
      { parserResults: [makeResult({ internalCode: 'COM-GEN-IB' })] },
      adapter,
    );
    const report = calls.insertImportRun[0].report_json as any;
    expect(report.perAgreement['COM-GEN-IB']).toBeDefined();
    expect(report.perAgreement['COM-GEN-IB'].preUpdateSnapshot).toEqual({
      official_name: 'X',
      notes: 'Y',
    });
    expect(report.perAgreement['COM-GEN-IB'].previousCurrentVersionId).toBeNull();
    expect(report.safetySummary.forcedReadyForPayrollFalse).toBe(1);
  });

  it('idempotency: two consecutive runs do not duplicate sources nor versions', async () => {
    const { adapter, calls } = createAdapter({ agreements: { 'COM-GEN-IB': agreement } });
    const r1 = makeResult({ internalCode: 'COM-GEN-IB' });
    await runCollectiveAgreementParserResultImport({ parserResults: [r1] }, adapter);
    await runCollectiveAgreementParserResultImport({ parserResults: [r1] }, adapter);
    expect(calls.insertSource).toHaveLength(1);
    expect(calls.insertVersion).toHaveLength(1);
  });

  it('writer file does not import Supabase nor reference operational table', () => {
    const filePath = path.resolve(
      __dirname,
      '../../engines/erp/hr/collectiveAgreementsParserResultWriter.ts',
    );
    const src = fs.readFileSync(filePath, 'utf8');
    expect(src).not.toContain('@/integrations/supabase/client');
    expect(src).not.toContain('from "@supabase');
    expect(src).not.toContain("from '@supabase");
    // Operational table name must NEVER appear without _registry suffix.
    const operationalMatches = src.match(/erp_hr_collective_agreements(?!_registry)/g);
    expect(operationalMatches).toBeNull();
    // No fetch / no React.
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toContain("from 'react'");
  });
});
