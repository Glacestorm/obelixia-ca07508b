/**
 * B9 — Schema/migration contract test.
 *
 * Inspects the B9 migration file as text to enforce hard safety
 * invariants without executing SQL.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIG_FILE =
  'supabase/migrations/20260429090950_785a97f8-c270-4de7-b293-a4df93190d26.sql';

let SQL = '';
beforeAll(() => {
  SQL = fs.readFileSync(path.resolve(process.cwd(), MIG_FILE), 'utf-8');
});

function stripSqlComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');
}

describe('B9 — registry activation columns migration', () => {
  it('migration file exists and is non-empty', () => {
    expect(SQL.length).toBeGreaterThan(50);
  });

  it('adds the three traceability columns', () => {
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS\s+activated_for_payroll_at\s+timestamptz/i);
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS\s+activated_by\s+uuid/i);
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS\s+activation_request_id\s+uuid/i);
  });

  it('activated_by references auth.users(id)', () => {
    expect(SQL).toMatch(/activated_by[\s\S]*?REFERENCES\s+auth\.users\(id\)/i);
  });

  it('activation_request_id references the activation_requests table', () => {
    expect(SQL).toMatch(
      /activation_request_id[\s\S]*?REFERENCES\s+public\.erp_hr_collective_agreement_registry_activation_requests\(id\)/i,
    );
  });

  it('does not add INSERT/UPDATE policies on the registry', () => {
    const code = stripSqlComments(SQL);
    expect(code).not.toMatch(/CREATE\s+POLICY[\s\S]*?FOR\s+(INSERT|UPDATE)/i);
    expect(code).not.toMatch(/ALTER\s+POLICY/i);
  });

  it('does not touch or redefine enforce_ca_registry_ready_for_payroll', () => {
    const code = stripSqlComments(SQL);
    expect(code).not.toMatch(/enforce_ca_registry_ready_for_payroll/);
    expect(code).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?TRIGGER/i);
    expect(code).not.toMatch(/DROP\s+TRIGGER/i);
    expect(code).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
  });

  it('does not reference the operational table erp_hr_collective_agreements (without _registry/_)', () => {
    const code = stripSqlComments(SQL);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });

  it('does not reference payroll/payslip/salaryNormalizer/agreementSalaryResolver/useESPayrollBridge', () => {
    // Strip the legitimate column/index names that contain the substring
    // "payroll" before scanning for forbidden engine references.
    const code = stripSqlComments(SQL)
      .toLowerCase()
      .replace(/activated_for_payroll_at/g, '')
      .replace(/ready_for_payroll/g, '');
    expect(code).not.toMatch(/payroll/);
    expect(code).not.toMatch(/payslip/);
    expect(code).not.toMatch(/salarynormalizer/);
    expect(code).not.toMatch(/agreementsalaryresolver/);
    expect(code).not.toMatch(/useespayrollbridge/);
  });

  it('does not modify salary_tables, rules, sources, or versions tables', () => {
    const code = stripSqlComments(SQL);
    const forbidden = [
      'erp_hr_collective_agreements_registry_salary_tables',
      'erp_hr_collective_agreements_registry_rules',
      'erp_hr_collective_agreements_registry_sources',
      'erp_hr_collective_agreements_registry_versions',
    ];
    for (const t of forbidden) {
      // It's fine for the file to NOT mention them at all.
      const altered = new RegExp(`ALTER\\s+TABLE[^;]*${t}`, 'i').test(code);
      const dropped = new RegExp(`DROP\\s+TABLE[^;]*${t}`, 'i').test(code);
      expect(altered, `must not ALTER ${t}`).toBe(false);
      expect(dropped, `must not DROP ${t}`).toBe(false);
    }
  });

  it('only ALTERs the registry table', () => {
    const code = stripSqlComments(SQL);
    const alters = code.match(/ALTER\s+TABLE\s+([a-zA-Z_.]+)/gi) ?? [];
    for (const a of alters) {
      expect(a).toMatch(/erp_hr_collective_agreements_registry\b/);
    }
  });
});
