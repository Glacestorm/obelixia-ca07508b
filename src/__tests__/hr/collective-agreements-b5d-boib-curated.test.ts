import { describe, expect, it, vi } from 'vitest';

import {
  computeSourceDocumentFingerprint,
  runSourceFetchAndImportDryRun,
} from '@/engines/erp/hr/collectiveAgreementsSourceFetchers';
import type { NormalizedAgreementRegistryRecord } from '@/engines/erp/hr/collectiveAgreementsImportTypes';

import { boibCuratedComercioPayload } from './fixtures/collective-agreements/b5d-boib/boib-real-curated-comercio.fixture';
import { boibCuratedPanaderiaPayload } from './fixtures/collective-agreements/b5d-boib/boib-real-curated-panaderia.fixture';
import { boibCuratedHosteleriaPayload } from './fixtures/collective-agreements/b5d-boib/boib-real-curated-hosteleria.fixture';
import { boibCuratedAlimentariaPayload } from './fixtures/collective-agreements/b5d-boib/boib-real-curated-alimentaria.fixture';

// =============================================================
// Helpers
// =============================================================

type SeedKey =
  | 'COM-GEN-IB'
  | 'PAN-PAST-IB'
  | 'HOST-IB'
  | 'IND-ALIM-IB'
  | 'NEW_CANDIDATE_REQUIRES_REVIEW';

function mapBoibCandidateToSeed(
  record: NormalizedAgreementRegistryRecord
): SeedKey {
  const name = record.official_name.toLowerCase();
  if (name.includes('comerç') || name.includes('comercio')) return 'COM-GEN-IB';
  if (
    name.includes('panaderia') ||
    name.includes('panadería') ||
    name.includes('pasteleria') ||
    name.includes('pastelería') ||
    name.includes('obrador') ||
    name.includes('bolleria')
  ) {
    return 'PAN-PAST-IB';
  }
  if (
    name.includes('hostaleria') ||
    name.includes('hostelería') ||
    name.includes('hosteleria')
  ) {
    return 'HOST-IB';
  }
  if (
    name.includes('indústria alimentària') ||
    name.includes('industria alimentaria')
  ) {
    return 'IND-ALIM-IB';
  }
  return 'NEW_CANDIDATE_REQUIRES_REVIEW';
}

function assertHardSafety(records: NormalizedAgreementRegistryRecord[]) {
  for (const r of records) {
    expect(r.ready_for_payroll).toBe(false);
    expect(r.salary_tables_loaded).toBe(false);
    expect(r.requires_human_review).toBe(true);
    expect(r.official_submission_blocked).toBe(true);
    expect(r.data_completeness).toBe('metadata_only');
    expect(r.status).toBe('pendiente_validacion');
  }
}

const ALL_PAYLOADS = [
  { label: 'comercio', payload: boibCuratedComercioPayload, seed: 'COM-GEN-IB' as SeedKey },
  { label: 'panaderia', payload: boibCuratedPanaderiaPayload, seed: 'PAN-PAST-IB' as SeedKey },
  { label: 'hosteleria', payload: boibCuratedHosteleriaPayload, seed: 'HOST-IB' as SeedKey },
  { label: 'alimentaria', payload: boibCuratedAlimentariaPayload, seed: 'IND-ALIM-IB' as SeedKey },
];

// =============================================================
// Tests
// =============================================================

