import { describe, expect, it, vi } from 'vitest';

import {
  runSourceFetchAndImportDryRun,
  type AgreementSourceHttpAdapter,
} from '@/engines/erp/hr/collectiveAgreementsSourceFetchers';

import { BOE_SEARCH_RESPONSE_FIXTURE } from './fixtures/collective-agreements/boe-search-response.fixture';
import { BOIB_SEARCH_RESPONSE_FIXTURE } from './fixtures/collective-agreements/boib-search-response.fixture';
import { REGCON_MANUAL_PAYLOAD_FIXTURE } from './fixtures/collective-agreements/regcon-search-response.fixture';

function makeAdapter(response: { status: number; body: unknown }): AgreementSourceHttpAdapter {
  return {
    get: vi.fn().mockResolvedValue(response),
  };
}

describe('B5C — runSourceFetchAndImportDryRun (no DB writes)', () => {
  it('BOE dry-run normalizes and plans inserts without writing', async () => {
    const adapter = makeAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: { source: 'BOE' },
      adapter,
      existingInternalCodes: [],
    });

    expect(result.fetch.items.length).toBe(2);
    expect(result.importRun.normalized).toBe(2);
    expect(result.upsertPlan.toInsert.length).toBe(2);
    expect(result.upsertPlan.toUpdate.length).toBe(0);
    expect(result.safetySummary.allReadyForPayrollFalse).toBe(true);
    expect(result.safetySummary.allRequireHumanReview).toBe(true);
    expect(result.safetySummary.allOfficialSubmissionBlocked).toBe(true);
    expect(result.safetySummary.allMetadataOnly).toBe(true);
    expect(result.safetySummary.allBlockedFromPayroll).toBe(true);
  });

  it('BOIB dry-run detects COM-GEN-IB and PAN-PAST-IB seeds', async () => {
    const adapter = makeAdapter(BOIB_SEARCH_RESPONSE_FIXTURE);
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: { source: 'BOIB' },
      adapter,
      existingInternalCodes: [],
    });

    const codes = result.upsertPlan.toInsert.map((r) => r.internal_code);
    expect(codes).toEqual(
      expect.arrayContaining(['COM-GEN-IB', 'PAN-PAST-IB', 'HOST-IB'])
    );
    expect(result.safetySummary.allReadyForPayrollFalse).toBe(true);
    expect(
      result.upsertPlan.toInsert.every((r) => r.autonomous_region === 'IB')
    ).toBe(true);
  });

  it('REGCON manual fixture normalizes without activating payroll', async () => {
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: {
        source: 'REGCON',
        manualPayload: REGCON_MANUAL_PAYLOAD_FIXTURE,
      },
      existingInternalCodes: [],
    });

    expect(result.fetch.sourceAccessMode).toBe('manual_upload');
    expect(result.importRun.normalized).toBe(2);
    expect(result.upsertPlan.toInsert.length).toBe(2);
    expect(
      result.upsertPlan.toInsert.every((r) => r.ready_for_payroll === false)
    ).toBe(true);
    expect(
      result.upsertPlan.toInsert.every((r) => r.salary_tables_loaded === false)
    ).toBe(true);
  });

  it('separates existing vs new in the upsert plan', async () => {
    const adapter = makeAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: { source: 'BOE' },
      adapter,
      // Pretend the calzado agreement already exists.
      existingInternalCodes: ['99000005011981'],
    });

    expect(result.upsertPlan.toUpdate.map((r) => r.internal_code)).toContain(
      '99000005011981'
    );
    expect(
      result.upsertPlan.toInsert.find((r) => r.internal_code === '99000005011981')
    ).toBeUndefined();
    // Updates still carry safe flags.
    expect(
      result.upsertPlan.toUpdate.every((r) => r.ready_for_payroll === false)
    ).toBe(true);
  });

  it('produces fingerprints keyed by agreementCode/sourceId', async () => {
    const adapter = makeAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: { source: 'BOE' },
      adapter,
      existingInternalCodes: [],
    });
    expect(Object.keys(result.fingerprints).length).toBe(2);
    expect(result.fingerprints['99000005011981']?.startsWith('fnv1a32:')).toBe(
      true
    );
  });

  it('does not perform any DB write (adapter has no DB methods)', async () => {
    // The pipeline has no DB adapter parameter at all — type-level proof.
    const adapter = makeAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
    const result = await runSourceFetchAndImportDryRun({
      fetchRequest: { source: 'BOE', dryRun: true },
      adapter,
      existingInternalCodes: [],
    });
    // Only adapter.get should have been called, no other side effect.
    expect((adapter.get as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
  });
});
