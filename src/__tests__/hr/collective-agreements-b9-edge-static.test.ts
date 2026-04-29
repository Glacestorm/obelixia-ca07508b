/**
 * B9 — Static contract tests for the activation-execute edge function.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE =
  'supabase/functions/erp-hr-collective-agreement-activation-execute/index.ts';
const CONFIG = 'supabase/config.toml';

let SRC = '';
let CFG = '';
beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), EDGE), 'utf-8');
  CFG = fs.readFileSync(path.resolve(process.cwd(), CONFIG), 'utf-8');
});

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('B9 — edge activation-execute static checks', () => {
  it('config declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-collective-agreement-activation-execute\]\s*\nverify_jwt\s*=\s*true/,
    );
  });

  it('does not reference operational table erp_hr_collective_agreements (without _registry/_)', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });

  it('does not import or mention payroll/payslip/salaryNormalizer/agreementSalaryResolver/useESPayrollBridge', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/payslipEngine/);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/useESPayrollBridge/);
  });

  it('declares strict zod schemas for activate and rollback', () => {
    expect(SRC).toMatch(/ActivateSchema[\s\S]*?\.strict\(\)/);
    expect(SRC).toMatch(/RollbackSchema[\s\S]*?\.strict\(\)/);
    expect(SRC).toMatch(/z\.literal\(['"]activate['"]\)/);
    expect(SRC).toMatch(/z\.literal\(['"]rollback['"]\)/);
  });

  it('declares FORBIDDEN_PAYLOAD_KEYS with the required minimum keys', () => {
    expect(SRC).toMatch(/FORBIDDEN_PAYLOAD_KEYS/);
    const required = [
      'ready_for_payroll',
      'data_completeness',
      'requires_human_review',
      'salary_tables_loaded',
      'official_submission_blocked',
      'activated_by',
      'activated_for_payroll_at',
      'activation_request_id',
    ];
    for (const k of required) {
      expect(
        SRC.includes(`'${k}'`) || SRC.includes(`"${k}"`),
        `FORBIDDEN_PAYLOAD_KEYS must include ${k}`,
      ).toBe(true);
    }
  });

  it('exposes a mapError function for sanitized error mapping', () => {
    expect(SRC).toMatch(/function mapError/);
    expect(SRC).toMatch(/INTERNAL_ERROR/);
  });

  it('does not return raw error.message or stack traces', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/error\.message/);
    expect(code).not.toMatch(/\.stack/);
  });

  it('reads service-role only via Deno.env (no hardcoded key)', () => {
    expect(SRC).toMatch(/Deno\.env\.get\(['"]SUPABASE_SERVICE_ROLE_KEY['"]\)/);
    const code = stripComments(SRC);
    expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('never sets ready_for_payroll = true outside the controlled patch object', () => {
    const occurrences = SRC.match(/ready_for_payroll\s*:\s*true/g) ?? [];
    expect(occurrences.length).toBeLessThanOrEqual(1);
  });
});
