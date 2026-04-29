import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluatePilotCandidateReadiness,
  type RegistryPilotCandidateInput,
} from '@/engines/erp/hr/registryPilotCandidatePreflight';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';

const PREFLIGHT_SOURCE = readFileSync(
  resolve(__dirname, '../../engines/erp/hr/registryPilotCandidatePreflight.ts'),
  'utf8',
);
const LOADER_SOURCE = readFileSync(
  resolve(__dirname, '../../engines/erp/hr/registryPilotCandidateDataLoader.ts'),
  'utf8',
);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const PREFLIGHT_CODE = stripComments(PREFLIGHT_SOURCE);
const LOADER_CODE = stripComments(LOADER_SOURCE);

function fullInput(
  overrides: Partial<RegistryPilotCandidateInput> = {},
): RegistryPilotCandidateInput {
  return {
    companyId: 'co-1',
    employeeId: 'emp-1',
    contractId: 'ct-1',
    targetYear: 2026,
    mapping: {
      id: 'map-1',
      mapping_status: 'approved_internal',
      is_current: true,
      registry_agreement_id: 'ag-1',
      registry_version_id: 'ver-1',
    },
    runtimeSetting: {
      id: 'rs-1',
      is_current: true,
      use_registry_for_payroll: true,
      mapping_id: 'map-1',
    },
    registryAgreement: {
      id: 'ag-1',
      ready_for_payroll: true,
      requires_human_review: false,
      data_completeness: 'human_validated',
      source_quality: 'official',
    },
    registryVersion: {
      id: 'ver-1',
      is_current: true,
    },
    salaryTables: [{ id: 'st-1' }],
    rules: [{ id: 'r-1' }],
    comparisonReport: { critical: 0, major: 0, minor: 0 },
    ...overrides,
  };
}

describe('B10F.5B — registry pilot candidate preflight (functional)', () => {
  it('full healthy candidate → status ready, score 100', () => {
    const r = evaluatePilotCandidateReadiness(fullInput());
    expect(r.status).toBe('ready');
    expect(r.readiness_score).toBe(100);
    expect(r.blockers).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.mapping_id).toBe('map-1');
    expect(r.runtime_setting_id).toBe('rs-1');
    expect(r.registry_agreement_id).toBe('ag-1');
    expect(r.registry_version_id).toBe('ver-1');
  });

  it('mapping missing → blocked', () => {
    const r = evaluatePilotCandidateReadiness(fullInput({ mapping: null }));
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('mapping_missing');
  });

  it('mapping not approved_internal → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        mapping: {
          id: 'map-1',
          mapping_status: 'pending',
          is_current: true,
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('mapping_not_approved_internal');
  });

  it('mapping not current → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        mapping: {
          id: 'map-1',
          mapping_status: 'approved_internal',
          is_current: false,
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('mapping_not_current');
  });

  it('runtime setting missing → blocked', () => {
    const r = evaluatePilotCandidateReadiness(fullInput({ runtimeSetting: null }));
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('runtime_setting_missing');
  });

  it('runtime setting not current → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        runtimeSetting: { id: 'rs-1', is_current: false, use_registry_for_payroll: true },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('runtime_setting_not_current');
  });

  it('runtime setting use_registry_for_payroll=false → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        runtimeSetting: { id: 'rs-1', is_current: true, use_registry_for_payroll: false },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('runtime_setting_use_registry_for_payroll_false');
  });

  it('registry not ready → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        registryAgreement: {
          id: 'ag-1',
          ready_for_payroll: false,
          requires_human_review: false,
          data_completeness: 'human_validated',
          source_quality: 'official',
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('registry_not_ready_for_payroll');
  });

  it('requires_human_review=true → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        registryAgreement: {
          id: 'ag-1',
          ready_for_payroll: true,
          requires_human_review: true,
          data_completeness: 'human_validated',
          source_quality: 'official',
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('registry_requires_human_review');
  });

  it('data_completeness != human_validated → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        registryAgreement: {
          id: 'ag-1',
          ready_for_payroll: true,
          requires_human_review: false,
          data_completeness: 'partial',
          source_quality: 'official',
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('registry_data_completeness_not_human_validated');
  });

  it('source_quality != official → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({
        registryAgreement: {
          id: 'ag-1',
          ready_for_payroll: true,
          requires_human_review: false,
          data_completeness: 'human_validated',
          source_quality: 'community',
        },
      }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('registry_source_quality_not_official');
  });

  it('version not current → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({ registryVersion: { id: 'ver-1', is_current: false } }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('registry_version_not_current');
  });

  it('no salary tables → blocked', () => {
    const r = evaluatePilotCandidateReadiness(fullInput({ salaryTables: [] }));
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('salary_tables_empty');
  });

  it('no rules → needs_review (rules empty is a warning, not a blocker)', () => {
    const r = evaluatePilotCandidateReadiness(fullInput({ rules: [] }));
    expect(r.status).toBe('needs_review');
    expect(r.warnings).toContain('rules_empty');
    expect(r.blockers).toEqual([]);
  });

  it('comparison critical > 0 → blocked', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({ comparisonReport: { critical: 2, major: 0 } }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('comparison_report_has_critical_diffs');
  });

  it('comparison missing → needs_review', () => {
    const r = evaluatePilotCandidateReadiness(fullInput({ comparisonReport: null }));
    expect(r.status).toBe('needs_review');
    expect(r.warnings).toContain('comparison_report_missing');
    expect(r.blockers).toEqual([]);
  });

  it('output is deterministic for identical inputs', () => {
    const a = evaluatePilotCandidateReadiness(fullInput());
    const b = evaluatePilotCandidateReadiness(fullInput());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('missing scope ids produce blockers', () => {
    const r = evaluatePilotCandidateReadiness(
      fullInput({ employeeId: null, contractId: null, companyId: '' }),
    );
    expect(r.status).toBe('blocked');
    expect(r.blockers).toContain('missing_company_id');
    expect(r.blockers).toContain('missing_employee_id');
    expect(r.blockers).toContain('missing_contract_id');
  });
});

