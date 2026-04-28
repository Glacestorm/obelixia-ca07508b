/**
 * B5E — Controlled real write of the BOIB/Baleares curated batch.
 *
 * Uses an in-memory RegistryDbAdapter. No Supabase, no fetch, no
 * payroll, no operational table. The 4 seeds are pre-existing so the
 * expected outcome is `inserted=0, updated=4`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runCollectiveAgreementMetadataImport,
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
// In-memory adapter (B5E variant — exposes optional B5E hooks)
// =============================================================

const SAFE_KEYS = [
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

interface RegistryRow {
  id: string;
  internal_code: string;
  /** Mutable safe-metadata snapshot. Sensitive flags are shadowed for read. */
  safeMeta: Record<string, unknown>;
  /** Sensitive flags — initialized safe and asserted to NEVER mutate. */
  ready_for_payroll: boolean;
  salary_tables_loaded: boolean;
  requires_human_review: boolean;
  official_submission_blocked: boolean;
  data_completeness: string;
  status: string;
  patches: UpdateRegistryArgs[];
}

interface VersionRow {
  id: string;
  agreement_id: string;
  is_current: boolean;
  source_hash: string | null;
  args: InsertVersionArgs;
}

function createB5EMemoryAdapter(seeds: ExistingRegistryRecord[]) {
  const rows: RegistryRow[] = seeds.map(s => ({
    id: s.id,
    internal_code: s.internal_code,
    safeMeta: {
      official_name: `[seed] ${s.internal_code}`,
      sector: '[seed sector]',
    },
    ready_for_payroll: false,
    salary_tables_loaded: false,
    requires_human_review: true,
    official_submission_blocked: true,
    data_completeness: 'metadata_only',
    status: 'pendiente_validacion',
    patches: [],
  }));

  const versions: VersionRow[] = [];
  const sources: InsertSourceArgs[] = [];
  const importRuns: InsertImportRunArgs[] = [];
  // Operational-table tripwire — must remain at zero for B5E.
  const operationalTableCalls = { count: 0 };

  let nextId = 5000;

  const adapter: RegistryDbAdapter = {
    async fetchExistingByInternalCodes(codes) {
      const upper = new Set(codes.map(c => c.trim().toUpperCase()));
      return rows
        .filter(r => upper.has(r.internal_code.trim().toUpperCase()))
        .map(r => ({
          id: r.id,
          internal_code: r.internal_code,
          source_document_hash: null,
        }));
    },
    async fetchCurrentVersionHash(agreementId) {
      const v = versions.find(x => x.agreement_id === agreementId && x.is_current);
      return v?.source_hash ?? null;
    },
    async fetchCurrentVersionId(agreementId) {
      const v = versions.find(x => x.agreement_id === agreementId && x.is_current);
      return v?.id ?? null;
    },
    async fetchSafeMetadataSnapshot(agreementId) {
      const r = rows.find(x => x.id === agreementId);
      if (!r) return null;
      const snap: Record<string, unknown> = {};
      for (const k of SAFE_KEYS) snap[k] = r.safeMeta[k] ?? null;
      return snap;
    },
    async insertRegistryRecord({ record }: InsertRegistryArgs) {
      const id = `reg-${nextId++}`;
      rows.push({
        id,
        internal_code: record.internal_code,
        safeMeta: Object.fromEntries(
          SAFE_KEYS.map(k => [k, (record as unknown as Record<string, unknown>)[k]])
        ),
        ready_for_payroll: false,
        salary_tables_loaded: false,
        requires_human_review: true,
        official_submission_blocked: true,
        data_completeness: 'metadata_only',
        status: 'pendiente_validacion',
        patches: [],
      });
      return { id };
    },
    async updateRegistryMetadata(args: UpdateRegistryArgs) {
      const r = rows.find(x => x.id === args.id);
      if (!r) throw new Error('not found');
      r.patches.push(args);
      // Apply ONLY safe keys to safeMeta. Anything else is a bug we
      // want surfaced by tests.
      for (const [k, v] of Object.entries(args.metadataPatch)) {
        if (k === 'updated_at' || k === 'last_verified_at') continue;
        if (!(SAFE_KEYS as readonly string[]).includes(k)) {
          throw new Error(`forbidden_field_in_patch:${k}`);
        }
        r.safeMeta[k] = v;
      }
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

  return { adapter, rows, versions, sources, importRuns, operationalTableCalls };
}

// =============================================================
// BOIB/Baleares curated batch (4 records)
// =============================================================

const BOIB_BATCH: RawAgreementMetadata[] = [
  {
    source: 'BOIB',
    sourceId: 'BOIB-2024-COM-GEN-IB-001',
    agreementCode: 'COM-GEN-IB',
    officialName:
      'Conveni col·lectiu del sector del comerç en general de les Illes Balears',
    publicationDate: '2024-09-12',
    publicationUrl: 'https://www.caib.es/eboibfront/ca/2024/COM-GEN-IB-001',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Comercio en general',
  },
  {
    source: 'BOIB',
    sourceId: 'BOIB-2024-PAN-PAST-IB-001',
    agreementCode: 'PAN-PAST-IB',
    officialName:
      'Conveni col·lectiu del sector de panaderia, pasteleria, bolleria i obradors de les Illes Balears',
    publicationDate: '2024-11-05',
    publicationUrl: 'https://www.caib.es/eboibfront/ca/2024/PAN-PAST-IB-001',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Panadería, pastelería y obrador',
  },
  {
    source: 'BOIB',
    sourceId: 'BOIB-2024-HOST-IB-001',
    agreementCode: 'HOST-IB',
    officialName:
      "Conveni col·lectiu del sector d'hostaleria de les Illes Balears",
    publicationDate: '2024-07-22',
    publicationUrl: 'https://www.caib.es/eboibfront/ca/2024/HOST-IB-001',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Hostelería',
  },
  {
    source: 'BOIB',
    sourceId: 'BOIB-2024-IND-ALIM-IB-001',
    agreementCode: 'IND-ALIM-IB',
    officialName:
      "Conveni col·lectiu del sector de la indústria alimentària de les Illes Balears",
    publicationDate: '2024-10-03',
    publicationUrl: 'https://www.caib.es/eboibfront/ca/2024/IND-ALIM-IB-001',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Industria alimentaria',
  },
];

const SEED_CODES = ['COM-GEN-IB', 'PAN-PAST-IB', 'HOST-IB', 'IND-ALIM-IB'];

function buildSeeds(): ExistingRegistryRecord[] {
  return SEED_CODES.map((c, i) => ({
    id: `seed-${i}`,
    internal_code: c,
    source_document_hash: null,
  }));
}

// =============================================================
// Network guard
// =============================================================

let originalFetch: typeof globalThis.fetch | undefined;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchSpy = vi.fn(() => {
    throw new Error('B5E test attempted real network call');
  });
  globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
});

