import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  resolveRegistryRuntimeSetting,
  type RegistryRuntimeSettingSnapshot,
} from '@/engines/erp/hr/registryRuntimeSettingResolver';

const COMPANY = 'company-1';
const OTHER_COMPANY = 'company-2';
const EMP = 'emp-1';
const CTR = 'ctr-1';

function makeSetting(
  overrides: Partial<RegistryRuntimeSettingSnapshot> = {},
): RegistryRuntimeSettingSnapshot {
  return {
    id: overrides.id ?? 'setting-x',
    mapping_id: overrides.mapping_id ?? 'map-x',
    company_id: overrides.company_id ?? COMPANY,
    employee_id: overrides.employee_id ?? null,
    contract_id: overrides.contract_id ?? null,
    use_registry_for_payroll: overrides.use_registry_for_payroll ?? true,
    is_current: overrides.is_current ?? true,
    activation_run_id: overrides.activation_run_id ?? 'run-1',
    rollback_run_id: overrides.rollback_run_id ?? null,
  };
}

describe('B10E.1 — registryRuntimeSettingResolver — priority', () => {
  it('company+employee+contract wins over all other scopes', () => {
    const settings: RegistryRuntimeSettingSnapshot[] = [
      makeSetting({ id: 's-cec', employee_id: EMP, contract_id: CTR }),
      makeSetting({ id: 's-cc', contract_id: CTR }),
      makeSetting({ id: 's-ce', employee_id: EMP }),
      makeSetting({ id: 's-c' }),
    ];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: CTR, settings });
    expect(r.scopeMatched).toBe('company_employee_contract');
    expect(r.setting?.id).toBe('s-cec');
    expect(r.reason).toBe('matched');
    expect(r.blockers).toEqual([]);
  });

  it('company+contract wins over company+employee and company-only when no exact employee+contract', () => {
    const settings = [
      makeSetting({ id: 's-cc', contract_id: CTR }),
      makeSetting({ id: 's-ce', employee_id: EMP }),
      makeSetting({ id: 's-c' }),
    ];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: CTR, settings });
    expect(r.scopeMatched).toBe('company_contract');
    expect(r.setting?.id).toBe('s-cc');
  });

  it('company+employee wins over company-only', () => {
    const settings = [
      makeSetting({ id: 's-ce', employee_id: EMP }),
      makeSetting({ id: 's-c' }),
    ];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: null, settings });
    expect(r.scopeMatched).toBe('company_employee');
    expect(r.setting?.id).toBe('s-ce');
  });

  it('company-only fallback when no specific scope matches', () => {
    const settings = [makeSetting({ id: 's-c' })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: CTR, settings });
    expect(r.scopeMatched).toBe('company');
    expect(r.setting?.id).toBe('s-c');
    expect(r.reason).toBe('matched');
  });
});

describe('B10E.1 — registryRuntimeSettingResolver — absence and isolation', () => {
  it('empty settings → no_runtime_setting', () => {
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: CTR, settings: [] });
    expect(r.setting).toBeNull();
    expect(r.scopeMatched).toBe('none');
    expect(r.reason).toBe('no_runtime_setting');
    expect(r.blockers).toEqual(['no_runtime_setting']);
  });

  it('settings of another company are ignored', () => {
    const settings = [makeSetting({ id: 's-other', company_id: OTHER_COMPANY })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: EMP, contractId: CTR, settings });
    expect(r.setting).toBeNull();
    expect(r.reason).toBe('no_runtime_setting');
  });

  it('employeeId undefined does not match employee-specific settings', () => {
    const settings = [makeSetting({ id: 's-ce', employee_id: EMP })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: undefined, contractId: undefined, settings });
    expect(r.setting).toBeNull();
    expect(r.scopeMatched).toBe('none');
  });

  it('contractId undefined does not match contract-specific settings', () => {
    const settings = [makeSetting({ id: 's-cc', contract_id: CTR })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, employeeId: undefined, contractId: undefined, settings });
    expect(r.setting).toBeNull();
    expect(r.scopeMatched).toBe('none');
  });
});

