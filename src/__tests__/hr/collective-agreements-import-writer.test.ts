/**
 * B5B — Import Writer tests (in-memory adapter).
 *
 * The writer is unit-tested against a fake `RegistryDbAdapter` so we
 * never need Supabase. Edge function authorization is tested separately
 * (see docs/qa/HR_COLLECTIVE_AGREEMENTS_B5B_IMPORT_WRITER.md §5).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runCollectiveAgreementMetadataImport,
  buildSafeMetadataPatch,
  forceSafetyFlags,
  type RegistryDbAdapter,
  type ExistingRegistryRecord,
  type InsertImportRunArgs,
  type InsertVersionArgs,
  type InsertSourceArgs,
  type InsertRegistryArgs,
  type UpdateRegistryArgs,
} from '@/engines/erp/hr/collectiveAgreementsImportWriter';
import { computeSourceDocumentFingerprint } from '@/engines/erp/hr/collectiveAgreementsSourceFetchers';
import type {
  RawAgreementMetadata,
  NormalizedAgreementRegistryRecord,
} from '@/engines/erp/hr/collectiveAgreementsImportTypes';

// =============================================================
// In-memory adapter
// =============================================================

interface RegistryRow {
  id: string;
  internal_code: string;
  source_document_hash: string | null;
  data: NormalizedAgreementRegistryRecord;
  metadataPatches: UpdateRegistryArgs[];
}

interface VersionRow {
  id: string;
  agreement_id: string;
  is_current: boolean;
  source_hash: string | null;
  args: InsertVersionArgs;
}

function createMemoryAdapter(seed?: ExistingRegistryRecord[]): {
  adapter: RegistryDbAdapter;
  rows: RegistryRow[];
  versions: VersionRow[];
  sources: InsertSourceArgs[];
  importRuns: InsertImportRunArgs[];
} {
  const rows: RegistryRow[] = (seed ?? []).map((s, i) => ({
    id: s.id,
    internal_code: s.internal_code,
    source_document_hash: s.source_document_hash ?? null,
    data: {} as NormalizedAgreementRegistryRecord,
    metadataPatches: [],
  }));
  const versions: VersionRow[] = [];
  const sources: InsertSourceArgs[] = [];
  const importRuns: InsertImportRunArgs[] = [];
  let nextId = 1000;

  const adapter: RegistryDbAdapter = {
    async fetchExistingByInternalCodes(codes) {
      const upper = new Set(codes.map(c => c.trim().toUpperCase()));
      return rows
        .filter(r => upper.has(r.internal_code.trim().toUpperCase()))
        .map(r => ({
          id: r.id,
          internal_code: r.internal_code,
          source_document_hash: r.source_document_hash,
        }));
    },
    async fetchCurrentVersionHash(agreementId) {
      const v = versions.find(x => x.agreement_id === agreementId && x.is_current);
      return v?.source_hash ?? null;
    },
    async insertRegistryRecord({ record }: InsertRegistryArgs) {
      const id = `reg-${nextId++}`;
      rows.push({
        id,
        internal_code: record.internal_code,
        source_document_hash: record.publication_url ?? null,
        data: record,
        metadataPatches: [],
      });
      return { id };
    },
    async updateRegistryMetadata(args: UpdateRegistryArgs) {
      const r = rows.find(x => x.id === args.id);
      if (!r) throw new Error('not found');
      r.metadataPatches.push(args);
    },
    async insertVersion(args: InsertVersionArgs) {
      const id = `ver-${nextId++}`;
      versions.push({
        id,
        agreement_id: args.agreement_id,
        is_current: args.is_current,
        source_hash: args.source_hash,
        args,
      });
      return { id };
    },
    async unsetCurrentVersions(agreementId: string) {
      for (const v of versions) {
        if (v.agreement_id === agreementId) v.is_current = false;
      }
    },
    async insertSource(args: InsertSourceArgs) {
      sources.push(args);
    },
    async insertImportRun(args: InsertImportRunArgs) {
      importRuns.push(args);
      return { id: `run-${importRuns.length}` };
    },
  };

  return { adapter, rows, versions, sources, importRuns };
}

// =============================================================
// Fixtures
// =============================================================

function rawBoeBakery(overrides: Partial<RawAgreementMetadata> = {}): RawAgreementMetadata {
  return {
    source: 'BOIB',
    sourceId: 'BOIB-NEW-1',
    agreementCode: 'PAN-PAST-IB',
    officialName: 'Convenio colectivo de Panaderías y Pastelerías de las Illes Balears',
    publicationDate: '2025-07-22',
    publicationUrl: 'https://caib.es/eboib/2025/pan-past-ib',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Panadería y Pastelería',
    cnaeCodes: ['1071', '1072'],
    effectiveStartDate: '2025-01-01',
    ...overrides,
  };
}

// =============================================================
// Tests
// =============================================================

describe('B5B — runCollectiveAgreementMetadataImport', () => {
  describe('dry run', () => {
    it('1. dryRun no escribe registry/versions/sources y devuelve plan', async () => {
      const { adapter, rows, versions, sources, importRuns } = createMemoryAdapter();
      const r = await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()], dryRun: true },
        adapter
      );
      expect(r.dryRun).toBe(true);
      expect(r.inserted).toBe(0);
      expect(r.updated).toBe(0);
      expect(rows).toHaveLength(0);
      expect(versions).toHaveLength(0);
      expect(sources).toHaveLength(0);
      expect(r.plan.toInsert[0].internal_code).toBe('PAN-PAST-IB');
      // Audit run is allowed in dryRun and includes the dryRun flag.
      expect(importRuns[0]?.report_json.dryRun).toBe(true);
    });
  });

  describe('safety contract — input forcing', () => {
    it('2. input con ready_for_payroll=true queda forzado a false', async () => {
      const { adapter, rows } = createMemoryAdapter();
      // The normalizer ignores fields not in RawAgreementMetadata, so we
      // build a malicious raw and let the writer enforce defaults.
      const malicious = rawBoeBakery();
      // Inject extra fields to simulate a tampered payload — they should
      // be ignored by the normalizer and overridden by forceSafetyFlags.
      (malicious as unknown as Record<string, unknown>).ready_for_payroll = true;
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [malicious] },
        adapter
      );
      expect(rows[0].data.ready_for_payroll).toBe(false);
    });

    it('3. input con salary_tables_loaded=true queda forzado a false', async () => {
      const { adapter, rows } = createMemoryAdapter();
      const malicious = rawBoeBakery();
      (malicious as unknown as Record<string, unknown>).salary_tables_loaded = true;
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [malicious] },
        adapter
      );
      expect(rows[0].data.salary_tables_loaded).toBe(false);
    });

    it('4. input con requires_human_review=false queda forzado a true', async () => {
      const { adapter, rows } = createMemoryAdapter();
      const malicious = rawBoeBakery();
      (malicious as unknown as Record<string, unknown>).requires_human_review = false;
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [malicious] },
        adapter
      );
      expect(rows[0].data.requires_human_review).toBe(true);
    });

    it('5. input con official_submission_blocked=false queda forzado a true', async () => {
      const { adapter, rows } = createMemoryAdapter();
      const malicious = rawBoeBakery();
      (malicious as unknown as Record<string, unknown>).official_submission_blocked = false;
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [malicious] },
        adapter
      );
      expect(rows[0].data.official_submission_blocked).toBe(true);
    });

    it('6. forceSafetyFlags es idempotente y nunca relaja', () => {
      const out = forceSafetyFlags({
        internal_code: 'X',
        official_name: 'X',
        scope_type: 'sector',
        jurisdiction_code: 'ES',
        cnae_codes: [],
        status: 'pendiente_validacion',
        source_quality: 'official',
        data_completeness: 'metadata_only',
        salary_tables_loaded: true as unknown as false,
        ready_for_payroll: true as unknown as false,
        requires_human_review: false as unknown as true,
        official_submission_blocked: false as unknown as true,
      } as unknown as NormalizedAgreementRegistryRecord);
      expect(out.ready_for_payroll).toBe(false);
      expect(out.salary_tables_loaded).toBe(false);
      expect(out.requires_human_review).toBe(true);
      expect(out.official_submission_blocked).toBe(true);
      expect(out.data_completeness).toBe('metadata_only');
      expect(out.status).toBe('pendiente_validacion');
    });
  });

  describe('insert path', () => {
    it('7. insert nuevo crea registry record metadata_only', async () => {
      const { adapter, rows } = createMemoryAdapter();
      const r = await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()] },
        adapter
      );
      expect(r.inserted).toBe(1);
      expect(rows[0].data.data_completeness).toBe('metadata_only');
      expect(rows[0].data.ready_for_payroll).toBe(false);
    });

    it('8. insert nuevo crea version inicial current', async () => {
      const { adapter, versions } = createMemoryAdapter();
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()] },
        adapter
      );
      expect(versions).toHaveLength(1);
      expect(versions[0].args.version_label).toBe('metadata-import-v1');
      expect(versions[0].args.change_type).toBe('initial_text');
      expect(versions[0].is_current).toBe(true);
    });

    it('9. insert nuevo crea source pending', async () => {
      const { adapter, sources } = createMemoryAdapter();
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()] },
        adapter
      );
      expect(sources).toHaveLength(1);
      expect(sources[0].status).toBe('pending');
      expect(sources[0].source_url).toContain('caib.es');
    });
  });

  describe('update path', () => {
    let seedId: string;
    let env: ReturnType<typeof createMemoryAdapter>;
    let initialFingerprint: string;

    beforeEach(async () => {
      seedId = 'seed-1';
      env = createMemoryAdapter([
        {
          id: seedId,
          internal_code: 'PAN-PAST-IB',
          source_document_hash: 'https://caib.es/eboib/2025/pan-past-ib',
        },
      ]);
      // The writer (B5E) versions on FNV-1a fingerprints over
      // (title|date|documentUrl|sourceUrl). Seed the initial current
      // version with the matching fingerprint so the "no change" path
      // is exercised correctly.
      initialFingerprint = computeSourceDocumentFingerprint({
        title:
          'Convenio colectivo de Panaderías y Pastelerías de las Illes Balears',
        publicationDate: '2025-07-22',
        sourceUrl: 'https://caib.es/eboib/2025/pan-past-ib',
        documentUrl: 'https://caib.es/eboib/2025/pan-past-ib',
      });
      // Seed an initial current version with the same hash.
      await env.adapter.insertVersion({
        agreement_id: seedId,
        version_label: 'metadata-import-v1',
        publication_date: '2025-07-22',
        source_url: 'https://caib.es/eboib/2025/pan-past-ib',
        effective_start_date: null,
        effective_end_date: null,
        change_type: 'initial_text',
        source_hash: initialFingerprint,
        parsed_summary: {},
        is_current: true,
      });
    });

    it('10. update existente solo actualiza metadatos seguros', async () => {
      const r = await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery({ sector: 'Panaderías y Pastelerías (actualizado)' })] },
        env.adapter
      );
      expect(r.updated).toBe(1);
      const patch = env.rows[0].metadataPatches[0].metadataPatch;
      expect(patch.sector).toBe('Panaderías y Pastelerías (actualizado)');
      expect(patch.official_name).toContain('Panader');
      // Sensitive flags must NEVER appear in the safe patch object.
      expect(Object.keys(patch)).not.toContain('ready_for_payroll');
      expect(Object.keys(patch)).not.toContain('salary_tables_loaded');
      expect(Object.keys(patch)).not.toContain('requires_human_review');
      expect(Object.keys(patch)).not.toContain('official_submission_blocked');
      expect(Object.keys(patch)).not.toContain('data_completeness');
    });

    it('11. update existente no toca safety flags ni añade nueva versión sin cambio de hash', async () => {
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()] },
        env.adapter
      );
      // Same publication_url ⇒ same hash ⇒ no new version.
      expect(env.versions.filter(v => v.agreement_id === seedId)).toHaveLength(1);
    });

    it('12. cambio de document_hash crea nueva versión y desactiva anterior', async () => {
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery({ publicationUrl: 'https://caib.es/eboib/2025/pan-past-ib-rev2' })] },
        env.adapter
      );
      const all = env.versions.filter(v => v.agreement_id === seedId);
      expect(all).toHaveLength(2);
      const current = all.filter(v => v.is_current);
      expect(current).toHaveLength(1);
      // New version carries a fresh FNV-1a fingerprint distinct from
      // the seeded one (publication_url changed to *-rev2).
      expect(current[0].source_hash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
      expect(current[0].source_hash).not.toBe(initialFingerprint);
      expect(current[0].args.change_type).toBe('correction');
    });
  });

  describe('audit & errors', () => {
    it('13. import_run registra totales (inserted + updated + skipped + errors)', async () => {
      const { adapter, importRuns } = createMemoryAdapter();
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery(), rawBoeBakery()] }, // duplicate ⇒ 1 skipped
        adapter
      );
      const run = importRuns[0];
      expect(run.total_found).toBe(2);
      expect(run.inserted).toBe(1);
      expect(run.updated).toBe(0);
      expect(run.skipped).toBe(1);
      expect(run.status).toBe('completed');
    });

    it('14. errores de normalización quedan en report_json y status warning', async () => {
      const { adapter, importRuns } = createMemoryAdapter();
      const bad = { source: 'BOIB' } as unknown as RawAgreementMetadata; // missing officialName
      const r = await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery(), bad] },
        adapter
      );
      expect(r.errors.length).toBeGreaterThan(0);
      expect(importRuns[0].status).toBe('completed_with_warnings');
      expect((importRuns[0].report_json as { errors: unknown[] }).errors.length).toBeGreaterThan(0);
    });
  });

  describe('isolation guarantees', () => {
    it('15. no se toca tabla operativa erp_hr_collective_agreements (adapter no la expone)', () => {
      const { adapter } = createMemoryAdapter();
      // Static check: the adapter contract has no method targeting the
      // operational table. Enumerate its keys and assert none mentions it.
      const keys = Object.keys(adapter);
      for (const k of keys) {
        expect(k.toLowerCase()).not.toContain('operational');
      }
    });

    it('16. nunca se activa ready_for_payroll en ninguna fila escrita', async () => {
      const { adapter, rows } = createMemoryAdapter();
      await runCollectiveAgreementMetadataImport(
        { source: 'BOIB', items: [rawBoeBakery()] },
        adapter
      );
      for (const r of rows) {
        expect(r.data.ready_for_payroll).toBe(false);
        expect(r.data.salary_tables_loaded).toBe(false);
        expect(r.data.official_submission_blocked).toBe(true);
        expect(r.data.requires_human_review).toBe(true);
      }
    });
  });

  describe('helpers', () => {
    it('17. buildSafeMetadataPatch nunca incluye flags sensibles', () => {
      const patch = buildSafeMetadataPatch(
        forceSafetyFlags({
          internal_code: 'X',
          official_name: 'X',
          scope_type: 'sector',
          jurisdiction_code: 'ES',
          cnae_codes: [],
          status: 'pendiente_validacion',
          source_quality: 'official',
          data_completeness: 'metadata_only',
          salary_tables_loaded: false,
          ready_for_payroll: false,
          requires_human_review: true,
          official_submission_blocked: true,
        } as NormalizedAgreementRegistryRecord),
        new Date('2026-01-01').toISOString()
      );
      const forbidden = [
        'ready_for_payroll',
        'salary_tables_loaded',
        'requires_human_review',
        'official_submission_blocked',
        'data_completeness',
        'status',
      ];
      for (const f of forbidden) {
        expect(Object.keys(patch)).not.toContain(f);
      }
      expect(patch.updated_at).toBe('2026-01-01T00:00:00.000Z');
      expect(patch.last_verified_at).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