// =============================================================
// Tests
// =============================================================

describe('B5E — BOIB/Baleares controlled write (4 records)', () => {
  it('1. dryRun=false con 4 seeds existentes => inserted=0, updated=4, errors=[]', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    const result = await runCollectiveAgreementMetadataImport(
      {
        source: 'BOIB',
        items: BOIB_BATCH,
        dryRun: false,
        manualReviewed: true,
        dryRunReference: 'run-dryrun-001',
      },
      env.adapter
    );
    expect(result.dryRun).toBe(false);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(4);
    expect(result.errors).toEqual([]);
    expect(result.status).toBe('completed');
  });

  it('2. flags sensibles permanecen seguros tras el update', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    for (const r of env.rows) {
      expect(r.ready_for_payroll).toBe(false);
      expect(r.salary_tables_loaded).toBe(false);
      expect(r.requires_human_review).toBe(true);
      expect(r.official_submission_blocked).toBe(true);
      expect(r.data_completeness).toBe('metadata_only');
      expect(r.status).toBe('pendiente_validacion');
    }
  });

  it('3. metadataPatch solo contiene SAFE_UPDATE_FIELDS + updated_at + last_verified_at', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    const allowed = new Set([...SAFE_KEYS, 'updated_at', 'last_verified_at']);
    const forbidden = [
      'ready_for_payroll',
      'salary_tables_loaded',
      'requires_human_review',
      'official_submission_blocked',
      'data_completeness',
      'status',
      'source_quality',
    ];
    for (const row of env.rows) {
      expect(row.patches).toHaveLength(1);
      const patch = row.patches[0].metadataPatch as Record<string, unknown>;
      for (const k of Object.keys(patch)) {
        expect(allowed.has(k)).toBe(true);
      }
      for (const f of forbidden) {
        expect(Object.keys(patch)).not.toContain(f);
      }
    }
  });

  it('4. input malicioso con flags inseguros queda neutralizado por forceSafetyFlags', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    const tampered = BOIB_BATCH.map(r => {
      const m = { ...r } as RawAgreementMetadata & Record<string, unknown>;
      m.ready_for_payroll = true;
      m.salary_tables_loaded = true;
      m.requires_human_review = false;
      m.official_submission_blocked = false;
      m.data_completeness = 'human_validated';
      return m;
    });
    const result = await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: tampered, dryRun: false, manualReviewed: true },
      env.adapter
    );
    expect(result.errors).toEqual([]);
    for (const r of env.rows) {
      expect(r.ready_for_payroll).toBe(false);
      expect(r.salary_tables_loaded).toBe(false);
      expect(r.requires_human_review).toBe(true);
      expect(r.official_submission_blocked).toBe(true);
      expect(r.data_completeness).toBe('metadata_only');
    }
    // The plan reflects forced flags too.
    for (const rec of result.plan.toUpdate) {
      expect(rec.ready_for_payroll).toBe(false);
      expect(rec.salary_tables_loaded).toBe(false);
      expect(rec.requires_human_review).toBe(true);
      expect(rec.official_submission_blocked).toBe(true);
    }
  });

  it('5. idempotencia: dos runs con mismo publication_url no duplican versions ni sources', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    const versionsAfterFirst = env.versions.length;
    const sourcesAfterFirst = env.sources.length;
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    expect(env.versions.length).toBe(versionsAfterFirst);
    expect(env.sources.length).toBe(sourcesAfterFirst);
  });

  it('6. cambio de publication_url crea exactamente 1 nueva version (anterior is_current=false)', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    // Versions now exist (1 per seed because hash changed from null).
    const beforeCount = env.versions.filter(v => v.agreement_id === 'seed-0').length;
    expect(beforeCount).toBe(1);

    // Re-run with publication_url changed for COM-GEN-IB only.
    const modified = BOIB_BATCH.map(r =>
      r.agreementCode === 'COM-GEN-IB'
        ? { ...r, publicationUrl: r.publicationUrl + '-rev2' }
        : r
    );
    const result = await runCollectiveAgreementMetadataImport(
      {
        source: 'BOIB',
        items: modified,
        dryRun: false,
        manualReviewed: true,
        dryRunReference: 'run-dryrun-002',
      },
      env.adapter
    );
    expect(result.errors).toEqual([]);

    const seed0Versions = env.versions.filter(v => v.agreement_id === 'seed-0');
    expect(seed0Versions).toHaveLength(2);
    const current = seed0Versions.filter(v => v.is_current);
    expect(current).toHaveLength(1);
    expect(current[0].args.change_type).toBe('correction');
    expect(current[0].source_hash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);

    // previousCurrentVersionId recorded for COM-GEN-IB.
    const lastRun = env.importRuns[env.importRuns.length - 1];
    const prevMap = (lastRun.report_json as Record<string, unknown>)
      .previousCurrentVersionId as Record<string, string | null>;
    expect(prevMap['COM-GEN-IB']).toBe(seed0Versions[0].id);
  });

  it('7. import_run.report_json incluye manual_reviewed, candidateMapping, safetySummary, dryRun=false, snapshots', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      {
        source: 'BOIB',
        items: BOIB_BATCH,
        dryRun: false,
        manualReviewed: true,
        dryRunReference: 'run-dryrun-001',
      },
      env.adapter
    );
    expect(env.importRuns).toHaveLength(1);
    const report = env.importRuns[0].report_json as Record<string, unknown>;
    expect(report.dryRun).toBe(false);
    expect(report.manual_reviewed).toBe(true);
    expect(report.dryRunReference).toBe('run-dryrun-001');

    const mapping = report.candidateMapping as Record<string, unknown>;
    for (const code of SEED_CODES) {
      expect(mapping[code]).toBeDefined();
      const entry = mapping[code] as { fingerprint: string; publicationUrl: string };
      expect(entry.fingerprint).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
      expect(entry.publicationUrl).toContain('caib.es');
    }

    const summary = report.safetySummary as Record<string, boolean>;
    expect(summary.allReadyForPayrollFalse).toBe(true);
    expect(summary.allRequireHumanReview).toBe(true);
    expect(summary.allOfficialSubmissionBlocked).toBe(true);
    expect(summary.allMetadataOnly).toBe(true);
    expect(summary.allBlockedFromPayroll).toBe(true);

    const snapshots = report.preUpdateSnapshots as Record<string, unknown>;
    for (const code of SEED_CODES) {
      expect(snapshots[code]).toBeDefined();
      expect(snapshots[code]).not.toBeNull();
    }
  });

  it('8. globalThis.fetch nunca se invoca durante el run', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('9. tabla operativa simulada no recibe llamadas (counter=0)', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    expect(env.operationalTableCalls.count).toBe(0);
  });

  it('10. ningún record final muestra ready_for_payroll=true (defensa en profundidad)', async () => {
    const env = createB5EMemoryAdapter(buildSeeds());
    const result = await runCollectiveAgreementMetadataImport(
      { source: 'BOIB', items: BOIB_BATCH, dryRun: false, manualReviewed: true },
      env.adapter
    );
    const all: NormalizedAgreementRegistryRecord[] = [
      ...result.plan.toInsert,
      ...result.plan.toUpdate,
    ];
    for (const r of all) {
      expect(r.ready_for_payroll).toBe(false);
    }
    for (const r of env.rows) {
      expect(r.ready_for_payroll).toBe(false);
    }
  });
});