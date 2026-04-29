/**
 * B8B — Edge proposal static contract tests.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'supabase/functions/erp-hr-collective-agreement-activation-proposal/index.ts';
const CONFIG = 'supabase/config.toml';

let SRC = '';
let CFG = '';
beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), EDGE), 'utf-8');
  CFG = fs.readFileSync(path.resolve(process.cwd(), CONFIG), 'utf-8');
});

describe('B8B — edge proposal static checks', () => {
  it('config declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-collective-agreement-activation-proposal\]\s*\nverify_jwt\s*=\s*true/,
    );
  });
  it('uses Deno.env for service role', () => {
    expect(SRC).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  });
  it('does not reference operational table erp_hr_collective_agreements (without _registry)', () => {
    expect(SRC.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });
  it('does not import payroll/payslip/salaryNormalizer/agreementSalaryResolver', () => {
    expect(SRC).not.toMatch(/payslipEngine/);
    expect(SRC).not.toMatch(/payrollEngine/);
    expect(SRC).not.toMatch(/salaryNormalizer/);
    expect(SRC).not.toMatch(/agreementSalaryResolver/);
    expect(SRC).not.toMatch(/useESPayrollBridge/);
  });
  it('never sets ready_for_payroll = true', () => {
    expect(SRC).not.toMatch(/ready_for_payroll\s*:\s*true/);
    expect(SRC).not.toMatch(/ready_for_payroll\s*=\s*true/);
  });
  it('uses strict zod schemas', () => {
    const occurrences = SRC.match(/\.strict\(\)/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(5);
  });
  it('has sanitized error mapping (no raw error.message returned)', () => {
    expect(SRC).toMatch(/INTERNAL_ERROR/);
    // mapError returns canonical codes only
    expect(SRC).toMatch(/function mapError/);
  });
  it('declares forbidden payload keys including ready_for_payroll', () => {
    expect(SRC).toMatch(/FORBIDDEN_PAYLOAD_KEYS/);
    expect(SRC).toMatch(/'ready_for_payroll'/);
    expect(SRC).toMatch(/'data_completeness'/);
  });
});