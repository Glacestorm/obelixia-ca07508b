/**
 * B13.3B.1 — Static guards for accept_finding_to_staging branch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-extraction-runner/index.ts'),
  'utf8',
);
const CFG = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

function acceptBranch(): string {
  const idx = EDGE.indexOf("action === 'accept_finding_to_staging'");
  expect(idx).toBeGreaterThan(0);
  const after = EDGE.slice(idx + 30);
  const next = after.indexOf("action === '");
  return next > 0 ? EDGE.slice(idx, idx + 30 + next) : EDGE.slice(idx);
}

describe('B13.3B.1 — accept_finding_to_staging static guards', () => {
  it('1. no longer returns deferred sentinel', () => {
    expect(acceptBranch()).not.toMatch(/ACCEPT_TO_STAGING_DEFERRED_TO_B13_3B/);
  });
  it('2. inserts only into salary_table_staging (not real salary_tables)', () => {
    const b = acceptBranch();
    expect(b).toMatch(/T_STAGING\b/);
    expect(b).not.toMatch(/['"]salary_tables['"]/);
  });
  it('3. inserts audit with action=create', () => {
    const b = acceptBranch();
    expect(b).toMatch(/T_STAGING_AUDIT/);
    expect(b).toMatch(/action:\s*['"]create['"]/);
  });
  it('4. updates finding_status to accepted_to_staging', () => {
    expect(acceptBranch()).toMatch(/finding_status:\s*['"]accepted_to_staging['"]/);
  });
  it('5. does not write ready_for_payroll', () => {
    expect(acceptBranch()).not.toMatch(/ready_for_payroll\s*:/);
  });
  it('6. does not write salary_tables_loaded=true', () => {
    expect(acceptBranch()).not.toMatch(/salary_tables_loaded\s*:\s*true/);
  });
  it("7. does not write data_completeness='human_validated'", () => {
    expect(acceptBranch()).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
  });
  it('8. does not touch operative legacy table erp_hr_collective_agreements', () => {
    const b = acceptBranch();
    // Allow registry/version tables, but not the legacy operative one.
    expect(b).not.toMatch(/['"]erp_hr_collective_agreements['"]/);
  });
  it('9-13. edge does not import payroll/payslip/bridge/normalizer/resolver', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });
  it('14. no DELETE on findings/staging/audit', () => {
    expect(acceptBranch()).not.toMatch(/\.delete\(/);
  });
  it('15. verify_jwt=true still set in config', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-agreement-extraction-runner\][\s\S]*?verify_jwt\s*=\s*true/,
    );
  });
  it('16. validation gate references both error codes (file-wide)', () => {
    expect(EDGE).toMatch(/FINDING_NOT_STAGING_READY/);
    expect(EDGE).toMatch(/APPROVAL_BLOCKED/);
    // Branch returns mapped error using validation.code/.reason
    expect(acceptBranch()).toMatch(/validation\.code/);
  });
  it('17. requires_human_review=true is enforced in mapper', () => {
    expect(EDGE).toMatch(/requires_human_review:\s*true/);
  });
});
