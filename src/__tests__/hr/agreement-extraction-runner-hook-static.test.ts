/**
 * B13.3A — Static guards on the Extraction Runner hook.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const HOOK = readFileSync(
  resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementExtractionRunner.ts'),
  'utf8',
);

describe('B13.3A — Extraction Runner hook static guards', () => {
  it('1. hook delegates to authSafeInvoke', () => {
    expect(HOOK).toMatch(/authSafeInvoke/);
    expect(HOOK).toMatch(/erp-hr-agreement-extraction-runner/);
    expect(HOOK).not.toMatch(/functions\.invoke\(['"]erp-hr-(?!agreement-extraction-runner)/);
  });
  it('2-4. hook never calls .from().insert/.update/.delete/.upsert', () => {
    expect(HOOK).not.toMatch(/\.insert\(/);
    expect(HOOK).not.toMatch(/\.update\(/);
    expect(HOOK).not.toMatch(/\.delete\(/);
    expect(HOOK).not.toMatch(/\.upsert\(/);
  });
  it('5-6. hook never references service_role / SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(HOOK).not.toMatch(/service_role/);
    expect(HOOK).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
  it('7. hook handles authRequired without throwing', () => {
    expect(HOOK).toMatch(/authRequired/);
    expect(HOOK).toMatch(/isAuthRequiredResult/);
  });
  it('8. hook does not import bridge / payroll / resolver / normalizer', () => {
    for (const f of [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(HOOK).not.toContain(f);
    }
  });
  it('9. registry payroll flag is still false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
  });
  it('10. pilot allow-list is still empty', () => {
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST).toEqual([]);
  });
});