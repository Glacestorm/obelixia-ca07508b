/**
 * B13.5A — Static safety guards for the pure impact engine.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const FILE = path.resolve(
  __dirname,
  '../../engines/erp/hr/agreementImpactEngine.ts',
);
const raw = fs.readFileSync(FILE, 'utf8');
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const FORBIDDEN_IMPORTS = [
  'useESPayrollBridge',
  'payrollEngine',
  'payslipEngine',
  'salaryNormalizer',
  'agreementSalaryResolver',
  'agreementSafetyGate',
  '@supabase',
  'supabase/client',
  'react',
  'Deno',
];

describe('B13.5A — engine static guards', () => {
  it('file exists', () => {
    expect(fs.existsSync(FILE)).toBe(true);
  });

  for (const token of FORBIDDEN_IMPORTS) {
    it(`does not import ${token}`, () => {
      expect(src).not.toContain(token);
    });
  }

  it('contains no fetch / supabase / hooks / service_role', () => {
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/service_role/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/useState|useEffect|useCallback|useMemo/);
  });

  it('contains no DB writes', () => {
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/functions\.invoke/);
  });

  it('does not write critical flags', () => {
    expect(src).not.toMatch(/ready_for_payroll\s*=/);
    expect(src).not.toMatch(/salary_tables_loaded\s*=\s*true/);
    expect(src).not.toMatch(/data_completeness\s*=\s*['"]human_validated['"]/);
  });

  it('does not touch legacy operative table erp_hr_collective_agreements (non-registry)', () => {
    expect(src).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('flags remain false and allow-list empty', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});
