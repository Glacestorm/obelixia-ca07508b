/**
 * B4.b — agreementSalaryResolver + agreementSafetyGate (cableado defensivo).
 *
 * Verifica que:
 *   - Llamadas sin safetyContext mantienen 100% el comportamiento actual.
 *   - origin='operative' no introduce warnings ni bloqueos.
 *   - origin='registry' metadata_only bloquea cálculo automático.
 *   - origin='registry' validado calcula normalmente con trazabilidad.
 *   - origin='legacy_ts_fallback' degrada a salario manual sin conceptos auto.
 *   - origin='unknown' bloquea sin manual salary y permite con manual salary.
 *   - PAN-PAST-IB (metadata_only) queda bloqueado.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveSalaryFromAgreement,
  type AgreementSalaryTable,
} from '@/engines/erp/hr/agreementSalaryResolver';

const fakeTable: AgreementSalaryTable = {
  id: 't1',
  company_id: 'c1',
  agreement_code: 'TEST-AGR',
  agreement_name: 'Test',
  year: 2026,
  professional_group: 'G1',
  professional_group_description: null,
  level: 'N1',
  base_salary_monthly: 1500,
  base_salary_annual: null,
  plus_convenio_monthly: 200,
  extra_pay_amount: null,
  total_annual_compensation: null,
  is_active: true,
  effective_date: '2026-01-01',
  expiration_date: null,
  source_reference: null,
  metadata: {},
};

const metadataOnlyAgreement = {
  agreement_code: 'PAN-PAST-IB',
  ready_for_payroll: false,
  salary_tables_loaded: false,
  requires_human_review: true,
  source_quality: 'metadata_only',
  data_completeness: 'metadata_only',
  status: 'vigente',
};

const validatedRegistryAgreement = {
  agreement_code: 'VAL-AGR',
  ready_for_payroll: true,
  salary_tables_loaded: true,
  requires_human_review: false,
  source_quality: 'official',
  data_completeness: 'human_validated',
  status: 'vigente',
};

describe('B4.b — resolver sin safetyContext (retro-compatibilidad)', () => {
  it('mantiene comportamiento previo cuando NO se pasa safetyContext', () => {
    const r = resolveSalaryFromAgreement(2000, fakeTable, 'TEST-AGR', 'G1', 2026);
    expect(r.salarioBaseConvenio).toBe(1500);
    expect(r.plusConvenioTabla).toBe(200);
    expect(r.mejoraVoluntaria).toBe(300);
    expect(r.safeMode).toBe(false);
    expect(r.agreementResolutionStatus).toBe('computed');
    expect(r.agreementSafety).toBeUndefined();
    expect(r.trace.agreement_safety_block).toBeUndefined();
    expect(r.trace.agreement_safety_warnings).toBeUndefined();
  });

  it('sin tabla y sin safetyContext devuelve no_agreement clásico', () => {
    const r = resolveSalaryFromAgreement(1800, null, 'X', 'G1', 2026);
    expect(r.salarioBaseConvenio).toBe(1800);
    expect(r.agreementResolutionStatus).toBe('no_agreement');
    expect(r.agreementSafety).toBeUndefined();
  });
});

describe("B4.b — origin='operative'", () => {
  it('no introduce warnings ni bloqueos y calcula como antes', () => {
    const r = resolveSalaryFromAgreement(
      2000, fakeTable, 'TEST-AGR', 'G1', 2026, undefined,
      { agreementOrigin: 'operative', agreementRecord: { foo: 'bar' } },
    );
    expect(r.safeMode).toBe(false);
    expect(r.salarioBaseConvenio).toBe(1500);
    expect(r.mejoraVoluntaria).toBe(300);
    expect(r.agreementResolutionStatus).toBe('computed');
    expect(r.agreementSafety?.allowed).toBe(true);
    expect(r.agreementSafety?.warnings).toEqual([]);
    expect(r.trace.agreement_safety_block).toBeUndefined();
    expect(r.trace.agreement_origin).toBe('operative');
    expect(r.trace.agreement_safety_allowed).toBe(true);
  });
});

describe("B4.b — origin='registry' metadata_only", () => {
  it('NO lanza excepción y devuelve safe mode con bloqueo', () => {
    const r = resolveSalaryFromAgreement(
      2000, fakeTable, 'PAN-PAST-IB', 'G1', 2026, undefined,
      {
        agreementOrigin: 'registry',
        agreementRecord: metadataOnlyAgreement,
        hasManualSalary: true,
      },
    );
    expect(r.safeMode).toBe(true);
    expect(r.salarioBaseConvenio).toBe(0);
    expect(r.plusConvenioTabla).toBe(0);
    expect(r.mejoraVoluntaria).toBe(0);
    expect(r.agreementResolutionStatus).toBe('manual_review_required');
    expect(r.agreementSafety?.allowed).toBe(false);
    expect(r.trace.agreement_safety_block).toBe('AGREEMENT_NOT_READY_FOR_PAYROLL');
    expect(r.trace.agreement_safety_missing).toContain('ready_for_payroll');
    expect(r.trace.agreement_origin).toBe('registry');
  });

  it("PAN-PAST-IB metadata_only bloquea base salary y plus convenio", () => {
    const r = resolveSalaryFromAgreement(
      2500, fakeTable, 'PAN-PAST-IB', 'PAST-IB-1', 2026, undefined,
      {
        agreementOrigin: 'registry',
        agreementRecord: metadataOnlyAgreement,
        hasManualSalary: false,
      },
    );
    expect(r.agreementSafety?.canComputeBaseSalary).toBe(false);
    expect(r.agreementSafety?.canComputePlusConvenio).toBe(false);
    expect(r.salarioBaseConvenio).toBe(0);
    expect(r.plusConvenioTabla).toBe(0);
  });
});

describe("B4.b — origin='registry' validado", () => {
  it('calcula normalmente y registra trazabilidad allowed', () => {
    const r = resolveSalaryFromAgreement(
      2000, fakeTable, 'VAL-AGR', 'G1', 2026, undefined,
      {
        agreementOrigin: 'registry',
        agreementRecord: validatedRegistryAgreement,
      },
    );
    expect(r.safeMode).toBe(false);
    expect(r.salarioBaseConvenio).toBe(1500);
    expect(r.mejoraVoluntaria).toBe(300);
    expect(r.agreementResolutionStatus).toBe('computed');
    expect(r.agreementSafety?.allowed).toBe(true);
    expect(r.trace.agreement_safety_allowed).toBe(true);
    expect(r.trace.agreement_origin).toBe('registry');
  });
});

describe("B4.b — origin='legacy_ts_fallback'", () => {
  it('con salario manual permite el flujo y emite warning de revisión', () => {
    const r = resolveSalaryFromAgreement(
      1800, fakeTable, 'LEGACY-AGR', 'G1', 2026, undefined,
      {
        agreementOrigin: 'legacy_ts_fallback',
        agreementRecord: { code: 'LEGACY-AGR' },
        hasManualSalary: true,
      },
    );
    expect(r.agreementSafety?.warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
    expect(r.agreementSafety?.canComputePlusConvenio).toBe(false);
    // Salario base manual permitido vía path manual; plus auto no calculado.
    expect(r.plusConvenioTabla).toBe(0);
    expect(r.salarioBaseConvenio).toBe(1800);
    expect(r.trace.agreement_safety_warnings).toContain('LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW');
  });
});

describe("B4.b — origin='unknown'", () => {
  it('sin salario manual → safe mode', () => {
    const r = resolveSalaryFromAgreement(
      0, null, '', '', 2026, undefined,
      { agreementOrigin: 'unknown', hasManualSalary: false },
    );
    expect(r.safeMode).toBe(true);
    expect(r.agreementResolutionStatus).toBe('manual_review_required');
    expect(r.agreementSafety?.missing).toEqual(
      expect.arrayContaining(['agreement', 'manual_salary']),
    );
  });

  it('con salario manual → permitido con warning MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT', () => {
    const r = resolveSalaryFromAgreement(
      1700, null, '', '', 2026, undefined,
      { agreementOrigin: 'unknown', hasManualSalary: true },
    );
    expect(r.safeMode).toBe(false);
    expect(r.salarioBaseConvenio).toBe(1700);
    expect(r.agreementSafety?.warnings).toContain('MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT');
    expect(r.trace.agreement_safety_warnings).toContain('MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT');
  });
});
