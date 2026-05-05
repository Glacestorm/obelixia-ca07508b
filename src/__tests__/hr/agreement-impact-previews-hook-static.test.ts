/**
 * B13.5B — Static safety contract for the impact previews hook.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const HOOK = 'src/hooks/erp/hr/useAgreementImpactPreviews.ts';
let SRC = '';
beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), HOOK), 'utf-8');
});

describe('B13.5B — hook static contract', () => {
  it('uses authSafeInvoke (functions.invoke wrapper)', () => {
    expect(SRC).toMatch(/authSafeInvoke/);
  });
  it('does not perform direct .from(...).insert/update/delete/upsert', () => {
    expect(SRC).not.toMatch(/\.from\(['"][^'"]+['"]\)\s*\.insert\(/);
    expect(SRC).not.toMatch(/\.from\(['"][^'"]+['"]\)\s*\.update\(/);
    expect(SRC).not.toMatch(/\.from\(['"][^'"]+['"]\)\s*\.delete\(/);
    expect(SRC).not.toMatch(/\.from\(['"][^'"]+['"]\)\s*\.upsert\(/);
  });
  it('does not reference service_role / SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(SRC).not.toMatch(/service_role/);
    expect(SRC).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
  it('handles authRequired explicitly', () => {
    expect(SRC).toMatch(/authRequired/);
    expect(SRC).toMatch(/isAuthRequiredResult/);
  });
  it('does not import payroll/bridge/resolver/normalizer/safety-gate', () => {
    expect(SRC).not.toMatch(/payrollEngine/);
    expect(SRC).not.toMatch(/payslipEngine/);
    expect(SRC).not.toMatch(/useESPayrollBridge/);
    expect(SRC).not.toMatch(/agreementSalaryResolver/);
    expect(SRC).not.toMatch(/salaryNormalizer/);
    expect(SRC).not.toMatch(/agreementSafetyGate/);
  });
  it('flags remain false and allow-list empty', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});
