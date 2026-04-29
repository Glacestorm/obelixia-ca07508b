import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
  REGISTRY_PILOT_ALLOWLIST_MAX,
  isPilotEnabledForScope,
  validateRegistryPilotAllowlist,
  type RegistryPilotScope,
} from '@/engines/erp/hr/registryPilotGate';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';

const SOURCE = readFileSync(
  resolve(__dirname, '../../engines/erp/hr/registryPilotGate.ts'),
  'utf8',
);

// Strip comments before scanning so the JSDoc header (which intentionally
// names forbidden APIs/imports to forbid them) does not trip the guards.
const CODE = SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function scope(overrides: Partial<RegistryPilotScope> = {}): RegistryPilotScope {
  return {
    company_id: 'co-1',
    employee_id: 'emp-1',
    contract_id: 'ct-1',
    target_year: 2026,
    pilot_started_at: '2026-01-01T00:00:00Z',
    owner: 'pilot-owner',
    rollback_contact: 'pilot-rollback',
    ...overrides,
  };
}

describe('B10F.1 — registry pilot gate (constants)', () => {
  it('HR_REGISTRY_PILOT_MODE is hardcoded false', () => {
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
  });

  it('REGISTRY_PILOT_SCOPE_ALLOWLIST is empty by default', () => {
    expect(Array.isArray(REGISTRY_PILOT_SCOPE_ALLOWLIST)).toBe(true);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });

  it('REGISTRY_PILOT_ALLOWLIST_MAX is 3', () => {
    expect(REGISTRY_PILOT_ALLOWLIST_MAX).toBe(3);
  });

  it('global registry flag remains false (B10E invariant)', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
  });
});

describe('B10F.1 — isPilotEnabledForScope (decision rules)', () => {
  it('pilot disabled by default → enabled=false, reason pilot_disabled', () => {
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('pilot_disabled');
    expect(r.blockers).toContain('pilot_disabled');
  });

  it('global true + pilot true → global_flag_conflict', () => {
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      globalRegistryFlag: true,
      pilotMode: true,
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('global_flag_conflict');
    expect(r.blockers).toContain('pilot_conflict_global_on');
  });

  it('pilot true + empty allowlist → scope_not_allowed', () => {
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      pilotMode: true,
      allowlist: [],
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('scope_not_allowed');
    expect(r.blockers).toContain('scope_not_in_allowlist');
  });

  it('exact match company+employee+contract+year → enabled=true', () => {
    const list = [scope()];
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      pilotMode: true,
      allowlist: list,
    });
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe('scope_allowed');
    expect(r.blockers).toEqual([]);
    expect(r.scope?.company_id).toBe('co-1');
  });

  it.each([
    ['company differs', { companyId: 'co-X' }],
    ['employee differs', { employeeId: 'emp-X' }],
    ['contract differs', { contractId: 'ct-X' }],
    ['year differs', { targetYear: 2027 }],
  ])('no match when %s', (_label, override) => {
    const list = [scope()];
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      pilotMode: true,
      allowlist: list,
      ...override,
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('scope_not_allowed');
  });

  it.each([
    ['employeeId missing', { employeeId: undefined }],
    ['employeeId null', { employeeId: null }],
    ['contractId missing', { contractId: undefined }],
    ['contractId null', { contractId: null }],
    ['companyId empty', { companyId: '' }],
  ])('invalid_scope when %s', (_label, override) => {
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      pilotMode: true,
      allowlist: [scope()],
      ...(override as any),
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('invalid_scope');
    expect(r.blockers).toContain('pilot_requires_company_employee_contract');
  });

  it('deterministic output for same input', () => {
    const list = [scope()];
    const a = isPilotEnabledForScope({
      companyId: 'co-1', employeeId: 'emp-1', contractId: 'ct-1',
      targetYear: 2026, pilotMode: true, allowlist: list,
    });
    const b = isPilotEnabledForScope({
      companyId: 'co-1', employeeId: 'emp-1', contractId: 'ct-1',
      targetYear: 2026, pilotMode: true, allowlist: list,
    });
    expect(a).toEqual(b);
  });
});

