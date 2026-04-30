/**
 * B13.3A — Static guards on the Extraction Runner edge function.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-extraction-runner/index.ts'),
  'utf8',
);
const CFG = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

describe('B13.3A — Extraction Runner edge static guards', () => {
  it('1. config.toml declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-agreement-extraction-runner\][\s\S]*?verify_jwt\s*=\s*true/,
    );
  });
  it('2. edge uses Zod strict schemas', () => {
    expect(EDGE).toMatch(/from 'https:\/\/esm\.sh\/zod/);
    const schemas = EDGE.match(/z\s*\.\s*object\(\{[\s\S]*?\}\)\s*\.\s*strict\(\)/g) ?? [];
    expect(schemas.length).toBeGreaterThanOrEqual(7);
  });
  it('3. edge defines FORBIDDEN_PAYLOAD_KEYS with required keys', () => {
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
      'apply_to_payroll',
      'human_validated',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });
  it('4. edge has mapError sanitized envelope', () => {
    expect(EDGE).toMatch(/function mapError/);
  });
  it('5. edge does not return stack traces', () => {
    expect(EDGE).not.toMatch(/error\.stack/);
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
      expect(EDGE).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });
  it('14. run_text_extraction does not call OCR', () => {
    const idx = EDGE.indexOf("action === 'run_text_extraction'");
    expect(idx).toBeGreaterThan(0);
    const after = EDGE.slice(idx + 30);
    const nextIdx = after.indexOf("action === '");
    const branch = nextIdx > 0 ? EDGE.slice(idx, idx + 30 + nextIdx) : EDGE.slice(idx, idx + 6000);
    // No OCR runner call/import
    expect(branch).not.toMatch(/\brunOcr\b|\bextractTablesOcr\b|\binvoke\(['"][^'"]*ocr[^'"]*['"]/i);
  });
  it('15. accept_finding_to_staging is deferred (returns deferred sentinel) and writes no staging', () => {
    const idx = EDGE.indexOf("action === 'accept_finding_to_staging'");
    expect(idx).toBeGreaterThan(0);
    const branch = EDGE.slice(idx, idx + 2000);
    expect(branch).toMatch(/ACCEPT_TO_STAGING_DEFERRED_TO_B13_3B/);
    expect(branch).not.toMatch(/staging/i.toString().includes ? /agreement-staging/ : /xxx/);
    expect(branch).not.toMatch(/\.from\(\s*['"][^'"]*staging[^'"]*['"]/);
  });
  it('16. reject_finding does not delete', () => {
    const idx = EDGE.indexOf("action === 'reject_finding'");
    const branch = EDGE.slice(idx, idx + 3000);
    expect(branch).not.toMatch(/\.delete\(/);
    expect(branch).toMatch(/finding_status:\s*['"]rejected['"]/);
  });
  it('17. edge never deletes runs/findings', () => {
    expect(EDGE).not.toMatch(/\.delete\(/);
  });
  it('only operates on the runs + findings + intake + user_roles tables', () => {
    expect(EDGE).toContain("T_RUNS = 'erp_hr_collective_agreement_extraction_runs'");
    expect(EDGE).toContain("T_FINDINGS = 'erp_hr_collective_agreement_extraction_findings'");
    expect(EDGE).toContain("T_INTAKE = 'erp_hr_collective_agreement_document_intake'");
    const tables = EDGE.match(/\.from\(\s*['"]([^'"]+)['"]/g) ?? [];
    const names = tables.map((t) => t.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
    const allowed = new Set([
      'erp_hr_collective_agreement_extraction_runs',
      'erp_hr_collective_agreement_extraction_findings',
      'erp_hr_collective_agreement_document_intake',
      'user_roles',
    ]);
    for (const n of names) expect(allowed.has(n)).toBe(true);
  });
});