describe('B10F.5B — registry pilot candidate preflight (static guards)', () => {
  it('preflight: no bridge / payroll / safety / resolver imports', () => {
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'registryRuntimeBridgeDecision',
      'registryPilotBridgeDecision',
    ];
    for (const id of forbidden) {
      expect(PREFLIGHT_CODE).not.toContain(id);
    }
  });

  it('preflight: no DB writes / rpc / supabase / fetch / Deno / env', () => {
    expect(PREFLIGHT_CODE).not.toMatch(/\.insert\s*\(/);
    expect(PREFLIGHT_CODE).not.toMatch(/\.update\s*\(/);
    expect(PREFLIGHT_CODE).not.toMatch(/\.delete\s*\(/);
    expect(PREFLIGHT_CODE).not.toMatch(/\.upsert\s*\(/);
    expect(PREFLIGHT_CODE).not.toMatch(/\.rpc\s*\(/);
    expect(PREFLIGHT_CODE).not.toMatch(/\bfrom\s*\(\s*['"]/);
    expect(PREFLIGHT_CODE).not.toContain('@supabase');
    expect(PREFLIGHT_CODE).not.toContain('integrations/supabase');
    expect(PREFLIGHT_CODE).not.toMatch(/\bfetch\s*\(/);
    expect(PREFLIGHT_CODE).not.toContain('Deno.');
    expect(PREFLIGHT_CODE).not.toContain('process.env');
    expect(PREFLIGHT_CODE).not.toContain('localStorage');
    expect(PREFLIGHT_CODE).not.toContain('sessionStorage');
    expect(PREFLIGHT_CODE).not.toContain('service_role');
    expect(PREFLIGHT_CODE).not.toContain('SERVICE_ROLE');
  });

  it('preflight: does not reference operative table erp_hr_collective_agreements (without _registry suffix)', () => {
    expect(PREFLIGHT_CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('loader: SELECT only — no insert/update/upsert/delete/rpc', () => {
    expect(LOADER_CODE).not.toMatch(/\.insert\s*\(/);
    expect(LOADER_CODE).not.toMatch(/\.update\s*\(/);
    expect(LOADER_CODE).not.toMatch(/\.delete\s*\(/);
    expect(LOADER_CODE).not.toMatch(/\.upsert\s*\(/);
    expect(LOADER_CODE).not.toMatch(/\.rpc\s*\(/);
    expect(LOADER_CODE).not.toContain('functions.invoke');
  });

  it('loader: no service_role, no admin client, no forbidden imports', () => {
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'registryRuntimeBridgeDecision',
      'registryPilotBridgeDecision',
    ];
    for (const id of forbidden) {
      expect(LOADER_CODE).not.toContain(id);
    }
    expect(LOADER_CODE).not.toContain('service_role');
    expect(LOADER_CODE).not.toContain('SERVICE_ROLE');
    expect(LOADER_CODE).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('loader: does not reference operative table erp_hr_collective_agreements (without _registry suffix)', () => {
    expect(LOADER_CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('flags remain off and allow-list remains empty', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});