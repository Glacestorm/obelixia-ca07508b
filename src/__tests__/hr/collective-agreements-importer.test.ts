/**
 * B5A — Tests for collective agreements metadata importer.
 *
 * Covers:
 *  - source-specific normalization (BOE / REGCON / BOIB)
 *  - safety contract: ready_for_payroll / human_review / salary_tables
 *  - stable internal_code generation when agreementCode is missing
 *  - no invented CNAE / no invented effective dates
 *  - dedupe by agreement_code and by source+name+jurisdiction
 *  - upsert plan separation and protection of sensitive flags
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  buildAgreementMetadataImportRun,
  planRegistryUpsert,
} from '@/engines/erp/hr/collectiveAgreementsImporter';
import {
  normalizeAgreementMetadata,
  normalizeBoeAgreementMetadata,
  normalizeBoibAgreementMetadata,
  normalizeRegconAgreementMetadata,
} from '@/engines/erp/hr/collectiveAgreementsSourceNormalizers';
import type {
  NormalizedAgreementRegistryRecord,
  RawAgreementMetadata,
} from '@/engines/erp/hr/collectiveAgreementsImportTypes';

import { BOE_METADATA_FIXTURE } from './fixtures/collective-agreements/boe-metadata.fixture';
import { REGCON_METADATA_FIXTURE } from './fixtures/collective-agreements/regcon-metadata.fixture';
import { BOIB_METADATA_FIXTURE } from './fixtures/collective-agreements/boib-metadata.fixture';

function expectSafetyContract(rec: NormalizedAgreementRegistryRecord) {
  expect(rec.ready_for_payroll).toBe(false);
  expect(rec.salary_tables_loaded).toBe(false);
  expect(rec.requires_human_review).toBe(true);
  expect(rec.official_submission_blocked).toBe(true);
  expect(rec.data_completeness).toBe('metadata_only');
  expect(rec.status).toBe('pendiente_validacion');
}

describe('B5A — module purity', () => {
  it('importer module does not import supabase/react/fetch', () => {
    const files = [
      'src/engines/erp/hr/collectiveAgreementsImporter.ts',
      'src/engines/erp/hr/collectiveAgreementsSourceNormalizers.ts',
      'src/engines/erp/hr/collectiveAgreementsImportTypes.ts',
    ];
    for (const rel of files) {
      const full = path.join(process.cwd(), rel);
      const src = fs.readFileSync(full, 'utf8');
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
      expect(src).not.toMatch(/from\s+['"]react/);
      expect(src).not.toMatch(/\bfetch\s*\(/);
    }
  });
});

describe('B5A — BOE normalization', () => {
  it('normalizes BOE metadata as official + metadata_only', () => {
    const rec = normalizeBoeAgreementMetadata(BOE_METADATA_FIXTURE[0]);
    expect(rec.publication_source).toBe('BOE');
    expect(rec.source_quality).toBe('official');
    expectSafetyContract(rec);
  });

  it('builds a stable internal_code when agreementCode is missing', () => {
    const rec = normalizeBoeAgreementMetadata(BOE_METADATA_FIXTURE[1]);
    expect(rec.agreement_code).toBeNull();
    expect(rec.internal_code).toMatch(/^BOE::convenio-colectivo-estatal/);
    expect(rec.internal_code).toContain('::es');
  });

  it('does not invent CNAE if missing', () => {
    const rec = normalizeBoeAgreementMetadata(BOE_METADATA_FIXTURE[1]);
    expect(rec.cnae_codes).toEqual([]);
  });

  it('does not invent effective dates if missing', () => {
    const rec = normalizeBoeAgreementMetadata(BOE_METADATA_FIXTURE[1]);
    expect(rec.effective_start_date).toBeNull();
    expect(rec.effective_end_date).toBeNull();
  });
});

describe('B5A — REGCON normalization', () => {
  it('normalizes REGCON metadata with URL as official', () => {
    const rec = normalizeRegconAgreementMetadata(REGCON_METADATA_FIXTURE[0]);
    expect(rec.publication_source).toBe('REGCON');
    expect(rec.source_quality).toBe('official');
    expectSafetyContract(rec);
  });

  it('falls back to pending_official_validation when no URL is provided', () => {
    const rec = normalizeRegconAgreementMetadata(REGCON_METADATA_FIXTURE[1]);
    expect(rec.source_quality).toBe('pending_official_validation');
    expectSafetyContract(rec);
  });
});

describe('B5A — BOIB Baleares normalization', () => {
  it('normalizes COM-GEN-IB and PAN-PAST-IB as Baleares metadata only', () => {
    const recs = BOIB_METADATA_FIXTURE.map(normalizeBoibAgreementMetadata);
    const codes = recs.map((r) => r.agreement_code);
    expect(codes).toContain('COM-GEN-IB');
    expect(codes).toContain('PAN-PAST-IB');
    for (const r of recs) {
      expect(r.publication_source).toBe('BOIB');
      expect(r.autonomous_region).toBe('IB');
      expectSafetyContract(r);
    }
  });

  it('classifies HOST-IB without URL as pending_official_validation', () => {
    const host = BOIB_METADATA_FIXTURE.find((r) => r.agreementCode === 'HOST-IB')!;
    const rec = normalizeBoibAgreementMetadata(host);
    expect(rec.source_quality).toBe('pending_official_validation');
  });
});

describe('B5A — generic dispatcher', () => {
  it('dispatches by source channel', () => {
    const inputs: RawAgreementMetadata[] = [
      BOE_METADATA_FIXTURE[0],
      REGCON_METADATA_FIXTURE[0],
      BOIB_METADATA_FIXTURE[0],
    ];
    const outs = inputs.map(normalizeAgreementMetadata);
    expect(outs[0].publication_source).toBe('BOE');
    expect(outs[1].publication_source).toBe('REGCON');
    expect(outs[2].publication_source).toBe('BOIB');
    outs.forEach(expectSafetyContract);
  });
});

describe('B5A — buildAgreementMetadataImportRun', () => {
  it('deduplicates by agreement_code (BOE fixture has one duplicate)', () => {
    const result = buildAgreementMetadataImportRun({
      source: 'BOE',
      items: BOE_METADATA_FIXTURE,
    });
    expect(result.totalFound).toBe(BOE_METADATA_FIXTURE.length);
    // 3 in fixture, 1 duplicate by code → 2 normalized.
    expect(result.normalized).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([]);
    result.records.forEach(expectSafetyContract);
  });

  it('deduplicates by source+name+jurisdiction when no agreement_code', () => {
    const items: RawAgreementMetadata[] = [
      {
        source: 'BOE',
        officialName: 'Convenio sin código',
        jurisdictionCode: 'ES',
      },
      {
        source: 'BOE',
        officialName: 'Convenio sin código',
        jurisdictionCode: 'ES',
        publicationUrl: 'https://example.org/x',
      },
    ];
    const result = buildAgreementMetadataImportRun({ source: 'BOE', items });
    expect(result.normalized).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('reports errors for invalid items without throwing', () => {
    const items = [
      // missing officialName
      { source: 'BOE', sourceId: 'X' } as unknown as RawAgreementMetadata,
      // valid
      {
        source: 'BOE',
        agreementCode: 'OK-1',
        officialName: 'Valid one',
        jurisdictionCode: 'ES',
      },
    ];
    const result = buildAgreementMetadataImportRun({ source: 'BOE', items });
    expect(result.normalized).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toBe('missing_official_name');
  });

  it('never produces a payroll-ready record across the full BOIB fixture', () => {
    const result = buildAgreementMetadataImportRun({
      source: 'BOIB',
      items: BOIB_METADATA_FIXTURE,
    });
    for (const rec of result.records) {
      expectSafetyContract(rec);
    }
  });
});

describe('B5A — planRegistryUpsert', () => {
  it('separates insert vs update vs skipped', () => {
    const importRun = buildAgreementMetadataImportRun({
      source: 'BOIB',
      items: BOIB_METADATA_FIXTURE,
    });
    const plan = planRegistryUpsert({
      existingInternalCodes: ['COM-GEN-IB'],
      records: [...importRun.records, ...importRun.records], // induce dup
    });
    expect(plan.toUpdate.find((r) => r.internal_code === 'COM-GEN-IB')).toBeTruthy();
    expect(
      plan.toInsert.find((r) => r.internal_code === 'PAN-PAST-IB')
    ).toBeTruthy();
    expect(plan.skipped.length).toBeGreaterThan(0);
  });

  it('forces sensitive flags to safe values on update payloads', () => {
    const tampered: NormalizedAgreementRegistryRecord = {
      internal_code: 'COM-GEN-IB',
      agreement_code: 'COM-GEN-IB',
      official_name: 'tampered',
      scope_type: 'autonomous',
      jurisdiction_code: 'IB',
      cnae_codes: [],
      // attacker tries to elevate
      status: 'pendiente_validacion',
      source_quality: 'official',
      data_completeness: 'metadata_only',
      salary_tables_loaded: false,
      ready_for_payroll: false,
      requires_human_review: true,
      official_submission_blocked: true,
    };
    // Even if a future bug flips these to true before calling the
    // planner, the planner must still emit them as safe values.
    const evil = {
      ...tampered,
      ready_for_payroll: true as unknown as false,
      salary_tables_loaded: true as unknown as false,
      requires_human_review: false as unknown as true,
      official_submission_blocked: false as unknown as true,
      data_completeness: 'human_validated' as unknown as 'metadata_only',
    };
    const plan = planRegistryUpsert({
      existingInternalCodes: ['COM-GEN-IB'],
      records: [evil],
    });
    expect(plan.toUpdate).toHaveLength(1);
    const out = plan.toUpdate[0];
    expect(out.ready_for_payroll).toBe(false);
    expect(out.salary_tables_loaded).toBe(false);
    expect(out.requires_human_review).toBe(true);
    expect(out.official_submission_blocked).toBe(true);
    expect(out.data_completeness).toBe('metadata_only');
    expect(out.status).toBe('pendiente_validacion');
  });
});
