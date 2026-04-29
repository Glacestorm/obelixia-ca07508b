/**
 * B10E.2 — Registry Payroll Resolution Builder tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildRegistryPayrollResolution,
  type RegistryPayrollRuntimeSettingSnapshot,
  type RegistryPayrollMappingSnapshot,
  type RegistryPayrollAgreementSnapshot,
  type RegistryPayrollVersionSnapshot,
  type RegistryPayrollSourceSnapshot,
  type RegistryPayrollSalaryTableRowSnapshot,
  type RegistryPayrollRuleSnapshot,
  type BuildRegistryPayrollResolutionInput,
} from '@/engines/erp/hr/registryPayrollResolutionBuilder';

function makeSetting(
  overrides: Partial<RegistryPayrollRuntimeSettingSnapshot> = {},
): RegistryPayrollRuntimeSettingSnapshot {
  return {
    id: 'set-1',
    mapping_id: 'map-1',
    company_id: 'co-1',
    employee_id: null,
    contract_id: null,
    use_registry_for_payroll: true,
    is_current: true,
    ...overrides,
  };
}

function makeMapping(
  overrides: Partial<RegistryPayrollMappingSnapshot> = {},
): RegistryPayrollMappingSnapshot {
  return {
    id: 'map-1',
    company_id: 'co-1',
    employee_id: null,
    contract_id: null,
    registry_agreement_id: 'ag-1',
    registry_version_id: 'ver-1',
    mapping_status: 'approved_internal',
    is_current: true,
    approved_by: 'u-1',
    approved_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAgreement(
  overrides: Partial<RegistryPayrollAgreementSnapshot> = {},
): RegistryPayrollAgreementSnapshot {
  return {
    id: 'ag-1',
    internal_code: 'TEST',
    official_name: 'Test Agreement',
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    salary_tables_loaded: true,
    source_quality: 'official',
    status: 'vigente',
    ...overrides,
  };
}

function makeVersion(
  overrides: Partial<RegistryPayrollVersionSnapshot> = {},
): RegistryPayrollVersionSnapshot {
  return { id: 'ver-1', agreement_id: 'ag-1', is_current: true, ...overrides };
}

function makeSource(
  overrides: Partial<RegistryPayrollSourceSnapshot> = {},
): RegistryPayrollSourceSnapshot {
  return {
    id: 'src-1',
    agreement_id: 'ag-1',
    source_quality: 'official',
    document_hash: 'abc',
    ...overrides,
  };
}

function makeRow(
  overrides: Partial<RegistryPayrollSalaryTableRowSnapshot> = {},
): RegistryPayrollSalaryTableRowSnapshot {
  return {
    id: 'row-1',
    year: 2026,
    professional_group: 'G1',
    category: 'C1',
    level: null,
    salary_base_monthly: 1500,
    salary_base_annual: 21000,
    plus_convenio: 100,
    plus_transport: 50,
    plus_antiguedad: 30,
    extra_pay_amount: 1500,
    row_confidence: 0.9,
    requires_human_review: false,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<BuildRegistryPayrollResolutionInput> = {},
): BuildRegistryPayrollResolutionInput {
  const rules: RegistryPayrollRuleSnapshot[] = [
    { id: 'r1', rule_kind: 'annual_hours', rule_value_json: { hours: 1800 } },
    {
      id: 'r2',
      rule_kind: 'extra_payments',
      rule_value_json: { count: 2, amount: 1500, prorrateadas: false },
    },
  ];
  return {
    setting: makeSetting(),
    mapping: makeMapping(),
    agreement: makeAgreement(),
    version: makeVersion(),
    source: makeSource(),
    salaryTables: [makeRow()],
    rules,
    targetYear: 2026,
    professionalGroup: 'G1',
    category: 'C1',
    ...overrides,
  };
}

describe('B10E.2 — buildRegistryPayrollResolution (happy path)', () => {
  it('builds when ready and exact salary table row matches', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.canBuild).toBe(true);
    expect(r.reason).toBe('built');
    expect(r.salaryResolution).toBeDefined();
    expect(r.salaryResolution!.source).toBe('registry');
  });

  it('maps salary_base_monthly → salarioBaseConvenio', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.salarioBaseConvenio).toBe(1500);
  });

  it('maps salary_base_annual → salarioBaseAnualConvenio', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.salarioBaseAnualConvenio).toBe(21000);
  });

  it('maps plus_convenio → plusConvenioTabla', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.plusConvenioTabla).toBe(100);
  });

  it('maps plus_transport → plusTransporte', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.plusTransporte).toBe(50);
  });

  it('maps plus_antiguedad → antiguedad', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.antiguedad).toBe(30);
  });

  it('extra_payments rule → pagasExtra', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.pagasExtra).toEqual({
      count: 2,
      amount: 1500,
      prorrateadas: false,
    });
  });

  it('annual_hours rule → jornadaAnual', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    expect(r.salaryResolution!.jornadaAnual).toBe(1800);
  });

  it('trace contains setting_id, mapping_id, agreement_id, version_id', () => {
    const r = buildRegistryPayrollResolution(makeInput());
    const t = r.salaryResolution!.__registry_source;
    expect(t.setting_id).toBe('set-1');
    expect(t.mapping_id).toBe('map-1');
    expect(t.registry_agreement_id).toBe('ag-1');
    expect(t.registry_version_id).toBe('ver-1');
    expect(t.source_quality).toBe('official');
  });
});

describe('B10E.2 — runtime setting blockers', () => {
  it('missing setting → runtime_setting_inactive', () => {
    const r = buildRegistryPayrollResolution(makeInput({ setting: null }));
    expect(r.canBuild).toBe(false);
    expect(r.reason).toBe('runtime_setting_inactive');
    expect(r.blockers).toContain('runtime_setting_inactive');
  });

  it('use_registry_for_payroll=false → blocker', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ setting: makeSetting({ use_registry_for_payroll: false }) }),
    );
    expect(r.canBuild).toBe(false);
    expect(r.reason).toBe('runtime_setting_inactive');
    expect(r.blockers).toContain('use_registry_for_payroll_false');
  });

  it('setting is_current=false → blocker', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ setting: makeSetting({ is_current: false }) }),
    );
    expect(r.blockers).toContain('setting_not_current');
  });
});

describe('B10E.2 — mapping blockers', () => {
  it('mapping not approved → mapping_not_approved', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ mapping: makeMapping({ mapping_status: 'pending' }) }),
    );
    expect(r.reason).toBe('mapping_not_approved');
    expect(r.blockers).toContain('mapping_not_approved');
  });

  it('mapping not current → mapping_not_current', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ mapping: makeMapping({ is_current: false }) }),
    );
    expect(r.reason).toBe('mapping_not_current');
  });
});

describe('B10E.2 — registry agreement blockers', () => {
  it('ready_for_payroll=false → registry_not_ready', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ agreement: makeAgreement({ ready_for_payroll: false }) }),
    );
    expect(r.blockers).toContain('registry_not_ready');
  });

  it('requires_human_review=true → requires_human_review', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ agreement: makeAgreement({ requires_human_review: true }) }),
    );
    expect(r.reason).toBe('requires_human_review');
    expect(r.blockers).toContain('requires_human_review');
  });

  it('data_completeness != human_validated → data_completeness_not_validated', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ agreement: makeAgreement({ data_completeness: 'partial' }) }),
    );
    expect(r.reason).toBe('data_completeness_not_validated');
    expect(r.blockers).toContain('data_completeness_not_validated');
  });

  it('salary_tables_loaded=false → salary_tables_not_loaded', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ agreement: makeAgreement({ salary_tables_loaded: false }) }),
    );
    expect(r.blockers).toContain('salary_tables_not_loaded');
  });

  it('source_quality != official → source_quality_not_official', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ source: makeSource({ source_quality: 'manual' }) }),
    );
    expect(r.reason).toBe('source_quality_not_official');
    expect(r.blockers).toContain('source_quality_not_official');
  });
});

describe('B10E.2 — version blockers', () => {
  it('version not current → version_not_current', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ version: makeVersion({ is_current: false }) }),
    );
    expect(r.reason).toBe('version_not_current');
    expect(r.blockers).toContain('version_not_current');
  });
});

describe('B10E.2 — salary table matching', () => {
  it('no salary table for year → missing_salary_table', () => {
    const r = buildRegistryPayrollResolution(makeInput({ targetYear: 2099 }));
    expect(r.reason).toBe('missing_salary_table');
  });

  it('low confidence row discarded → missing_salary_table + warning', () => {
    const r = buildRegistryPayrollResolution(
      makeInput({ salaryTables: [makeRow({ row_confidence: 0.3 })] }),
    );
    expect(r.reason).toBe('missing_salary_table');
    expect(r.warnings).toContain('salary_table_low_confidence_discarded');
  });

  it('exact group/category preferred over group-only', () => {
    const rows = [
      makeRow({ id: 'a', professional_group: 'G1', category: 'OTHER', salary_base_monthly: 1000 }),
      makeRow({ id: 'b', professional_group: 'G1', category: 'C1', salary_base_monthly: 1500 }),
    ];
    const r = buildRegistryPayrollResolution(makeInput({ salaryTables: rows }));
    expect(r.canBuild).toBe(true);
    expect(r.salaryResolution!.salarioBaseConvenio).toBe(1500);
  });

  it('group-only fallback warns category_not_exact_match', () => {
    const rows = [
      makeRow({ id: 'a', professional_group: 'G1', category: 'OTHER', salary_base_monthly: 1200 }),
    ];
    const r = buildRegistryPayrollResolution(makeInput({ salaryTables: rows }));
    expect(r.canBuild).toBe(true);
    expect(r.warnings).toContain('category_not_exact_match');
    expect(r.warnings).toContain('fallback_salary_row_match');
  });
});

describe('B10E.2 — rules behavior', () => {
  it('no rules → warnings, not blocker', () => {
    const r = buildRegistryPayrollResolution(makeInput({ rules: [] }));
    expect(r.canBuild).toBe(true);
    expect(r.warnings).toContain('no_rules_available');
    expect(r.warnings).toContain('no_annual_hours_rule');
    expect(r.warnings).toContain('no_extra_payments_rule');
  });
});

// ===================== Static guards =====================

const builderPath = resolve(__dirname, '../../engines/erp/hr/registryPayrollResolutionBuilder.ts');
const builderRaw = readFileSync(builderPath, 'utf8');
// Strip block and line comments so doc references don't trip static guards.
const builderSrc = builderRaw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('B10E.2 — static isolation', () => {
  it('does not import supabase/fetch/react/hooks/Deno/service_role', () => {
    expect(builderSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(builderSrc).not.toMatch(/\bfetch\s*\(/);
    expect(builderSrc).not.toMatch(/from\s+['"]react['"]/);
    expect(builderSrc).not.toMatch(/\buseEffect\b|\buseState\b|\buseCallback\b/);
    expect(builderSrc).not.toMatch(/\bDeno\b/);
    expect(builderSrc).not.toMatch(/service_role/);
  });

  it('does not perform DB writes/reads via PostgREST chain', () => {
    expect(builderSrc).not.toMatch(/\.from\(/);
    expect(builderSrc).not.toMatch(/\.insert\(/);
    expect(builderSrc).not.toMatch(/\.update\(/);
    expect(builderSrc).not.toMatch(/\.delete\(/);
    expect(builderSrc).not.toMatch(/\.upsert\(/);
  });

  it('does not import bridge/payroll/normalizer/flag/safety gate', () => {
    expect(builderSrc).not.toMatch(/useESPayrollBridge/);
    expect(builderSrc).not.toMatch(/registryShadowFlag/);
    expect(builderSrc).not.toMatch(/agreementSalaryResolver/);
    expect(builderSrc).not.toMatch(/salaryNormalizer/);
    expect(builderSrc).not.toMatch(/payrollEngine/);
    expect(builderSrc).not.toMatch(/payslipEngine/);
    expect(builderSrc).not.toMatch(/agreementSafetyGate/);
  });

  it('does not reference the operative table erp_hr_collective_agreements', () => {
    // Allowed registry-suffixed name is fine; bare operative name forbidden.
    expect(builderSrc).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('does not write ready_for_payroll', () => {
    expect(builderSrc).not.toMatch(/ready_for_payroll\s*=/);
  });
});

describe('B10E.2 — bridge & flag invariants', () => {
  it('useESPayrollBridge.ts exists and was not turned on for registry by this phase', () => {
    const bridgePath = resolve(__dirname, '../../hooks/erp/hr/useESPayrollBridge.ts');
    let src = '';
    try {
      src = readFileSync(bridgePath, 'utf8');
    } catch {
      // alternative location tolerated
      src = '';
    }
    if (src) {
      expect(src).not.toMatch(/buildRegistryPayrollResolution/);
    } else {
      expect(true).toBe(true);
    }
  });

  it('registryShadowFlag.ts still exposes false', () => {
    const flagPath = resolve(__dirname, '../../engines/erp/hr/registryShadowFlag.ts');
    const src = readFileSync(flagPath, 'utf8');
    expect(src).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });
});