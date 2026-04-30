/**
 * B11.2C.2 — Static guards on the hooks
 *  - useTicNacSalaryTableStaging (read)
 *  - useTicNacSalaryTableStagingActions (write)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const READ_HOOK = resolve(
  process.cwd(),
  'src/hooks/erp/hr/useTicNacSalaryTableStaging.ts',
);
const ACTIONS_HOOK = resolve(
  process.cwd(),
  'src/hooks/erp/hr/useTicNacSalaryTableStagingActions.ts',
);

const read = readFileSync(READ_HOOK, 'utf8');
const actions = readFileSync(ACTIONS_HOOK, 'utf8');
const both = read + '\n' + actions;

describe('B11.2C.2 — hooks static guards', () => {
  it('hooks do not reference service_role', () => {
    expect(both).not.toMatch(/service_role/);
    expect(both).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('hooks never call .from(...).insert/update/delete/upsert', () => {
    expect(both).not.toMatch(/\.from\(.+?\)[\s\S]{0,40}\.insert\(/);
    expect(both).not.toMatch(/\.from\(.+?\)[\s\S]{0,40}\.update\(/);
    expect(both).not.toMatch(/\.from\(.+?\)[\s\S]{0,40}\.delete\(/);
    expect(both).not.toMatch(/\.from\(.+?\)[\s\S]{0,40}\.upsert\(/);
    // even without args
    expect(both).not.toMatch(/\.insert\(/);
    expect(both).not.toMatch(/\.upsert\(/);
    expect(both).not.toMatch(/\.delete\(/);
  });

  it('hooks call only the staging edge function via authSafeInvoke', () => {
    expect(read).toMatch(/authSafeInvoke/);
    expect(actions).toMatch(/authSafeInvoke/);
    expect(both).toMatch(/erp-hr-agreement-staging/);
  });

  it('hooks handle AUTH_REQUIRED without throwing', () => {
    expect(read).toMatch(/authRequired/);
    expect(read).toMatch(/isAuthRequiredResult/);
    expect(actions).toMatch(/auth_required/);
  });

  it('hooks do not import payroll/bridge/payslip/normalizer/resolver', () => {
    for (const f of [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(both).not.toContain(f);
    }
  });

  it('hooks do not flip pilot flags or allow-list', () => {
    expect(both).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/);
    expect(both).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=/);
    expect(both).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
  });

  it('actions hook never bypasses client-side reason length check', () => {
    // rejectRow / markNeedsCorrection must enforce min 5 chars before invoke
    expect(actions).toMatch(/r\.length\s*<\s*5/);
    expect(actions).toMatch(/client_validation/);
  });

  it('hooks never set forbidden flags in payloads', () => {
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded:',
      "data_completeness:",
      'requires_human_review:',
    ]) {
      expect(both).not.toContain(k);
    }
  });
});