describe('B10F.1 — validateRegistryPilotAllowlist', () => {
  it('empty allowlist is valid', () => {
    expect(validateRegistryPilotAllowlist([])).toEqual({ valid: true, blockers: [] });
  });

  it('single valid entry is valid', () => {
    expect(validateRegistryPilotAllowlist([scope()]).valid).toBe(true);
  });

  it('blocks more than 3 entries', () => {
    const list = [
      scope({ contract_id: 'a' }),
      scope({ contract_id: 'b' }),
      scope({ contract_id: 'c' }),
      scope({ contract_id: 'd' }),
    ];
    const r = validateRegistryPilotAllowlist(list);
    expect(r.valid).toBe(false);
    expect(r.blockers).toContain('allowlist_exceeds_max_entries');
  });

  it('blocks wildcard * in ids', () => {
    const r = validateRegistryPilotAllowlist([scope({ company_id: '*' })]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('invalid_company_id'))).toBe(true);
  });

  it('blocks null/undefined in ids', () => {
    const r = validateRegistryPilotAllowlist([
      scope({ employee_id: null as any }),
      scope({ contract_id: undefined as any, company_id: 'co-2' }),
    ]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('invalid_employee_id'))).toBe(true);
    expect(r.blockers.some((b) => b.includes('invalid_contract_id'))).toBe(true);
  });

  it('blocks empty owner', () => {
    const r = validateRegistryPilotAllowlist([scope({ owner: '' })]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('invalid_owner'))).toBe(true);
  });

  it('blocks empty rollback_contact', () => {
    const r = validateRegistryPilotAllowlist([scope({ rollback_contact: '' })]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('invalid_rollback_contact'))).toBe(true);
  });

  it('blocks invalid target_year', () => {
    const r = validateRegistryPilotAllowlist([scope({ target_year: 0 })]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('invalid_target_year'))).toBe(true);
  });

  it('blocks duplicate scopes', () => {
    const r = validateRegistryPilotAllowlist([scope(), scope()]);
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.includes('duplicate_scope'))).toBe(true);
  });

  it('isPilotEnabledForScope returns invalid_allowlist when allowlist invalid', () => {
    const r = isPilotEnabledForScope({
      companyId: 'co-1',
      employeeId: 'emp-1',
      contractId: 'ct-1',
      targetYear: 2026,
      pilotMode: true,
      allowlist: [scope({ company_id: '*' })],
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('invalid_allowlist');
  });
});

describe('B10F.1 — static source guards', () => {
  it('does not read process.env / import.meta.env', () => {
    expect(CODE).not.toMatch(/process\.env/);
    expect(CODE).not.toMatch(/import\.meta\.env/);
  });

  it('does not use localStorage/sessionStorage', () => {
    expect(CODE).not.toMatch(/localStorage/);
    expect(CODE).not.toMatch(/sessionStorage/);
  });

  it('does not import Supabase', () => {
    expect(CODE).not.toMatch(/@\/integrations\/supabase/);
    expect(CODE).not.toMatch(/createClient/);
  });

  it('does not use fetch', () => {
    expect(CODE).not.toMatch(/\bfetch\(/);
  });

  it('does not import React/hooks', () => {
    expect(CODE).not.toMatch(/from ['"]react['"]/);
    expect(CODE).not.toMatch(/useState|useEffect|useCallback/);
  });

  it('does not contain DB write APIs', () => {
    expect(CODE).not.toMatch(/\.from\(/);
    expect(CODE).not.toMatch(/\.insert\(/);
    expect(CODE).not.toMatch(/\.update\(/);
    expect(CODE).not.toMatch(/\.delete\(/);
    expect(CODE).not.toMatch(/\.upsert\(/);
  });

  it('does not import bridge/payroll/resolver/normalizer', () => {
    expect(CODE).not.toMatch(/useESPayrollBridge/);
    expect(CODE).not.toMatch(/registryShadowFlag/);
    expect(CODE).not.toMatch(/agreementSalaryResolver/);
    expect(CODE).not.toMatch(/salaryNormalizer/);
    expect(CODE).not.toMatch(/payrollEngine/);
    expect(CODE).not.toMatch(/payslipEngine/);
    expect(CODE).not.toMatch(/agreementSafetyGate/);
  });

  it('does not reference operative agreements table (without _registry)', () => {
    expect(CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('does not assign ready_for_payroll', () => {
    expect(CODE).not.toMatch(/ready_for_payroll\s*=/);
  });
});