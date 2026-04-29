/**
 * B8B — Activation readiness engine (pure) tests.
 */
import { describe, it, expect } from 'vitest';
import {
  computeActivationReadiness,
  type ComputeReadinessInput,
} from '@/engines/erp/hr/collectiveAgreementActivationReadiness';

const HASH = 'a'.repeat(64);

function baseInput(overrides: Partial<ComputeReadinessInput> = {}): ComputeReadinessInput {
  return {
    agreement: {
      id: 'ag-1',
      status: 'vigente',
      source_quality: 'official',
      data_completeness: 'parsed_full',
      salary_tables_loaded: true,
    },
    version: { id: 'v-1', agreement_id: 'ag-1', is_current: true, source_hash: HASH },
    validation: {
      id: 'val-1',
      agreement_id: 'ag-1',
      version_id: 'v-1',
      validation_status: 'approved_internal',
      is_current: true,
      validation_scope: ['metadata', 'salary_tables', 'rules'],
      sha256_hash: HASH,
    },
    source: { id: 's-1', agreement_id: 'ag-1', document_hash: HASH, source_quality: 'official' },
    salaryTablesCount: 3,
    rulesCount: 2,
    unresolvedCriticalWarningsCount: 0,
    discardedCriticalRowsUnresolvedCount: 0,
    ...overrides,
  };
}

describe('B8B — computeActivationReadiness', () => {
  it('passes when all checks are green', () => {
    const r = computeActivationReadiness(baseInput());
    expect(r.passed).toBe(true);
    expect(r.blocking_failures).toEqual([]);
    expect(r.schema_version).toBe('b8b-v1');
  });

  it('fails when validation is not approved_internal', () => {
    const r = computeActivationReadiness(
      baseInput({
        validation: { ...baseInput().validation, validation_status: 'pending_review' },
      }),
    );
    expect(r.passed).toBe(false);
    expect(r.blocking_failures).toContain('validation_approved_internal');
  });

  it('fails when validation is not current', () => {
    const r = computeActivationReadiness(
      baseInput({ validation: { ...baseInput().validation, is_current: false } }),
    );
    expect(r.blocking_failures).toContain('validation_is_current');
  });

  it('fails when scope misses salary_tables', () => {
    const r = computeActivationReadiness(
      baseInput({
        validation: { ...baseInput().validation, validation_scope: ['metadata', 'rules'] },
      }),
    );
    expect(r.blocking_failures).toContain('validation_scope_salary_tables');
  });

  it('fails when scope misses rules', () => {
    const r = computeActivationReadiness(
      baseInput({
        validation: {
          ...baseInput().validation,
          validation_scope: ['metadata', 'salary_tables'],
        },
      }),
    );
    expect(r.blocking_failures).toContain('validation_scope_rules');
  });

  it('fails when version is not current', () => {
    const r = computeActivationReadiness(
      baseInput({ version: { ...baseInput().version, is_current: false } }),
    );
    expect(r.blocking_failures).toContain('version_is_current');
  });

  it('fails on SHA mismatch', () => {
    const r = computeActivationReadiness(
      baseInput({ source: { ...baseInput().source, document_hash: 'b'.repeat(64) } }),
    );
    expect(r.blocking_failures).toContain('sha256_alignment');
  });

  it('fails when source_quality is not official', () => {
    const r = computeActivationReadiness(
      baseInput({ source: { ...baseInput().source, source_quality: 'public_secondary' } }),
    );
    expect(r.blocking_failures).toContain('source_quality_official');
  });

  it('fails when salary_tables_loaded is false', () => {
    const r = computeActivationReadiness(
      baseInput({ agreement: { ...baseInput().agreement, salary_tables_loaded: false } }),
    );
    expect(r.blocking_failures).toContain('agreement_salary_tables_loaded');
  });

  it('fails when data_completeness is metadata_only', () => {
    const r = computeActivationReadiness(
      baseInput({ agreement: { ...baseInput().agreement, data_completeness: 'metadata_only' } }),
    );
    expect(r.blocking_failures).toContain('agreement_data_completeness_min');
  });

  it('fails when status is vencido', () => {
    const r = computeActivationReadiness(
      baseInput({ agreement: { ...baseInput().agreement, status: 'vencido' } }),
    );
    expect(r.blocking_failures).toContain('agreement_status_vigente_or_ultra');
  });

  it('fails with critical warnings', () => {
    const r = computeActivationReadiness(baseInput({ unresolvedCriticalWarningsCount: 2 }));
    expect(r.blocking_failures).toContain('no_unresolved_critical_warnings');
  });

  it('fails with critical discarded rows unresolved', () => {
    const r = computeActivationReadiness(baseInput({ discardedCriticalRowsUnresolvedCount: 1 }));
    expect(r.blocking_failures).toContain('no_unresolved_discarded_critical_rows');
  });

  it('fails with salaryTablesCount=0', () => {
    const r = computeActivationReadiness(baseInput({ salaryTablesCount: 0 }));
    expect(r.blocking_failures).toContain('salary_tables_count_gt_zero');
  });

  it('fails with rulesCount=0', () => {
    const r = computeActivationReadiness(baseInput({ rulesCount: 0 }));
    expect(r.blocking_failures).toContain('rules_count_gt_zero');
  });

  it('checks no_payroll_use_acknowledged when checklist provided', () => {
    const r = computeActivationReadiness(
      baseInput({
        validation: {
          ...baseInput().validation,
          checklist: [{ key: 'no_payroll_use_acknowledged', status: 'pending' }],
        },
      }),
    );
    expect(r.blocking_failures).toContain('checklist_no_payroll_use_ack');
  });
});