describe('B5D — BOIB curated manual_upload dryRun', () => {
  describe('Comercio BOIB dryRun', () => {
    it('normalizes records as metadata_only with full safety contract', async () => {
      const result = await runSourceFetchAndImportDryRun({
        fetchRequest: {
          source: 'BOIB',
          jurisdictionCode: 'ES-IB',
          limit: 20,
          dryRun: true,
          manualPayload: boibCuratedComercioPayload.manualPayload,
        },
        existingInternalCodes: [],
      });

      expect(result.fetch.source).toBe('BOIB');
      expect(result.fetch.sourceAccessMode).toBe('fixture');
      expect(result.importRun.normalized).toBe(2);
      expect(result.upsertPlan.toInsert.length).toBeGreaterThan(0);

      // Records carry an official_name and stay metadata_only.
      for (const rec of result.upsertPlan.toInsert) {
        expect(rec.official_name.length).toBeGreaterThan(0);
        expect(rec.autonomous_region).toBe('IB');
        expect(rec.publication_source).toBe('BOIB');
      }

      // No CNAE / vigencia invented.
      for (const rec of result.upsertPlan.toInsert) {
        expect(rec.cnae_codes).toEqual([]);
        expect(rec.effective_start_date).toBeNull();
        expect(rec.effective_end_date).toBeNull();
      }

      assertHardSafety(result.upsertPlan.toInsert);

      expect(result.safetySummary).toEqual({
        allReadyForPayrollFalse: true,
        allRequireHumanReview: true,
        allOfficialSubmissionBlocked: true,
        allMetadataOnly: true,
        allBlockedFromPayroll: true,
      });
    });
  });

  describe('Panadería/Pastelería BOIB dryRun', () => {
    it('detects PAN-PAST-IB candidate, no payroll readiness', async () => {
      const result = await runSourceFetchAndImportDryRun({
        fetchRequest: {
          source: 'BOIB',
          jurisdictionCode: 'ES-IB',
          limit: 20,
          dryRun: true,
          manualPayload: boibCuratedPanaderiaPayload.manualPayload,
        },
        existingInternalCodes: [],
      });

      expect(result.upsertPlan.toInsert.length).toBe(1);
      const seedMap = result.upsertPlan.toInsert.map(mapBoibCandidateToSeed);
      expect(seedMap).toContain('PAN-PAST-IB');

      assertHardSafety(result.upsertPlan.toInsert);
    });
  });

  describe('Hostelería BOIB dryRun', () => {
    it('detects HOST-IB candidate, no payroll readiness', async () => {
      const result = await runSourceFetchAndImportDryRun({
        fetchRequest: {
          source: 'BOIB',
          jurisdictionCode: 'ES-IB',
          limit: 20,
          dryRun: true,
          manualPayload: boibCuratedHosteleriaPayload.manualPayload,
        },
        existingInternalCodes: [],
      });

      expect(result.upsertPlan.toInsert.length).toBe(1);
      const seedMap = result.upsertPlan.toInsert.map(mapBoibCandidateToSeed);
      expect(seedMap).toContain('HOST-IB');
      assertHardSafety(result.upsertPlan.toInsert);
    });
  });

  describe('Industria alimentaria BOIB dryRun', () => {
    it('detects IND-ALIM-IB candidate, no payroll readiness', async () => {
      const result = await runSourceFetchAndImportDryRun({
        fetchRequest: {
          source: 'BOIB',
          jurisdictionCode: 'ES-IB',
          limit: 20,
          dryRun: true,
          manualPayload: boibCuratedAlimentariaPayload.manualPayload,
        },
        existingInternalCodes: [],
      });

      expect(result.upsertPlan.toInsert.length).toBe(1);
      const seedMap = result.upsertPlan.toInsert.map(mapBoibCandidateToSeed);
      expect(seedMap).toContain('IND-ALIM-IB');
      assertHardSafety(result.upsertPlan.toInsert);
    });
  });

  describe('Fingerprint behavior', () => {
    it('every record gets a fnv1a32: fingerprint', async () => {
      for (const { payload } of ALL_PAYLOADS) {
        const result = await runSourceFetchAndImportDryRun({
          fetchRequest: {
            source: 'BOIB',
            jurisdictionCode: 'ES-IB',
            limit: 20,
            dryRun: true,
            manualPayload: payload.manualPayload,
          },
          existingInternalCodes: [],
        });
        const fps = Object.values(result.fingerprints);
        expect(fps.length).toBeGreaterThan(0);
        for (const fp of fps) {
          expect(fp.startsWith('fnv1a32:')).toBe(true);
        }
      }
    });

    it('fingerprint changes when title, date or documentUrl changes; not only by publicationUrl', () => {
      const base = {
        sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/COM-GEN-IB-001',
        documentUrl: 'https://www.caib.es/doc/com-gen-ib.pdf',
        title: 'Conveni del comerç IB',
        publicationDate: '2024-09-12',
      };
      const baseFp = computeSourceDocumentFingerprint(base);
      const titleChanged = computeSourceDocumentFingerprint({
        ...base,
        title: 'Conveni del comerç IB (rev.)',
      });
      const dateChanged = computeSourceDocumentFingerprint({
        ...base,
        publicationDate: '2025-02-18',
      });
      const docChanged = computeSourceDocumentFingerprint({
        ...base,
        documentUrl: 'https://www.caib.es/doc/com-gen-ib-v2.pdf',
      });
      // publication_url alone must NOT be the only change signal.
      const onlySourceUrlChanged = computeSourceDocumentFingerprint({
        ...base,
        sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/COM-GEN-IB-002',
      });

      expect(titleChanged).not.toBe(baseFp);
      expect(dateChanged).not.toBe(baseFp);
      expect(docChanged).not.toBe(baseFp);
      expect(onlySourceUrlChanged).not.toBe(baseFp);

      // Two records with different titles but same sourceUrl → different fps.
      const twinA = computeSourceDocumentFingerprint({
        sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/X',
        title: 'A',
      });
      const twinB = computeSourceDocumentFingerprint({
        sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/X',
        title: 'B',
      });
      expect(twinA).not.toBe(twinB);
    });
  });

  describe('No real network', () => {
    it('does not call globalThis.fetch during any B5D dryRun', async () => {
      const realFetch = globalThis.fetch;
      const fetchSpy = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = fetchSpy;
      try {
        for (const { payload } of ALL_PAYLOADS) {
          await runSourceFetchAndImportDryRun({
            fetchRequest: {
              source: 'BOIB',
              jurisdictionCode: 'ES-IB',
              limit: 20,
              dryRun: true,
              manualPayload: payload.manualPayload,
            },
            existingInternalCodes: [],
          });
        }
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = realFetch;
      }
    });
  });

  describe('Limit and DB-write guards', () => {
    it('every curated payload has at most 20 entries', () => {
      for (const { payload, label } of ALL_PAYLOADS) {
        expect(
          payload.manualPayload.items.length,
          `payload ${label} must have <= 20 entries`
        ).toBeLessThanOrEqual(20);
      }
    });

    it('runSourceFetchAndImportDryRun has no DB adapter parameter (type-level guarantee)', async () => {
      // Calling without any adapter still works → cannot perform writes.
      const result = await runSourceFetchAndImportDryRun({
        fetchRequest: {
          source: 'BOIB',
          jurisdictionCode: 'ES-IB',
          limit: 20,
          dryRun: true,
          manualPayload: boibCuratedComercioPayload.manualPayload,
        },
        existingInternalCodes: [],
      });
      expect(result).toBeDefined();
      // No DB-related fields exist on the result.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).inserted).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).updated).toBeUndefined();
    });
  });

  describe('Seed mapping coverage', () => {
    it('maps each curated payload to its expected Balearic seed', async () => {
      for (const { payload, seed } of ALL_PAYLOADS) {
        const result = await runSourceFetchAndImportDryRun({
          fetchRequest: {
            source: 'BOIB',
            jurisdictionCode: 'ES-IB',
            limit: 20,
            dryRun: true,
            manualPayload: payload.manualPayload,
          },
          existingInternalCodes: [],
        });
        const mapped = result.upsertPlan.toInsert.map(mapBoibCandidateToSeed);
        expect(mapped).toContain(seed);
      }
    });
  });
});
