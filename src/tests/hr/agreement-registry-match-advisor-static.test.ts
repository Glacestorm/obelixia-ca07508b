/**
 * B12.3B — Static safety invariants for the Registry match advisor.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const TARGETS = [
  'src/lib/hr/agreementRegistryMatchAdvisor.ts',
  'src/components/erp/hr/collective-agreements/hub/AgreementRegistryMatchSuggestions.tsx',
  'src/hooks/erp/hr/useAgreementRegistryMatchAdvisor.ts',
];

const FORBIDDEN_IMPORTS = [
  'useESPayrollBridge',
  'payrollEngine',
  'payslipEngine',
  'salaryNormalizer',
  'agreementSalaryResolver',
  'agreementSafetyGate',
];

const FORBIDDEN_TOKENS = [
  '.insert(',
  '.update(',
  '.delete(',
  '.upsert(',
  'supabase.functions.invoke',
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const FORBIDDEN_CTA = [
  /vincular autom[aá]ticamente/i,
  /usar en n[oó]mina/i,
  /activar para n[oó]mina/i,
  /aplicar mapping/i,
];

describe('B12.3B — match advisor static safety', () => {
  for (const file of TARGETS) {
    it(`${file} has no forbidden imports`, () => {
      const src = read(file);
      for (const imp of FORBIDDEN_IMPORTS) expect(src).not.toContain(imp);
    });
    it(`${file} has no forbidden tokens`, () => {
      const src = read(file);
      for (const t of FORBIDDEN_TOKENS) expect(src).not.toContain(t);
    });
    it(`${file} has no forbidden CTAs`, () => {
      const src = read(file);
      for (const re of FORBIDDEN_CTA) expect(src).not.toMatch(re);
    });
  }

  it('flags remain false and allow-list empty', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});