describe('B10E.1 — registryRuntimeSettingResolver — blockers', () => {
  it('is_current=false → blocker setting_not_current', () => {
    const settings = [makeSetting({ id: 's-c', is_current: false })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    expect(r.setting?.id).toBe('s-c');
    expect(r.reason).toBe('setting_not_current');
    expect(r.blockers).toContain('setting_not_current');
  });

  it('use_registry_for_payroll=false → blocker use_registry_for_payroll_false', () => {
    const settings = [makeSetting({ id: 's-c', use_registry_for_payroll: false })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    expect(r.setting?.id).toBe('s-c');
    expect(r.reason).toBe('use_registry_for_payroll_false');
    expect(r.blockers).toContain('use_registry_for_payroll_false');
  });

  it('rollback_run_id present → setting_inactive', () => {
    const settings = [makeSetting({ id: 's-c', rollback_run_id: 'rb-1' })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    expect(r.setting?.id).toBe('s-c');
    expect(r.reason).toBe('setting_inactive');
    expect(r.blockers).toContain('setting_inactive');
  });

  it('matched result has empty blockers', () => {
    const settings = [makeSetting({ id: 's-c' })];
    const r = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    expect(r.reason).toBe('matched');
    expect(r.blockers).toEqual([]);
  });
});

describe('B10E.1 — registryRuntimeSettingResolver — determinism', () => {
  it('duplicate scope settings → deterministic pick by id ascending', () => {
    const settings = [
      makeSetting({ id: 's-zzz' }),
      makeSetting({ id: 's-aaa' }),
      makeSetting({ id: 's-mmm' }),
    ];
    const r1 = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    const r2 = resolveRegistryRuntimeSetting({ companyId: COMPANY, settings: [...settings].reverse() });
    expect(r1.setting?.id).toBe('s-aaa');
    expect(r2.setting?.id).toBe('s-aaa');
  });

  it('does not mutate input settings array', () => {
    const settings = [
      makeSetting({ id: 's-zzz' }),
      makeSetting({ id: 's-aaa' }),
    ];
    const snapshotIds = settings.map((s) => s.id);
    resolveRegistryRuntimeSetting({ companyId: COMPANY, settings });
    expect(settings.map((s) => s.id)).toEqual(snapshotIds);
  });
});

// ===================== Static isolation tests =====================

describe('B10E.1 — registryRuntimeSettingResolver — static isolation', () => {
  const rawFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/engines/erp/hr/registryRuntimeSettingResolver.ts'),
    'utf8',
  );
  // Strip block and line comments so the static checks examine real code only.
  const file = rawFile
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('does not import or reference supabase', () => {
    expect(file.toLowerCase()).not.toContain('supabase');
  });

  it('does not call fetch(', () => {
    expect(file).not.toMatch(/\bfetch\s*\(/);
  });

  it('does not import react or hooks', () => {
    expect(file).not.toMatch(/from\s+['"]react['"]/);
    expect(file).not.toMatch(/\buse[A-Z]\w+\s*\(/);
  });

  it('does not perform DB-style chained calls', () => {
    expect(file).not.toMatch(/\.from\s*\(/);
    expect(file).not.toMatch(/\.insert\s*\(/);
    expect(file).not.toMatch(/\.update\s*\(/);
    expect(file).not.toMatch(/\.delete\s*\(/);
    expect(file).not.toMatch(/\.upsert\s*\(/);
  });

  it('does not import bridge / payroll / flag / resolver / normalizer / safety gate', () => {
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
    ];
    for (const name of forbidden) {
      expect(file).not.toContain(`from '@/engines/erp/hr/${name}'`);
      expect(file).not.toContain(`from "@/engines/erp/hr/${name}"`);
      expect(file).not.toContain(`from '@/hooks/erp/hr/${name}'`);
      expect(file).not.toContain(`from "@/hooks/erp/hr/${name}"`);
    }
  });

  it('does not reference operative table erp_hr_collective_agreements (without _registry suffix)', () => {
    // Allow erp_hr_collective_agreements_registry_* identifiers; forbid bare table.
    const matches = file.match(/erp_hr_collective_agreements(?!_registry)/g);
    expect(matches).toBeNull();
  });

  it('does not import Deno or backend client', () => {
    expect(file).not.toMatch(/\bDeno\b/);
    expect(file).not.toContain('service_role');
  });
});
