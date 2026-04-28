/**
 * B4.a — Tests for the pure agreementSafetyGate module.
 *
 * The gate is consumed by future B4.b/B4.c wiring. Here we verify only
 * the pure decision matrix.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateAgreementForPayroll,
  type AgreementSafetyInput,
} from '@/engines/erp/hr/agreementSafetyGate';

function registry(overrides: Record<string, unknown> = {}) {
  return {
    internal_code: 'TEST-CODE',
    ready_for_payroll: false,
    requires_human_review: true,
    salary_tables_loaded: false,
    source_quality: 'pending_official_validation',
    data_completeness: 'metadata_only',
    status: 'pendiente_validacion',
    official_submission_blocked: true,
    ...overrides,
  };
}

function validatedRegistry(overrides: Record<string, unknown> = {}) {
  return registry({
    ready_for_payroll: true,
    requires_human_review: false,
    salary_tables_loaded: true,
    source_quality: 'official',
    data_completeness: 'human_validated',
    status: 'vigente',
    official_submission_blocked: false,
    ...overrides,
  });
}

describe('B4.a — agreementSafetyGate (pure)', () => {
  it('1) registry metadata_only → blocks AGREEMENT_NOT_READY_FOR_PAYROLL', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: registry(),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockReason).toBe('AGREEMENT_NOT_READY_FOR_PAYROLL');
    expect(decision.canComputeBaseSalary).toBe(false);
  });

  it('2) registry fully validated → allowed with all capabilities', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: validatedRegistry(),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings).toEqual([]);
    expect(decision.missing).toEqual([]);
    expect(decision.canComputeBaseSalary).toBe(true);
    expect(decision.canComputePlusConvenio).toBe(true);
    expect(decision.canComputeSeniority).toBe(true);
    expect(decision.canComputeExtraPayments).toBe(true);
    expect(decision.canComputeAnnualHours).toBe(true);
  });

  it('3) registry without salary tables → blocked, missing includes salary_tables_loaded', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: validatedRegistry({ salary_tables_loaded: false, ready_for_payroll: false }),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toContain('salary_tables_loaded');
    expect(decision.canComputeBaseSalary).toBe(false);
  });

  it('4) registry with public_secondary source → blocked, missing official_source', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: validatedRegistry({
        source_quality: 'public_secondary',
        ready_for_payroll: false,
      }),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toContain('official_source');
  });

  it('5) registry with expired status → blocked', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: validatedRegistry({ status: 'vencido', ready_for_payroll: false }),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toContain('status_vigente');
    // status block has lower priority than NOT_READY; either is acceptable
    expect([
      'AGREEMENT_NOT_READY_FOR_PAYROLL',
      'AGREEMENT_STATUS_NOT_VIGENTE',
    ]).toContain(decision.blockReason);
  });

  it('6) legacy_ts_fallback → allowed but capabilities off + warning', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: { code: 'COM-GRANDES' },
      origin: 'legacy_ts_fallback',
      hasManualSalary: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
    expect(decision.canComputeBaseSalary).toBe(false);
    expect(decision.canComputePlusConvenio).toBe(false);
    expect(decision.canComputeSeniority).toBe(false);
    expect(decision.canComputeExtraPayments).toBe(false);
    expect(decision.canComputeAnnualHours).toBe(false);
    expect(decision.missing).toContain('registry_validated_agreement');
  });

  it('7) unknown + manual salary → allowed with warning, capabilities off', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: null,
      origin: 'unknown',
      hasManualSalary: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings).toContain('MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT');
    expect(decision.canComputeBaseSalary).toBe(false);
    expect(decision.missing).toContain('validated_agreement');
  });

  it('8) unknown + no manual salary → blocked', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: null,
      origin: 'unknown',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toContain('agreement');
    expect(decision.missing).toContain('manual_salary');
    expect(decision.canComputeBaseSalary).toBe(false);
  });

  it('9) PAN-PAST-IB simulated as registry metadata_only → blocked, base & plus convenio false', () => {
    const panPastIb = registry({
      internal_code: 'PAN-PAST-IB',
      data_completeness: 'metadata_only',
    });
    const decision = evaluateAgreementForPayroll({
      agreement: panPastIb,
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.canComputeBaseSalary).toBe(false);
    expect(decision.canComputePlusConvenio).toBe(false);
  });

  it('10) operative origin → allowed with all capabilities and no warnings', () => {
    const decision = evaluateAgreementForPayroll({
      agreement: { code: 'OP-XYZ' },
      origin: 'operative',
      hasManualSalary: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings).toEqual([]);
    expect(decision.canComputeBaseSalary).toBe(true);
    expect(decision.canComputePlusConvenio).toBe(true);
    expect(decision.canComputeSeniority).toBe(true);
    expect(decision.canComputeExtraPayments).toBe(true);
    expect(decision.canComputeAnnualHours).toBe(true);
  });

  it('11) module is pure: no Supabase / React / hook imports', () => {
    const file = readFileSync(
      resolve(process.cwd(), 'src/engines/erp/hr/agreementSafetyGate.ts'),
      'utf-8'
    );
    expect(file).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(file).not.toMatch(/from ['"]react['"]/);
    expect(file).not.toMatch(/from ['"]@\/hooks\//);
    expect(file).not.toMatch(/\bfetch\s*\(/);
    expect(file).not.toMatch(/createClient/);
  });

  it('12) registry block priority: NOT_READY beats SALARY_TABLES, REQUIRES_HUMAN_REVIEW, etc.', () => {
    // All flags failing simultaneously
    const decision = evaluateAgreementForPayroll({
      agreement: registry(),
      origin: 'registry',
      hasManualSalary: false,
    });
    expect(decision.blockReason).toBe('AGREEMENT_NOT_READY_FOR_PAYROLL');
    // missing collects all problems
    expect(decision.missing).toEqual(
      expect.arrayContaining([
        'ready_for_payroll',
        'salary_tables_loaded',
        'human_review_completed',
        'official_source',
        'human_validated',
        'status_vigente',
        'official_submission_unblocked',
      ])
    );
  });
});