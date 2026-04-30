/**
 * B13.2 — Static guards on the Document Intake edge function.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-document-intake/index.ts'),
  'utf8',
);
const CFG = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

describe('B13.2 — Document Intake edge static guards', () => {
  it('1. config.toml declares verify_jwt = true for the function', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-agreement-document-intake\][\s\S]*?verify_jwt\s*=\s*true/,
    );
  });

  it('2. edge uses Zod strict schemas', () => {
    expect(EDGE).toMatch(/from 'https:\/\/esm\.sh\/zod/);
    // Every schema must end with `.strict()`
    const schemas = EDGE.match(/z\s*\.\s*object\(\{[\s\S]*?\}\)\s*\.\s*strict\(\)/g) ?? [];
    expect(schemas.length).toBeGreaterThanOrEqual(7);
  });

  it('3. edge defines FORBIDDEN_PAYLOAD_KEYS with all required keys', () => {
    expect(EDGE).toContain('FORBIDDEN_PAYLOAD_KEYS');
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'data_completeness',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
      'use_registry_for_payroll',
      'activation_run_id',
      'runtime_setting',
      'payroll',
      'payslip',
      'service_role',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });

  it('4. edge has a mapError sanitized envelope', () => {
    expect(EDGE).toMatch(/function mapError/);
  });

  it('5. edge does not return raw stack traces or error.message', () => {
    expect(EDGE).not.toMatch(/error\.stack/);
    expect(EDGE).not.toMatch(/\.stack\b/);
    // Catch blocks return mapError without exposing raw message
    expect(EDGE).not.toMatch(/return mapError\([^)]*\.message/);
  });

  it('6. edge does not write ready_for_payroll', () => {
    expect(EDGE).not.toMatch(/ready_for_payroll\s*:/);
  });

  it('7. edge does not write salary_tables_loaded=true', () => {
    expect(EDGE).not.toMatch(/salary_tables_loaded\s*:\s*true/);
  });

  it("8. edge does not write data_completeness='human_validated'", () => {
    expect(EDGE).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
  });

  it('9-13. edge does not import payroll engines / bridge / normalizer / resolver', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(EDGE).not.toContain(f);
    }
  });

  it('14. promote_to_extraction does not execute OCR', () => {
    // Find the promote_to_extraction branch and check it has no OCR references.
    const idx = EDGE.indexOf("action === 'promote_to_extraction'");
    expect(idx).toBeGreaterThan(0);
    const branch = EDGE.slice(idx, idx + 4000);
    expect(branch).not.toMatch(/ocr/i);
    expect(branch).not.toMatch(/extract/i);
  });

  it('15. promote_to_extraction does not write staging', () => {
    const idx = EDGE.indexOf("action === 'promote_to_extraction'");
    const branch = EDGE.slice(idx, idx + 4000);
    expect(branch).not.toMatch(/staging/i);
    expect(branch).not.toMatch(/salary_tables/);
  });

  it('16. dismiss does not delete', () => {
    const idx = EDGE.indexOf("action === 'dismiss'");
    const branch = EDGE.slice(idx, idx + 2000);
    expect(branch).not.toMatch(/\.delete\(/);
    expect(branch).toMatch(/status:\s*['"]dismissed['"]/);
  });

  it('17. edge never calls .delete on the intake table', () => {
    expect(EDGE).not.toMatch(/\.delete\(/);
  });

  it('only operates on the intake + watch + user_roles tables', () => {
    const tables = EDGE.match(/\.from\(\s*['"]([^'"]+)['"]/g) ?? [];
    const names = tables.map((t) => t.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
    const allowed = new Set([
      'erp_hr_collective_agreement_document_intake',
      'erp_hr_collective_agreement_source_watch_queue',
      'user_roles',
    ]);
    // All referenced via constants T_INTAKE / T_WATCH; check via constants too.
    expect(EDGE).toContain("T_INTAKE = 'erp_hr_collective_agreement_document_intake'");
    expect(EDGE).toContain("T_WATCH = 'erp_hr_collective_agreement_source_watch_queue'");
    for (const n of names) expect(allowed.has(n)).toBe(true);
  });
});